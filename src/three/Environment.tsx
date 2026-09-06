import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { COMETS, SPACECRAFT, BODY_BY_ID, type CelestialBody } from "../data";
import {
  mapDist, bodyPositionScene, simDays, QUALITY, registerBody, unregisterBody, clamp,
} from "../sim";
import { useStore } from "../store";
import { getTexture } from "../textures";
import { OrbitLine, BodyLabel, SelectionReticle } from "./Bodies";

/* ------------------------------- starfield ------------------------------ */

export function StarField() {
  const quality = useStore((s) => s.settings.quality);
  const density = useStore((s) => s.settings.starDensity);
  const count = Math.round(QUALITY[quality].stars * clamp(density, 0.15, 1));

  const [geoFar, geoNear] = useMemo(() => {
    const make = (n: number, rMin: number, rMax: number, size: number) => {
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const t = Math.random();
        if (t < 0.72) c.setHSL(0.58, 0.08, 0.72 + Math.random() * 0.28);
        else if (t < 0.88) c.setHSL(0.62, 0.45, 0.7 + Math.random() * 0.25);
        else c.setHSL(0.08, 0.5, 0.68 + Math.random() * 0.25);
        const dim = 0.35 + Math.random() * 0.65;
        col[i * 3] = c.r * dim;
        col[i * 3 + 1] = c.g * dim;
        col[i * 3 + 2] = c.b * dim;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return { g, size };
    };
    const far = make(Math.round(count * 0.66), 4200, 7600, 26);
    const near = make(Math.round(count * 0.34), 2600, 4100, 15);
    return [far, near] as const;
  }, [count]);

  useEffect(
    () => () => {
      geoFar.g.dispose();
      geoNear.g.dispose();
    },
    [geoFar, geoNear]
  );

  const sprite = getTexture("star-sprite");
  return (
    <group>
      <points geometry={geoFar.g} frustumCulled={false}>
        <pointsMaterial map={sprite} size={geoFar.size} sizeAttenuation transparent vertexColors depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </points>
      <points geometry={geoNear.g} frustumCulled={false}>
        <pointsMaterial map={sprite} size={geoNear.size} sizeAttenuation transparent vertexColors depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.75} />
      </points>
      <Nebulae />
    </group>
  );
}

function Nebulae() {
  const items = useMemo(
    () => [
      { tex: "nebula-0", pos: [3400, 900, -3800], s: 5200, o: 0.13 },
      { tex: "nebula-1", pos: [-4200, -700, 2600], s: 4600, o: 0.11 },
      { tex: "nebula-2", pos: [-1400, 2600, 4600], s: 4000, o: 0.1 },
      { tex: "nebula-0", pos: [2200, -2400, -4400], s: 3600, o: 0.08 },
      { tex: "nebula-1", pos: [4800, 400, 2400], s: 4200, o: 0.09 },
    ],
    []
  );
  return (
    <group>
      {items.map((it, i) => (
        <sprite key={i} position={it.pos as [number, number, number]} scale={it.s} renderOrder={-10}>
          <spriteMaterial map={getTexture(it.tex)} transparent opacity={it.o} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/* ------------------------------ asteroid belt --------------------------- */

export function AsteroidBelt() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const scaleMode = useStore((s) => s.scaleMode);
  const quality = useStore((s) => s.settings.quality);
  const density = useStore((s) => s.settings.asteroidDensity);
  const visible = useStore((s) => s.showAsteroids);
  const count = Math.max(80, Math.round(QUALITY[quality].asteroids * clamp(density, 0.1, 1)));

  const params = useMemo(() => {
    const arr: { aAU: number; ang: number; y: number; scale: number; rx: number; ry: number }[] = [];
    for (let i = 0; i < count; i++) {
      const gauss = (Math.random() + Math.random() + Math.random()) / 3;
      arr.push({
        aAU: 2.08 + gauss * 1.22 + Math.random() * 0.08,
        ang: Math.random() * Math.PI * 2,
        y: (Math.random() - 0.5) * 0.5,
        scale: 0.14 + Math.pow(Math.random(), 2.4) * 0.55,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
      });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const sizeScale = scaleMode === "realistic" ? 0.45 : scaleMode === "educational" ? 0.8 : 1;
    params.forEach((p, i) => {
      const r = mapDist(p.aAU, scaleMode) * (1 + (Math.random() - 0.5) * 0.01);
      dummy.position.set(Math.cos(p.ang) * r, p.y * (scaleMode === "realistic" ? 2 : 3.2), Math.sin(p.ang) * r);
      dummy.rotation.set(p.rx, p.ry, 0);
      dummy.scale.setScalar(p.scale * sizeScale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [params, scaleMode]);

  useFrame(() => {
    // belt rotates as a solid body at ~1680-day mean period (illustrative)
    group.current.rotation.y = -((2 * Math.PI * simDays()) / 1680) % (Math.PI * 2);
  });

  if (!visible) return null;
  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8a8072" roughness={1} metalness={0.05} flatShading />
      </instancedMesh>
    </group>
  );
}

/* -------------------------------- comets -------------------------------- */

function Comet({ body }: { body: CelestialBody }) {
  const group = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const ionRef = useRef<THREE.Mesh>(null!);
  const dustRef = useRef<THREE.Mesh>(null!);
  const comaRef = useRef<THREE.Sprite>(null!);
  const st = useStore();
  const selected = st.selected === body.id;
  const nucR = st.scaleMode === "realistic" ? 0.14 : 0.4;

  const tailGeoIon = useMemo(() => new THREE.ConeGeometry(1, 1, 20, 1, true), []);
  const tailGeoDust = useMemo(() => new THREE.ConeGeometry(1, 1, 20, 1, true), []);
  useEffect(() => {
    registerBody(body.id, group.current, nucR * 3, body);
  }, [body, nucR]);
  useEffect(
    () => () => {
      unregisterBody(body.id);
      tailGeoIon.dispose();
      tailGeoDust.dispose();
    },
    [body, tailGeoIon, tailGeoDust]
  );

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const s = useStore.getState();
    const d = simDays();
    const p = bodyPositionScene(body, d, s.scaleMode);
    group.current.position.copy(p);
    const rAU = Math.max(p.length() / mapDist(1, s.scaleMode), 0.05);
    dir.copy(p).normalize();
    q.setFromUnitVectors(up, dir);
    tail.current.quaternion.copy(q);
    const L = clamp(30 / Math.pow(rAU, 0.85), 2, 55);
    const w = clamp(L * 0.1, 0.35, 3.2);
    ionRef.current.scale.set(w * 0.45, L, w * 0.45);
    ionRef.current.position.y = L / 2 + nucR;
    dustRef.current.scale.set(w * 1.15, L * 0.8, w * 1.15);
    dustRef.current.position.y = L * 0.4 + nucR;
    const fade = clamp(2.2 / rAU, 0.04, 0.5);
    (ionRef.current.material as THREE.MeshBasicMaterial).opacity = fade;
    (dustRef.current.material as THREE.MeshBasicMaterial).opacity = fade * 0.55;
    comaRef.current.scale.setScalar(nucR * 7 * clamp(1.4 / rAU, 0.35, 1.6));
    tail.current.visible = rAU < 12;
  });

  return (
    <group ref={group}>
      <OrbitLine body={body} mode={st.scaleMode} />
      <mesh
        onClick={(e) => { e.stopPropagation(); useStore.getState().select(body.id); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[Math.max(nucR * 2.4, 1.1), 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh scale={nucR}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial map={getTexture("nucleus")} roughness={1} />
      </mesh>
      <sprite ref={comaRef}>
        <spriteMaterial map={getTexture("glow-soft")} color="#cfe8ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <group ref={tail}>
        <mesh ref={ionRef} geometry={tailGeoIon}>
          <meshBasicMaterial color="#7fd4ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={dustRef} geometry={tailGeoDust}>
          <meshBasicMaterial color="#ffe9b0" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <BodyLabel body={body} visible={st.showLabels && !st.cinematic} />
      <SelectionReticle visible={selected} radius={nucR * 2} />
    </group>
  );
}

export function Comets() {
  const visible = useStore((s) => s.showComets);
  if (!visible) return null;
  return (
    <group>
      {COMETS.map((c) => (
        <Comet key={c.id} body={c} />
      ))}
    </group>
  );
}

/* ------------------------------- spacecraft ------------------------------ */

interface CraftPath {
  kind: "escape" | "orbiter" | "kepler";
  r0?: number;
  rate?: number;
  y0?: number;
  lon?: number;
  parent?: string;
  orbitR?: number;
  period?: number;
  polar?: boolean;
}

const CRAFT_PATHS: Record<string, CraftPath> = {
  voyager1: { kind: "escape", r0: 80, rate: 3.6, y0: 2000, lon: 20 },
  voyager2: { kind: "escape", r0: 62, rate: 3.2, y0: 2000, lon: 300 },
  newhorizons: { kind: "escape", r0: 9, rate: 2.9, y0: 2006, lon: 239 },
  parker: { kind: "kepler" },
  cassini: { kind: "orbiter", parent: "saturn", orbitR: 3.1, period: 15.9 },
  juno: { kind: "orbiter", parent: "jupiter", orbitR: 2.7, period: 53, polar: true },
};

function Spacecraft({ body }: { body: CelestialBody }) {
  const group = useRef<THREE.Group>(null!);
  const st = useStore();
  const selected = st.selected === body.id;
  const path = CRAFT_PATHS[body.id];

  useEffect(() => {
    registerBody(body.id, group.current, 1.4, body);
    return () => unregisterBody(body.id);
  }, [body]);

  const trailLine = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    const m = new THREE.LineBasicMaterial({
      color: "#8de8a0",
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);
  useEffect(
    () => () => {
      trailLine.geometry.dispose();
      (trailLine.material as THREE.Material).dispose();
    },
    [trailLine]
  );

  const dirVec = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const s = useStore.getState();
    const d = simDays();
    const pos = tmp;
    const attr = trailLine.geometry.attributes.position as THREE.BufferAttribute;
    if (path.kind === "kepler") {
      pos.copy(bodyPositionScene(body, d, s.scaleMode));
    } else if (path.kind === "escape") {
      const years = d / 365.25;
      const r = Math.max((path.r0 ?? 10) + (path.rate ?? 3) * (years - (path.y0 ?? 2000)), 0.5);
      const lon = ((path.lon ?? 0) * Math.PI) / 180;
      const inc = (body.inclinationDeg * Math.PI) / 180;
      dirVec.set(Math.cos(lon) * Math.cos(inc), Math.sin(inc), Math.sin(lon) * Math.cos(inc));
      pos.copy(dirVec).multiplyScalar(mapDist(r, s.scaleMode));
      // trail from inner system out to the craft
      for (let i = 0; i < 64; i++) {
        const f = i / 63;
        const rr = mapDist(Math.max(0.9, r * f + 0.4 * (1 - f)), s.scaleMode);
        attr.setXYZ(i, dirVec.x * rr, dirVec.y * rr, dirVec.z * rr);
      }
      attr.needsUpdate = true;
    } else {
      const parentPos = getParentPos(path.parent ?? "saturn");
      const ang = (2 * Math.PI * d) / (path.period ?? 15);
      const or = (path.orbitR ?? 3) * getRegRadius(path.parent ?? "saturn");
      if (path.polar) {
        pos.set(parentPos.x + Math.cos(ang) * or, parentPos.y + Math.sin(ang) * or * 0.9, parentPos.z + Math.sin(ang) * or * 0.35);
      } else {
        pos.set(parentPos.x + Math.cos(ang) * or, parentPos.y + Math.sin(ang) * or * 0.12, parentPos.z + Math.sin(ang) * or);
      }
      // illustrative orbit ring around the parent
      for (let i = 0; i < 64; i++) {
        const a2 = (i / 64) * Math.PI * 2;
        if (path.polar) {
          attr.setXYZ(i, parentPos.x + Math.cos(a2) * or, parentPos.y + Math.sin(a2) * or * 0.9, parentPos.z + Math.sin(a2) * or * 0.35);
        } else {
          attr.setXYZ(i, parentPos.x + Math.cos(a2) * or, parentPos.y + Math.sin(a2) * or * 0.12, parentPos.z + Math.sin(a2) * or);
        }
      }
      attr.needsUpdate = true;
    }
    group.current.position.copy(pos);
    group.current.rotation.y += 0.01;
  });

  return (
    <group ref={group}>
      <primitive object={trailLine} />
      <group
        onClick={(e) => { e.stopPropagation(); useStore.getState().select(body.id); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <mesh>
          <sphereGeometry args={[1.15, 8, 6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh scale={0.42}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#c8d4e4" roughness={0.4} metalness={0.7} emissive="#1a2436" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.7, 0]} scale={0.3} rotation-x={Math.PI}>
          <coneGeometry args={[1, 0.7, 12]} />
          <meshStandardMaterial color="#8a9ab4" roughness={0.5} metalness={0.6} />
        </mesh>
        <sprite scale={2.6}>
          <spriteMaterial map={getTexture("glow-soft")} color={body.color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
      <BodyLabel body={body} visible={st.showLabels && !st.cinematic} />
      <SelectionReticle visible={selected} radius={1} />
    </group>
  );
}

import { bodyRegistry } from "../sim";
function getParentPos(id: string): THREE.Vector3 {
  const reg = bodyRegistry.get(id);
  if (!reg) return new THREE.Vector3();
  return reg.obj.getWorldPosition(new THREE.Vector3());
}
function getRegRadius(id: string): number {
  return bodyRegistry.get(id)?.radius ?? 4;
}

export function Spacecrafts() {
  const visible = useStore((s) => s.showSpacecraft);
  if (!visible) return null;
  return (
    <group>
      {SPACECRAFT.map((c) => (
        <Spacecraft key={c.id} body={c} />
      ))}
    </group>
  );
}

/* ------------------------------- eclipse lab ----------------------------- */

export function EclipseLab() {
  const eclipse = useStore((s) => s.eclipse);
  const moonRef = useRef<THREE.Group>(null!);
  const moonMat = useRef<THREE.MeshStandardMaterial>(null!);
  const earthRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (eclipse && earthRef.current) {
      registerBody("eclipse-earth", earthRef.current, 3.4, BODY_BY_ID.earth);
      return () => unregisterBody("eclipse-earth");
    }
  }, [eclipse]);

  const sunLight = useMemo(() => new THREE.DirectionalLight("#fff2dd", 2.4), []);
  useEffect(() => {
    sunLight.position.set(-1, 0, 0);
    sunLight.target.position.set(1, 0, 0);
    return () => {
      sunLight.dispose();
    };
  }, [sunLight]);

  useFrame(({ clock }) => {
    if (!eclipse) return;
    const t = clock.getElapsedTime() * 0.22;
    const x = Math.sin(t) * 11;
    const z = Math.cos(t) * 1.4;
    moonRef.current.position.set(eclipse === "solar" ? -Math.abs(x) - 4 : Math.abs(x) + 5, 0, z);
    // alignment factor: how close to perfect syzygy
    const align = 1 - clamp(Math.abs(z) / 1.4, 0, 1) * 0.7;
    if (eclipse === "lunar") {
      const inUmbra = clamp((moonRef.current.position.x - 7) / 6, 0, 1) * align;
      moonMat.current.color.setRGB(1 - inUmbra * 0.75, 1 - inUmbra * 0.85, 1 - inUmbra * 0.82);
      moonMat.current.emissive.setRGB(inUmbra * 0.55, inUmbra * 0.12, inUmbra * 0.05);
    } else {
      moonMat.current.color.setRGB(1, 1, 1);
      moonMat.current.emissive.setRGB(0, 0, 0);
    }
  });

  if (!eclipse) return null;
  const isSolar = eclipse === "solar";
  return (
    <group>
      {/* lab sun */}
      <group position={[-80, 0, 0]}>
        <mesh scale={7}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial map={getTexture("sun")} color="#ffd9a0" />
        </mesh>
        <sprite scale={44}>
          <spriteMaterial map={getTexture("glow-sun")} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
      <primitive object={sunLight} />
      <primitive object={sunLight.target} />
      <ambientLight intensity={0.06} />
      <Html center position={[-80, 11, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
        <div className="planet-label"><span className="pl-name">SUN</span></div>
      </Html>
      {/* Earth */}
      <group ref={earthRef}>
        <mesh scale={2.4}>
          <sphereGeometry args={[1, 56, 40]} />
          <meshStandardMaterial map={getTexture("earth-day")} roughness={0.95} />
        </mesh>
        <Html center position={[0, 5.4, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
          <div className="planet-label"><span className="pl-name">EARTH</span></div>
        </Html>
        {/* Earth's umbra — lunar eclipse geometry */}
        {!isSolar && (
          <mesh position={[15, 0, 0]} rotation-z={-Math.PI / 2}>
            <cylinderGeometry args={[2.6, 0.8, 26, 24, 1, true]} />
            <meshBasicMaterial color="#30060a" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* Moon */}
      <group ref={moonRef}>
        <mesh scale={0.66}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial ref={moonMat} map={getTexture("moon")} roughness={1} />
        </mesh>
        <Html center position={[0, 1.8, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
          <div className="planet-label"><span className="pl-name">MOON</span></div>
        </Html>
        {/* Moon's umbra sweeping toward Earth — solar eclipse geometry */}
        {isSolar && (
          <mesh position={[5.2, 0, 0]} rotation-z={-Math.PI / 2}>
            <cylinderGeometry args={[1.7, 0.35, 10, 24, 1, true]} />
            <meshBasicMaterial color="#020409" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* alignment caption */}
      <Html center position={[0, 11, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
        <div className="glass-soft" style={{ padding: "8px 16px", borderRadius: 10, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.2em", color: "#d9f2ff", whiteSpace: "nowrap" }}>
          {isSolar ? "SUN → MOON → EARTH" : "SUN → EARTH → MOON"}
        </div>
      </Html>
    </group>
  );
}
