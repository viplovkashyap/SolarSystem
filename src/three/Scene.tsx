import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Planets } from "./Bodies";
import { StarField, AsteroidBelt, Comets, Spacecrafts, EclipseLab } from "./Environment";
import { useStore } from "../store";
import { simClock, bodyRegistry, mapDist, QUALITY, clamp } from "../sim";
import { getTexture } from "../textures";
import { audioUnlockOnce } from "../audioBridge";

/* ------- imperative camera commands (HUD / keyboard → render loop) ------- */
export const cameraCmd = { overview: 0 };
export function requestOverview() {
  cameraCmd.overview++;
}

/* distinguish a real click from an orbit-drag so camera moves never deselect */
const pointerInfo = { x: 0, y: 0, down: false };
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => {
    pointerInfo.x = e.clientX;
    pointerInfo.y = e.clientY;
    pointerInfo.down = true;
  });
}

const CINE_WAYPOINTS = [
  "sun", "earth", "moon", "mars", "ceres", "jupiter", "saturn", "uranus", "neptune", "pluto", "halley", "voyager1",
];

const fpsAcc = { frames: 0, t: 0 };

/* ------------------------------- sim ticker ----------------------------- */

function SimTicker() {
  useFrame((_, delta) => {
    if (simClock.playing) simClock.t += delta * 1000 * simClock.speed;
  });
  return null;
}

/* ------------------------------ camera rig ------------------------------ */

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null!);
  const lastFocusReq = useRef(-1);
  const lastOverview = useRef(cameraCmd.overview);
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number } | null>(null);
  const prevTarget = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const cineIdx = useRef(0);
  const cineTime = useRef(0);

  const startFlyTo = (camTo: THREE.Vector3, dur = 1.6) => {
    const reduced = useStore.getState().settings.reducedMotion;
    anim.current = { from: controls.current.object.position.clone(), to: camTo, t: 0, dur: reduced ? 0.01 : dur };
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const st = useStore.getState();
    const ctl = controls.current;
    if (!ctl) return;

    // FPS meter (2 Hz)
    fpsAcc.frames++;
    fpsAcc.t += delta;
    if (fpsAcc.t >= 0.5) {
      st.setFps(Math.round(fpsAcc.frames / fpsAcc.t));
      fpsAcc.frames = 0;
      fpsAcc.t = 0;
    }

    // overview command
    if (cameraCmd.overview !== lastOverview.current) {
      lastOverview.current = cameraCmd.overview;
      const span = mapDist(36, st.scaleMode);
      startFlyTo(new THREE.Vector3(0, span * 0.62, span * 1.25), 1.8);
      ctl.target.set(0, 0, 0);
      prevTarget.current.set(0, 0, 0);
    }

    // ---------------- cinematic autopilot ----------------
    if (st.cinematic) {
      cineTime.current += dt;
      if (cineTime.current > 10.5) {
        cineTime.current = 0;
        cineIdx.current = (cineIdx.current + 1) % CINE_WAYPOINTS.length;
      }
      const reg = bodyRegistry.get(CINE_WAYPOINTS[cineIdx.current]);
      if (reg) {
        reg.obj.getWorldPosition(tmp.current);
        const r = Math.max(reg.radius * 5.5, 6);
        const t = state.clock.elapsedTime * 0.1;
        desired.current.set(
          tmp.current.x + Math.cos(t) * r,
          tmp.current.y + r * 0.42,
          tmp.current.z + Math.sin(t) * r
        );
        ctl.object.position.lerp(desired.current, 1 - Math.exp(-dt * 0.85));
        ctl.target.lerp(tmp.current, 1 - Math.exp(-dt * 1.3));
      }
      ctl.update();
      return;
    }

    // ---------------- focus / follow ----------------
    if (st.focusReq !== lastFocusReq.current) {
      lastFocusReq.current = st.focusReq;
      const reg = st.selected ? bodyRegistry.get(st.selected) : undefined;
      if (reg) {
        reg.obj.getWorldPosition(tmp.current);
        prevTarget.current.copy(tmp.current);
        const dist = clamp(reg.radius * 5.5 + 3, 2.2, 900);
        const dir = new THREE.Vector3().subVectors(ctl.object.position, tmp.current).normalize();
        if (dir.lengthSq() < 0.001) dir.set(0.4, 0.45, 1).normalize();
        desired.current.copy(tmp.current).addScaledVector(dir, dist);
        desired.current.y = tmp.current.y + dist * 0.42;
        startFlyTo(desired.current.clone(), 1.5);
      }
    } else if (st.follow && st.selected) {
      const reg = bodyRegistry.get(st.selected);
      if (reg) {
        reg.obj.getWorldPosition(tmp.current);
        const move = new THREE.Vector3().subVectors(tmp.current, prevTarget.current);
        ctl.object.position.add(move);
        ctl.target.lerp(tmp.current, 1 - Math.exp(-dt * 6));
        prevTarget.current.copy(tmp.current);
      }
    }

    // fly-to animation
    if (anim.current) {
      const a = anim.current;
      a.t += dt / a.dur;
      const k = a.t >= 1 ? 1 : 1 - Math.pow(1 - a.t, 3);
      ctl.object.position.lerpVectors(a.from, a.to, k);
      if (a.t >= 1) anim.current = null;
    }

    ctl.update();
  });

  const sensitivity = useStore((s) => s.settings.camSensitivity);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55 * sensitivity}
      zoomSpeed={0.9 * sensitivity}
      panSpeed={0.7 * sensitivity}
      minDistance={0.4}
      maxDistance={9000}
      onStart={() => {
        const st = useStore.getState();
        if (st.follow && !st.cinematic) st.setFollow(false);
        audioUnlockOnce();
      }}
    />
  );
}

/* ---------------------------- travel planner ---------------------------- */

function TravelPath() {
  const travel = useStore((s) => s.travel);
  const craft = useRef<THREE.Group>(null!);
  const arrived = useRef(false);

  useEffect(() => {
    arrived.current = false;
  }, [travel?.startedAt]);

  const curve = useMemo(() => {
    if (!travel) return null;
    const a = bodyRegistry.get(travel.from);
    const b = bodyRegistry.get(travel.to);
    if (!a || !b) return null;
    const p1 = a.obj.getWorldPosition(new THREE.Vector3());
    const p2 = b.obj.getWorldPosition(new THREE.Vector3());
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    mid.y += p1.distanceTo(p2) * 0.3 + 4;
    return new THREE.QuadraticBezierCurve3(p1, mid, p2);
  }, [travel]);

  const lineObj = useMemo(() => {
    if (!curve) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(140));
    const mat = new THREE.LineDashedMaterial({
      color: "#5ee6ff",
      transparent: true,
      opacity: 0.65,
      dashSize: 1.6,
      gapSize: 1.1,
      depthWrite: false,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, [curve]);
  useEffect(() => {
    return () => {
      if (lineObj) {
        lineObj.geometry.dispose();
        (lineObj.material as THREE.Material).dispose();
      }
    };
  }, [lineObj]);

  useFrame(() => {
    if (!travel || !curve || !craft.current) return;
    const t = clamp((performance.now() - travel.startedAt) / 11000, 0, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    curve.getPoint(eased, craft.current.position);
    if (t >= 1 && !arrived.current) {
      arrived.current = true;
      useStore.getState().toast(`Arrived at ${travel.to.toUpperCase()} — simplified trajectory complete`, "success");
    }
  });

  if (!travel || !curve) return null;
  return (
    <group>
      {lineObj && <primitive object={lineObj} />}
      <group ref={craft}>
        <mesh scale={0.5}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#dff6ff" emissive="#5ee6ff" emissiveIntensity={1.4} roughness={0.3} metalness={0.6} />
        </mesh>
        <sprite scale={3.4}>
          <spriteMaterial map={getTexture("glow-cyan")} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}

/* ------------------------------ scene root ------------------------------ */

function SystemGroup() {
  const eclipse = useStore((s) => s.eclipse);
  return (
    <group visible={!eclipse}>
      <Planets />
      <AsteroidBelt />
      <Comets />
      <Spacecrafts />
      <TravelPath />
    </group>
  );
}

export function SceneCanvas() {
  const quality = useStore((s) => s.settings.quality);
  const shadowsOn = useStore((s) => s.settings.shadows);
  const dpr = QUALITY[quality].dpr;
  return (
    <Canvas
      dpr={[1, dpr]}
      camera={{ position: [0, 160, 420], fov: 50, near: 0.1, far: 30000 }}
      shadows={shadowsOn && QUALITY[quality].shadows}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={(e) => {
        const dx = e.clientX - pointerInfo.x;
        const dy = e.clientY - pointerInfo.y;
        if (Math.hypot(dx, dy) > 6) return; // was a drag, not a click
        const st = useStore.getState();
        if (st.selected && !st.cinematic) st.select(null, false);
      }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#030612"]} />
      <ambientLight intensity={0.055} color="#8fb4ff" />
      <SimTicker />
      <CameraRig />
      <StarField />
      <SystemGroup />
      <EclipseLab />
    </Canvas>
  );
}
