import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BODIES, BODY_BY_ID, moonsOf, type CelestialBody } from "../data";
import {
  bodyPositionScene, orbitPathPoints, sceneRadius, moonOrbitScene, simDays,
  SCALES, bodyRegistry, registerBody, unregisterBody, type ScaleMode, clamp,
} from "../sim";
import { useStore, orbitVisibleFor } from "../store";
import { getTexture } from "../textures";

const SPHERE_HI = new THREE.SphereGeometry(1, 72, 48);
const SPHERE_LO = new THREE.SphereGeometry(1, 36, 24);

/* ------------------------------- orbit line ----------------------------- */

export function OrbitLine({ body, mode }: { body: CelestialBody; mode: ScaleMode }) {
  const st = useStore();
  const visible = body.type === "moon" ? st.showMoonOrbits : orbitVisibleFor(st, body.id);
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(orbitPathPoints(body, mode));
    const mat = new THREE.LineBasicMaterial({
      color: body.type === "moon" ? "#7fb4ff" : body.color,
      transparent: true,
      opacity: body.type === "moon" ? 0.22 : 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [body, mode]);
  useEffect(
    () => () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    },
    [lineObj]
  );
  if (!visible) return null;
  return <primitive object={lineObj} />;
}

/* ------------------------------- atmosphere ----------------------------- */

const ATMO_VERT = `
varying vec3 vNormal; varying vec3 vViewPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const ATMO_FRAG = `
uniform vec3 color; uniform float power; uniform float intensity;
varying vec3 vNormal; varying vec3 vViewPos;
void main() {
  vec3 viewDir = normalize(-vViewPos);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), power);
  gl_FragColor = vec4(color * fres * intensity, fres * intensity);
}`;

export function Atmosphere({ radius, color, power = 3.4, intensity = 1.0 }: {
  radius: number; color: string; power?: number; intensity?: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(color) },
          power: { value: power },
          intensity: { value: intensity },
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    [color, power, intensity]
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const atmos = useStore((s) => s.settings.atmospheres);
  if (!atmos) return null;
  return (
    <mesh geometry={SPHERE_HI} material={mat} scale={radius * 1.14} renderOrder={2} />
  );
}

/* ------------------------------- earth shader --------------------------- */

const EARTH_VERT = `
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const EARTH_FRAG = `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunPos;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 sunDir = normalize(sunPos - vWorldPos);
  float ndl = dot(n, sunDir);
  float dayMix = smoothstep(-0.12, 0.22, ndl);
  vec3 day = texture2D(dayMap, vUv).rgb * (0.16 + 0.95 * max(ndl, 0.0));
  vec3 night = texture2D(nightMap, vUv).rgb * 1.55;
  vec3 col = mix(night, day, dayMix);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);
  col += vec3(0.22, 0.46, 1.0) * fres * (0.3 + 0.7 * dayMix) * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`;

function useEarthMaterial(enabled: boolean) {
  const mat = useMemo(
    () =>
      enabled
        ? new THREE.ShaderMaterial({
            uniforms: {
              dayMap: { value: getTexture("earth-day") },
              nightMap: { value: getTexture("earth-night") },
              sunPos: { value: new THREE.Vector3(0, 0, 0) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: EARTH_FRAG,
          })
        : null,
    [enabled]
  );
  useEffect(() => () => mat?.dispose(), [mat]);
  return mat;
}

/* ------------------------------ ring system ----------------------------- */

function RingSystem({ inner, outer, texKey, opacity = 1 }: {
  inner: number; outer: number; texKey: string; opacity?: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 160, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const r = (v3.length() - inner) / (outer - inner);
      uv.setXY(i, clamp(r, 0, 1), 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, [inner, outer]);
  useEffect(() => () => geo.dispose(), [geo]);
  const shadows = useStore((s) => s.settings.shadows && s.settings.quality !== "low" && s.settings.quality !== "medium");
  return (
    <mesh geometry={geo} rotation-x={Math.PI / 2} renderOrder={3} receiveShadow={shadows}>
      <meshStandardMaterial
        map={getTexture(texKey)}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0}
        depthWrite={false}
        alphaTest={0.03}
      />
    </mesh>
  );
}

/* -------------------------------- labels -------------------------------- */

export function BodyLabel({ body, visible, small = false }: { body: CelestialBody; visible: boolean; small?: boolean }) {
  if (!visible) return null;
  return (
    <Html center zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
      <div className="planet-label" style={small ? { transform: "scale(0.78)" } : undefined}>
        <span className="pl-name">{body.name.toUpperCase()}</span>
        {!small && <span className="pl-dist">{body.distLabel}</span>}
        <span className="pl-dot" />
      </div>
    </Html>
  );
}

export function SelectionReticle({ visible }: { visible: boolean; radius: number }) {
  if (!visible) return null;
  return (
    <Html center zIndexRange={[50, 0]} style={{ pointerEvents: "none" }}>
      <div className="reticle">
        <div className="ring" />
        <div className="corner c1" /><div className="corner c2" />
        <div className="corner c3" /><div className="corner c4" />
      </div>
    </Html>
  );
}

/* --------------------------------- Sun ---------------------------------- */

export function Sun() {
  const group = useRef<THREE.Group>(null!);
  const glow1 = useRef<THREE.Sprite>(null!);
  const glow2 = useRef<THREE.Sprite>(null!);
  const st = useStore();
  const radius = SCALES[st.scaleMode].sunR;
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getTexture("sun"),
        color: new THREE.Color("#ffd9a0"),
      }),
    []
  );
  useEffect(() => {
    registerBody("sun", group.current, radius, BODY_BY_ID.sun);
    return () => unregisterBody("sun");
  }, [radius]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.02;
    const pulse = 1 + Math.sin(t * 0.9) * 0.03;
    if (glow1.current) glow1.current.scale.setScalar(radius * 5.2 * pulse);
    if (glow2.current) glow2.current.scale.setScalar(radius * 11 * (2 - pulse));
  });

  const selected = st.selected === "sun";
  const shadows = st.settings.shadows && st.settings.quality !== "low" && st.settings.quality !== "medium";

  return (
    <group ref={group}>
      <mesh
        geometry={SPHERE_HI}
        material={mat}
        scale={radius}
        onClick={(e) => { e.stopPropagation(); useStore.getState().select("sun"); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      />
      <pointLight
        color="#fff2dd"
        intensity={2.6}
        decay={0}
        distance={0}
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.002}
      />
      {st.settings.bloom && (
        <>
          <sprite ref={glow1} renderOrder={5}>
            <spriteMaterial map={getTexture("glow-sun")} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          <sprite ref={glow2} renderOrder={5}>
            <spriteMaterial map={getTexture("glow-sun")} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </>
      )}
      <BodyLabel body={BODY_BY_ID.sun} visible={st.showLabels && !st.cinematic} />
      <SelectionReticle visible={selected} radius={radius} />
    </group>
  );
}

/* -------------------------------- Planet -------------------------------- */

export function Planet({ body }: { body: CelestialBody }) {
  const group = useRef<THREE.Group>(null!);
  const spin = useRef<THREE.Group>(null!);
  const st = useStore();
  const selected = st.selected === body.id;
  const isEarth = body.id === "earth";
  const earthMat = useEarthMaterial(isEarth);

  const radius = useMemo(
    () => sceneRadius(body.radiusKm, body.type, st.scaleMode) * useStore.getState().hypo.sizeMul,
    [body, st.scaleMode, st.hypo.sizeMul]
  );

  useEffect(() => {
    registerBody(body.id, group.current, radius, body);
    return () => unregisterBody(body.id);
  }, [body, radius]);

  const moons = useMemo(() => moonsOf(body.id), [body]);
  const tex = useMemo(() => getTexture(isEarth ? "earth-day" : body.id), [body, isEarth]);

  useFrame(() => {
    const s = useStore.getState();
    const d = simDays();
    const orbitMul = body.type === "dwarf" || body.type === "planet" ? s.hypo.orbitMul : 1;
    const p = bodyPositionScene(body, d, s.scaleMode, orbitMul);
    group.current.position.copy(p);
    const rotSpeed = (2 * Math.PI * 24) / body.rotationHours;
    spin.current.rotation.y = d * rotSpeed * s.hypo.rotMul;
  });

  const tiltRad = (body.tiltDeg * Math.PI) / 180;

  return (
    <group ref={group}>
      <OrbitLine body={body} mode={st.scaleMode} />
      {/* axial tilt frame */}
      <group rotation-z={body.id === "uranus" ? -tiltRad : tiltRad * 0.4}>
        <group ref={spin}>
          <mesh
            geometry={SPHERE_HI}
            scale={radius}
            material={isEarth && earthMat ? earthMat : undefined}
            castShadow={st.settings.shadows}
            receiveShadow={st.settings.shadows}
            onClick={(e) => { e.stopPropagation(); useStore.getState().select(body.id); }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          >
            {!isEarth && (
              <meshStandardMaterial map={tex} roughness={0.95} metalness={0.02} />
            )}
          </mesh>
        </group>
        {isEarth && (
          <CloudLayer radius={radius} />
        )}
        {(body.id === "venus" || isEarth || body.id === "mars" || body.id === "jupiter" || body.id === "saturn" || body.id === "uranus" || body.id === "neptune" || body.id === "pluto" || body.id === "titan") && (
          <Atmosphere
            radius={radius}
            color={
              body.id === "venus" ? "#ffd9a0" : isEarth ? "#4f9df0" : body.id === "mars" ? "#e08a5a"
                : body.id === "jupiter" ? "#e0b484" : body.id === "saturn" ? "#e8d5a8"
                : body.id === "uranus" ? "#9fe8ec" : body.id === "neptune" ? "#6a8af0"
                : body.id === "titan" ? "#e8b060" : "#c9d8f0"
            }
            intensity={body.id === "venus" ? 1.2 : isEarth ? 1.0 : 0.6}
          />
        )}
        {body.id === "saturn" && (
          <RingSystem inner={radius * 1.24} outer={radius * 2.36} texKey="ring-saturn" />
        )}
        {body.id === "uranus" && (
          <RingSystem inner={radius * 1.5} outer={radius * 2.05} texKey="ring-uranus" opacity={0.55} />
        )}
      </group>
      {/* moons */}
      {st.showMoons && moons.map((m, i) =>
        body.id === "earth" && useStore.getState().hypo.noMoon ? null : (
          <MoonBody key={m.id} body={m} parentRadius={radius} index={i} mode={st.scaleMode} parentSelected={selected} />
        )
      )}
      <BodyLabel body={body} visible={st.showLabels && !st.cinematic} />
      <SelectionReticle visible={selected} radius={radius} />
    </group>
  );
}

function CloudLayer({ radius }: { radius: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const d = simDays();
    ref.current.rotation.y = d * ((2 * Math.PI * 24) / 23.93) * 1.12;
  });
  return (
    <mesh ref={ref} geometry={SPHERE_HI} scale={radius * 1.015} renderOrder={1}>
      <meshLambertMaterial
        map={getTexture("earth-clouds")}
        transparent
        opacity={0.92}
        depthWrite={false}
        color="#ffffff"
      />
    </mesh>
  );
}

/* --------------------------------- Moon --------------------------------- */

export function MoonBody({ body, parentRadius, index, mode, parentSelected }: {
  body: CelestialBody; parentRadius: number; index: number; mode: ScaleMode; parentSelected: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  const spin = useRef<THREE.Group>(null!);
  const radius = useMemo(
    () => Math.max(sceneRadius(body.radiusKm, "moon", mode) * useStore.getState().hypo.sizeMul, mode === "realistic" ? 0.02 : 0.14),
    [body, mode]
  );
  const orbitR = useMemo(() => {
    if (mode === "realistic" && body.parent) {
      // true parent-radius-relative distances in realistic mode
      const pr = BODY_BY_ID[body.parent]?.radiusKm ?? 1;
      return Math.max(((body.orbitKm ?? 100000) / pr) * parentRadius, parentRadius + 0.25);
    }
    const base = moonOrbitScene(parentRadius, radius, index, mode);
    // keep ringed-planet moons outside the ring system
    if (body.parent === "saturn") return Math.max(base, parentRadius * 2.65 + index * parentRadius * 0.85);
    if (body.parent === "uranus") return Math.max(base, parentRadius * 2.4 + index * parentRadius * 0.7);
    return base;
  }, [body, parentRadius, radius, index, mode]);
  useEffect(() => {
    registerBody(body.id, group.current, radius, body);
    return () => unregisterBody(body.id);
  }, [body, radius]);

  useFrame(() => {
    const s = useStore.getState();
    const d = simDays();
    const ang = (body.L0 * Math.PI) / 180 + (2 * Math.PI * d) / body.periodDays;
    group.current.position.set(Math.cos(ang) * orbitR, Math.sin((body.inclinationDeg * Math.PI) / 180) * Math.sin(ang) * orbitR * 0.4, Math.sin(ang) * orbitR);
    spin.current.rotation.y = ang;
  });

  const st = useStore();
  const selected = st.selected === body.id;

  return (
    <group ref={group}>
      {st.showMoonOrbits && (
        <MoonOrbitRing radius={orbitR} />
      )}
      <group ref={spin}>
        <mesh
          geometry={SPHERE_LO}
          scale={radius}
          castShadow={st.settings.shadows}
          onClick={(e) => { e.stopPropagation(); useStore.getState().select(body.id); }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          <meshStandardMaterial map={getTexture(body.id)} roughness={0.97} metalness={0} />
        </mesh>
      </group>
      <BodyLabel body={body} visible={st.showLabels && parentSelected && !st.cinematic} small />
      <SelectionReticle visible={selected} radius={radius} />
    </group>
  );
}

function MoonOrbitRing({ radius }: { radius: number }) {
  const lineObj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: "#7fb4ff",
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [radius]);
  useEffect(
    () => () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    },
    [lineObj]
  );
  return <primitive object={lineObj} />;
}

/* ------------------------- planet collection ---------------------------- */

export function Planets() {
  const st = useStore();
  const planets = useMemo(() => BODIES.filter((b) => b.type === "planet" || b.type === "dwarf"), []);
  return (
    <group visible={!st.eclipse}>
      <Sun />
      {planets.map((p) => (
        <Planet key={p.id} body={p} />
      ))}
    </group>
  );
}
