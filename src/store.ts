import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { simClock, DAY_MS, type ScaleMode, type Quality } from "./sim";
import { isMobile } from "./sim";
import * as audio from "./audio";

export type AppMode = "explore" | "learn" | "simulate" | "cinematic";
export type PanelKind =
  | null
  | "settings"
  | "compare"
  | "missions"
  | "learn"
  | "travel"
  | "eclipse"
  | "hypo";

interface Settings {
  quality: Quality;
  shadows: boolean;
  bloom: boolean;
  atmospheres: boolean;
  starDensity: number;
  asteroidDensity: number;
  uiOpacity: number;
  showHUD: boolean;
  reducedMotion: boolean;
  sound: boolean;
  volume: number;
  camSensitivity: number;
  autoFollow: boolean;
}

interface Hypo {
  sizeMul: number;
  rotMul: number;
  orbitMul: number;
  noMoon: boolean;
}

interface Travel {
  from: string;
  to: string;
  startedAt: number;
}

interface Toast {
  id: number;
  text: string;
  kind: "success" | "info";
}

interface HeliosState {
  /* clock */
  speed: number;
  playing: boolean;
  /* selection */
  selected: string | null;
  follow: boolean;
  focusReq: number;
  /* display */
  scaleMode: ScaleMode;
  mode: AppMode;
  panel: PanelKind;
  searchOpen: boolean;
  showOrbits: boolean;
  showMoonOrbits: boolean;
  showLabels: boolean;
  showMoons: boolean;
  showAsteroids: boolean;
  showSpacecraft: boolean;
  showComets: boolean;
  orbitOverrides: Record<string, boolean>;
  eclipse: "solar" | "lunar" | null;
  compareIds: string[];
  travel: Travel | null;
  hypo: Hypo;
  settings: Settings;
  /* meta */
  loaded: boolean;
  loadPhase: number;
  loadLabel: string;
  welcomeDismissed: boolean;
  missionsDone: string[];
  toasts: Toast[];
  cinematic: boolean;
  introDone: boolean;
  fps: number;
  /* actions */
  select: (id: string | null, focus?: boolean) => void;
  setFollow: (f: boolean) => void;
  setSpeed: (s: number) => void;
  togglePlay: () => void;
  reverse: () => void;
  step: (days: number) => void;
  setDate: (ms: number) => void;
  resetDate: () => void;
  setScaleMode: (m: ScaleMode) => void;
  setMode: (m: AppMode) => void;
  setPanel: (p: PanelKind) => void;
  setSearchOpen: (o: boolean) => void;
  toggle: (key: keyof Pick<HeliosState, "showOrbits" | "showMoonOrbits" | "showLabels" | "showMoons" | "showAsteroids" | "showSpacecraft" | "showComets">) => void;
  toggleOrbitFor: (id: string) => void;
  setEclipse: (e: "solar" | "lunar" | null) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  startTravel: (from: string, to: string) => void;
  stopTravel: () => void;
  setHypo: (h: Partial<Hypo>) => void;
  resetHypo: () => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  setLoaded: () => void;
  setLoad: (phase: number, label: string) => void;
  dismissWelcome: () => void;
  completeMission: (id: string, label: string) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  setCinematic: (c: boolean) => void;
  setIntroDone: () => void;
  setFps: (f: number) => void;
}

let toastId = 0;
const mobile = isMobile();

export const useStore = create<HeliosState>()(
  persist(
    (set, get) => ({
      speed: 1,
      playing: true,
      selected: null,
      follow: true,
      focusReq: 0,
      scaleMode: "educational",
      mode: "explore",
      panel: null,
      searchOpen: false,
      showOrbits: true,
      showMoonOrbits: false,
      showLabels: true,
      showMoons: true,
      showAsteroids: true,
      showSpacecraft: true,
      showComets: true,
      orbitOverrides: {},
      eclipse: null,
      compareIds: [],
      travel: null,
      hypo: { sizeMul: 1, rotMul: 1, orbitMul: 1, noMoon: false },
      settings: {
        quality: mobile ? "medium" : "high",
        shadows: !mobile,
        bloom: true,
        atmospheres: true,
        starDensity: mobile ? 0.5 : 1,
        asteroidDensity: 1,
        uiOpacity: 1,
        showHUD: true,
        reducedMotion: false,
        sound: false,
        volume: 0.5,
        camSensitivity: 1,
        autoFollow: true,
      },
      loaded: false,
      loadPhase: 0,
      loadLabel: "Initializing",
      welcomeDismissed: false,
      missionsDone: [],
      toasts: [],
      cinematic: false,
      introDone: false,
      fps: 60,

      select: (id, focus = true) => {
        const st = get();
        set({
          selected: id,
          follow: id ? (focus && st.settings.autoFollow ? true : st.follow) : false,
          focusReq: id && focus ? st.focusReq + 1 : st.focusReq,
        });
        if (id) audio.playSelect();
      },
      setFollow: (f) => set({ follow: f }),
      setSpeed: (s) => {
        simClock.speed = s;
        set({ speed: s });
      },
      togglePlay: () => {
        simClock.playing = !get().playing;
        set({ playing: simClock.playing });
        audio.playClick();
      },
      reverse: () => {
        const s = -get().speed;
        simClock.speed = s;
        set({ speed: s });
        audio.playClick();
      },
      step: (days) => {
        simClock.t += days * DAY_MS;
        set({});
      },
      setDate: (ms) => {
        simClock.t = ms;
        set({});
      },
      resetDate: () => {
        simClock.t = Date.now();
        set({});
        audio.playClick();
      },
      setScaleMode: (m) => {
        set({ scaleMode: m });
        audio.playClick();
      },
      setMode: (m) => set({ mode: m, panel: m === "learn" ? "learn" : m === "simulate" ? null : get().panel }),
      setPanel: (p) => {
        set({ panel: get().panel === p ? null : p, searchOpen: false });
        audio.playClick();
      },
      setSearchOpen: (o) => set({ searchOpen: o, panel: o ? null : get().panel }),
      toggle: (key) => set((st) => ({ [key]: !st[key] }) as Partial<HeliosState>),
      toggleOrbitFor: (id) =>
        set((st) => ({ orbitOverrides: { ...st.orbitOverrides, [id]: !orbitVisibleFor(st, id) } })),
      setEclipse: (e) => set({ eclipse: e, panel: e ? "eclipse" : null }),
      toggleCompare: (id) =>
        set((st) => ({
          compareIds: st.compareIds.includes(id)
            ? st.compareIds.filter((c) => c !== id)
            : st.compareIds.length >= 3
              ? [...st.compareIds.slice(1), id]
              : [...st.compareIds, id],
        })),
      clearCompare: () => set({ compareIds: [] }),
      startTravel: (from, to) => {
        set({ travel: { from, to, startedAt: performance.now() }, panel: "travel" });
        get().toast(`Transfer trajectory ${from} → ${to} engaged`, "info");
      },
      stopTravel: () => set({ travel: null }),
      setHypo: (h) => set((st) => ({ hypo: { ...st.hypo, ...h } })),
      resetHypo: () => {
        set({ hypo: { sizeMul: 1, rotMul: 1, orbitMul: 1, noMoon: false } });
        get().toast("Simulation parameters restored", "info");
      },
      setSetting: (k, v) =>
        set((st) => {
          const settings = { ...st.settings, [k]: v };
          audio.setEnabled(settings.sound);
          audio.setVolume(settings.volume);
          return { settings };
        }),
      setLoaded: () => set({ loaded: true }),
      setLoad: (phase, label) => set({ loadPhase: phase, loadLabel: label }),
      dismissWelcome: () => set({ welcomeDismissed: true }),
      completeMission: (id, label) => {
        if (get().missionsDone.includes(id)) return;
        set((st) => ({ missionsDone: [...st.missionsDone, id] }));
        audio.playSuccess();
        get().toast(`Mission complete — ${label}`, "success");
      },
      toast: (text, kind = "info") => {
        const id = ++toastId;
        set((st) => ({ toasts: [...st.toasts.slice(-2), { id, text, kind }] }));
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
      setCinematic: (c) => set({ cinematic: c, panel: null, searchOpen: false }),
      setIntroDone: () => set({ introDone: true }),
      setFps: (f) => set({ fps: f }),
    }),
    {
      name: "helios-store-v1",
      partialize: (st) => ({
        settings: st.settings,
        welcomeDismissed: st.welcomeDismissed,
        missionsDone: st.missionsDone,
        scaleMode: st.scaleMode,
        showOrbits: st.showOrbits,
        showMoonOrbits: st.showMoonOrbits,
        showLabels: st.showLabels,
        showMoons: st.showMoons,
        showAsteroids: st.showAsteroids,
        showSpacecraft: st.showSpacecraft,
        showComets: st.showComets,
      }),
    }
  )
);

export function orbitVisibleFor(st: HeliosState, id: string): boolean {
  const override = st.orbitOverrides[id];
  return override === undefined ? st.showOrbits : override;
}

/** Low-frequency clock hook for UI date/time displays (4 Hz). */
export function useSimNow(): number {
  const [now, setNow] = useState(simClock.t);
  useEffect(() => {
    const iv = setInterval(() => setNow(simClock.t), 250);
    return () => clearInterval(iv);
  }, []);
  return now;
}

/* --------------------- animated number counter hook --------------------- */
export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
