import { useEffect, useRef, useState } from "react";
import { SceneCanvas, requestOverview } from "./three/Scene";
import {
  TopBar, LeftNav, TimeBar, Hud, LoadingScreen, WelcomeOverlay, Toasts,
  SearchOverlay, CinematicOverlay, Fallback2D, MobileModeBar,
} from "./ui/Chrome";
import { PanelsDock } from "./ui/Modals";
import { useStore } from "./store";
import { QUALITY } from "./sim";
import { setTextureSize, preloadBodyTextures, getTexture, ALL_BODY_TEX_KEYS } from "./textures";
import { initGestureListeners } from "./audioBridge";

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

const tick = (ms = 130) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [webgl] = useState(webglAvailable);
  const loaded = useStore((s) => s.loaded);
  const introDone = useStore((s) => s.introDone);
  const cinematic = useStore((s) => s.cinematic);
  const welcomeDismissed = useStore((s) => s.welcomeDismissed);
  const reducedMotion = useStore((s) => s.settings.reducedMotion);
  const booted = useRef(false);

  /* ----------------------- boot: real staged loading ---------------------- */
  useEffect(() => {
    if (booted.current || !webgl) return;
    booted.current = true;
    initGestureListeners();
    let cancelled = false;
    const st = () => useStore.getState();
    (async () => {
      setTextureSize(QUALITY[st().settings.quality].tex);
      st().setLoad(0, "Loading textures");
      await tick(180);
      if (cancelled) return;
      preloadBodyTextures(ALL_BODY_TEX_KEYS.slice(0, 7));
      st().setLoad(1, "Building planetary system");
      await tick(160);
      if (cancelled) return;
      preloadBodyTextures(ALL_BODY_TEX_KEYS.slice(7, 15));
      st().setLoad(2, "Generating asteroid field");
      await tick(160);
      if (cancelled) return;
      preloadBodyTextures(ALL_BODY_TEX_KEYS.slice(15));
      getTexture("ring-saturn");
      getTexture("ring-uranus");
      st().setLoad(3, "Initializing simulation");
      await tick(220);
      if (cancelled) return;
      getTexture("glow-sun");
      getTexture("glow-soft");
      getTexture("glow-cyan");
      getTexture("star-sprite");
      st().setLoad(4, "Preparing navigation");
      await tick(240);
      if (cancelled) return;
      st().setLoad(5, "Ready");
      await tick(260);
      if (cancelled) return;
      st().setLoaded();
      // auto-focus Earth after the intro sweep
      setTimeout(() => {
        const s = useStore.getState();
        if (!s.selected && !s.cinematic) s.select("earth");
      }, 1500);
    })();
    return () => {
      cancelled = true;
    };
  }, [webgl]);

  /* skip welcome automatically for returning visitors */
  useEffect(() => {
    if (loaded && welcomeDismissed && !introDone) useStore.getState().setIntroDone();
  }, [loaded, welcomeDismissed, introDone]);

  /* --------------------------- mission watcher --------------------------- */
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const done = state.missionsDone;
      const finish = (id: string, label: string) => {
        if (!done.includes(id)) useStore.getState().completeMission(id, label);
      };
      if (state.selected === "earth") finish("m1", "Homecoming");
      if (state.selected === "ganymede") finish("m2", "Giant's Companion");
      if (state.selected === "saturn") finish("m3", "Lord of the Rings");
      if (state.selected === "ceres") finish("m4", "Rubble Field");
      if (state.travel && state.travel.from === "earth" && state.travel.to === "mars") finish("m5", "The Crossing");
      if (state.eclipse === "lunar") finish("m6", "Blood Moon");
      if (state.compareIds.includes("earth") && state.compareIds.includes("mars")) finish("m7", "Twin Study");
      if (state.selected === "voyager1") finish("m8", "Interstellar");
    });
    return unsub;
  }, []);

  /* --------------------------- keyboard shortcuts ------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = useStore.getState();
      switch (e.key) {
        case " ":
          e.preventDefault();
          st.togglePlay();
          break;
        case "r":
        case "R":
          st.select(null, false);
          requestOverview();
          break;
        case "f":
        case "F":
          if (st.selected) st.select(st.selected);
          break;
        case "Escape":
          if (st.searchOpen) st.setSearchOpen(false);
          else if (st.cinematic) st.setCinematic(false);
          else if (st.panel) st.setPanel(null);
          else if (st.eclipse) st.setEclipse(null);
          else if (st.selected) st.select(null, false);
          break;
        case "/":
          e.preventDefault();
          st.setSearchOpen(true);
          break;
        case "+":
        case "=": {
          const presets = [0.1, 1, 10, 100, 1000, 10000, 100000];
          const idx = presets.indexOf(Math.abs(st.speed));
          const next = presets[Math.min(presets.length - 1, idx + 1)] ?? Math.abs(st.speed) * 10;
          st.setSpeed(st.speed < 0 ? -next : next);
          break;
        }
        case "-":
        case "_": {
          const presets = [0.1, 1, 10, 100, 1000, 10000, 100000];
          const idx = presets.indexOf(Math.abs(st.speed));
          const prev = idx > 0 ? presets[idx - 1] : Math.max(0.01, Math.abs(st.speed) / 10);
          st.setSpeed(st.speed < 0 ? -prev : prev);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!webgl) return <Fallback2D />;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#030612] text-slate-100 ${reducedMotion ? "reduced-motion" : ""}`}>
      <SceneCanvas />

      {loaded && (
        <>
          {!cinematic && (
            <>
              <TopBar />
              <LeftNav />
              <TimeBar />
              <Hud />
              <MobileModeBar />
            </>
          )}
          {!cinematic && <PanelsDock />}
          <SearchOverlay />
          <CinematicOverlay />
          <Toasts />
          {loaded && !introDone && <WelcomeOverlay />}
        </>
      )}
      <LoadingScreen />
    </div>
  );
}
