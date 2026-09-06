import * as THREE from "three";
import type { CelestialBody } from "./data";

/* ------------------------------ scale modes ----------------------------- */

export type ScaleMode = "realistic" | "visibility" | "educational";

interface ScaleCfg {
  distK: number;   // distance coefficient
  distP: number;   // distance power
  sunR: number;    // scene radius of the sun
  sizeK: number;   // body size coefficient
  sizeP: number;   // body size power
  moonMul: number; // moon orbit spacing multiplier
}

export const SCALES: Record<ScaleMode, ScaleCfg> = {
  // True relative planet sizes; distances linearly compressed (60 u per AU)
  realistic: { distK: 60, distP: 1, sunR: 3.2, sizeK: 1.44e-5, sizeP: 1, moonMul: 0 },
  // Enlarged, compressed — everything interactable
  visibility: { distK: 28, distP: 0.62, sunR: 6, sizeK: 0.028, sizeP: 0.45, moonMul: 1 },
  // Balanced teaching layout
  educational: { distK: 21, distP: 0.55, sunR: 4.6, sizeK: 0.017, sizeP: 0.5, moonMul: 0.8 },
};

export const AU_KM = 149_597_870.7;
export const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Map an orbital radius in AU to scene units for the active scale mode. */
export function mapDist(rAU: number, mode: ScaleMode): number {
  const s = SCALES[mode];
  return s.distK * Math.pow(Math.max(rAU, 0.0001), s.distP);
}

/** Scene radius of a body in the active scale mode. */
export function sceneRadius(km: number, type: CelestialBody["type"], mode: ScaleMode): number {
  if (type === "star") return SCALES[mode].sunR;
  const s = SCALES[mode];
  return Math.max(s.sizeK * Math.pow(km, s.sizeP), mode === "realistic" ? 0.045 : 0.24);
}

/** Scene orbit radius for a moon around its parent. */
export function moonOrbitScene(parentR: number, moonR: number, index: number, mode: ScaleMode): number {
  const mul = SCALES[mode].moonMul;
  return parentR * (1.9 + index * 0.72) * mul + moonR * 1.6 + 0.28;
}

/* ------------------------------- kepler -------------------------------- */

/** Solve Kepler's equation M = E - e·sin(E) with Newton iteration. */
export function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 6; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/**
 * Heliocentric position of a body at a given simulation time.
 * Uses real orbital elements + Kepler solver — an educational approximation
 * (no perturbations, fixed elements).
 */
export function bodyPositionAU(
  body: CelestialBody,
  simDays: number,
  orbitMul = 1
): THREE.Vector3 {
  if (body.a <= 0) return new THREE.Vector3(0, 0, 0);
  const n = (2 * Math.PI) / body.periodDays; // mean motion
  const M = (body.L0 * Math.PI) / 180 + n * simDays * orbitMul;
  const E = solveKepler(M % (2 * Math.PI), body.e);
  const x = body.a * (Math.cos(E) - body.e);
  const z = body.a * Math.sqrt(1 - body.e * body.e) * Math.sin(E);
  const inc = (body.inclinationDeg * Math.PI) / 180;
  const y = -Math.sin(inc) * z;
  const z2 = Math.cos(inc) * z;
  return new THREE.Vector3(x, y, z2);
}

/** Same but mapped to scene units (radial compression keeps direction). */
export function bodyPositionScene(
  body: CelestialBody,
  simDays: number,
  mode: ScaleMode,
  orbitMul = 1
): THREE.Vector3 {
  const p = bodyPositionAU(body, simDays, orbitMul);
  const rAU = p.length();
  if (rAU < 1e-6) return p;
  const scale = mapDist(rAU, mode) / rAU;
  return p.multiplyScalar(scale);
}

/** Sample an orbit path (scene units) for drawing orbit lines. */
export function orbitPathPoints(
  body: CelestialBody,
  mode: ScaleMode,
  segments = 192
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * body.periodDays;
    pts.push(bodyPositionScene(body, d, mode, 1));
  }
  return pts;
}

/* --------------------------- simulation clock --------------------------- */

/**
 * Mutable clock read directly inside the render loop — never triggers
 * React re-renders. UI displays poll it at low frequency.
 * 1× speed ≙ 1 simulated day per real second.
 */
export const simClock = {
  t: Date.now(),
  speed: 1,
  playing: true,
};

export const DAY_MS = 86_400_000;

export function simDays(): number {
  return (simClock.t - J2000) / DAY_MS;
}

export function formatSimDate(t: number): { date: string; time: string } {
  const d = new Date(t);
  return {
    date: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export function formatSpeed(speed: number): string {
  const abs = Math.abs(speed);
  const sign = speed < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}${abs.toLocaleString("en-US")}×`;
  return `${sign}${abs}×`;
}

/* ------------------------------ registry -------------------------------- */

/** World-position registry so camera + UI can find any body each frame. */
export interface RegisteredBody {
  obj: THREE.Object3D;
  radius: number;
  body: CelestialBody;
}
export const bodyRegistry = new Map<string, RegisteredBody>();

export function registerBody(id: string, obj: THREE.Object3D, radius: number, body: CelestialBody) {
  bodyRegistry.set(id, { obj, radius, body });
}
export function unregisterBody(id: string) {
  bodyRegistry.delete(id);
}

/* --------------------------- quality presets ---------------------------- */

export type Quality = "ultra" | "high" | "medium" | "low";

export const QUALITY: Record<
  Quality,
  { stars: number; asteroids: number; tex: number; shadows: boolean; dpr: number }
> = {
  ultra: { stars: 7000, asteroids: 2400, tex: 512, shadows: true, dpr: 2 },
  high: { stars: 5000, asteroids: 1600, tex: 512, shadows: true, dpr: 1.75 },
  medium: { stars: 3200, asteroids: 1000, tex: 384, shadows: false, dpr: 1.5 },
  low: { stars: 1800, asteroids: 450, tex: 256, shadows: false, dpr: 1 },
};

/* --------------------------- small utilities ---------------------------- */

export function isMobile(): boolean {
  return typeof window !== "undefined" && (window.innerWidth < 820 || navigator.maxTouchPoints > 1);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
