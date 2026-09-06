import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Settings, Play, Pause, StepBack, StepForward, RotateCcw, X, Volume2, VolumeX,
  Check, Compass, Film, ArrowLeftRight, Eye, Crosshair, Rocket, Orbit, CircleDot,
  ChevronDown, FlaskConical, BookOpen, Target,
} from "lucide-react";
import { useStore, useSimNow } from "../store";
import { formatSimDate, formatSpeed, simClock, type ScaleMode } from "../sim";
import { BODIES, BODY_BY_ID, type BodyType } from "../data";
import { requestOverview } from "../three/Scene";
import { audioUnlockOnce } from "../audioBridge";

/* ------------------------------ small parts ------------------------------ */

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <circle cx="13" cy="13" r="4.2" fill="#ffb84d" />
        <circle cx="13" cy="13" r="4.2" fill="url(#lg)" opacity="0.7" />
        <ellipse cx="13" cy="13" rx="11" ry="5.5" stroke="#5ee6ff" strokeWidth="1" opacity="0.8" transform="rotate(-18 13 13)" />
        <circle cx="22.2" cy="8.6" r="1.6" fill="#5ee6ff" />
        <defs>
          <radialGradient id="lg"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#ff8a00" /></radialGradient>
        </defs>
      </svg>
      <div className="leading-none">
        <div className="font-display text-[15px] font-800 tracking-[0.28em] text-white" style={{ fontWeight: 800 }}>HELIOS</div>
        <div className="text-[8.5px] tracking-[0.3em] text-cyan-200/60 font-mono mt-0.5">SOLAR SYSTEM EXPLORER</div>
      </div>
    </div>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-tip={label}
      onClick={onClick}
      className={`relative w-8 h-[17px] rounded-full transition-colors ring-focus ${on ? "bg-cyan-400/80" : "bg-slate-600/50"}`}
    >
      <span className={`absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white transition-all ${on ? "left-[17px]" : "left-[2px]"}`} />
    </button>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-toast glass pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[12.5px] ${
            t.kind === "success" ? "border-emerald-300/40" : "border-cyan-300/30"
          }`}
        >
          {t.kind === "success" ? (
            <Check size={15} className="text-emerald-300" />
          ) : (
            <Rocket size={15} className="text-cyan-300" />
          )}
          <span className="tracking-wide text-slate-100">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white ml-1 ring-focus" aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- top bar -------------------------------- */

const MODES: { id: string; label: string; icon: typeof Compass }[] = [
  { id: "explore", label: "EXPLORE", icon: Compass },
  { id: "learn", label: "LEARN", icon: BookOpen },
  { id: "simulate", label: "SIMULATE", icon: FlaskConical },
  { id: "cinematic", label: "CINEMATIC", icon: Film },
];

export function TopBar() {
  const st = useStore();
  const Icon = st.settings.sound ? Volume2 : VolumeX;
  return (
    <header
      className="absolute top-0 inset-x-0 z-[60] flex items-center gap-3 px-3 md:px-5 h-14 glass-soft hairline-b"
      style={{ opacity: st.settings.uiOpacity }}
    >
      <Logo />
      <button
        onClick={() => { st.setSearchOpen(true); audioUnlockOnce(); }}
        className="hidden sm:flex items-center gap-2 ml-4 px-3 h-9 w-56 lg:w-72 rounded-lg border border-[rgba(126,178,255,0.18)] bg-[rgba(8,16,36,0.5)] text-slate-400 text-[12.5px] hover:border-cyan-300/50 transition-colors ring-focus"
        aria-label="Search celestial objects"
      >
        <Search size={14} />
        <span>Search planets, moons, missions…</span>
        <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-600/60 text-slate-500">/</kbd>
      </button>
      <button onClick={() => { st.setSearchOpen(true); audioUnlockOnce(); }} className="sm:hidden icon-btn ml-2" aria-label="Search">
        <Search size={16} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <nav className="hidden md:flex items-center gap-1 mr-2 p-1 rounded-xl border border-[rgba(126,178,255,0.14)] bg-[rgba(6,12,28,0.5)]" aria-label="Application mode">
          {MODES.map((m) => {
            const active = m.id === "cinematic" ? st.cinematic : st.mode === m.id && !st.cinematic;
            const I = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  audioUnlockOnce();
                  if (m.id === "cinematic") st.setCinematic(!st.cinematic);
                  else {
                    st.setCinematic(false);
                    st.setMode(m.id as "explore" | "learn" | "simulate");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-[10px] tracking-[0.14em] transition-all ring-focus ${
                  active ? "bg-cyan-400/90 text-slate-950 shadow-[0_0_16px_rgba(94,230,255,0.4)]" : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
                aria-pressed={active}
              >
                <I size={13} /> {m.label}
              </button>
            );
          })}
        </nav>
        <button
          className="icon-btn"
          data-tip={st.settings.sound ? "Mute audio" : "Enable ambient audio"}
          onClick={() => { audioUnlockOnce(); st.setSetting("sound", !st.settings.sound); }}
          aria-label="Toggle sound"
        >
          <Icon size={16} />
        </button>
        <button className="icon-btn" data-tip="Settings" onClick={() => st.setPanel("settings")} aria-label="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------ search panel ----------------------------- */

export function SearchOverlay() {
  const st = useStore();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const match = (name: string) => !query || name.toLowerCase().includes(query);
    const order: [string, BodyType[]][] = [
      ["PLANETS", ["star", "planet", "dwarf"]],
      ["MOONS", ["moon"]],
      ["COMETS", ["comet"]],
      ["SPACECRAFT", ["spacecraft"]],
    ];
    return order
      .map(([label, types]) => ({ label, items: BODIES.filter((b) => types.includes(b.type) && match(b.name)) }))
      .filter((g) => g.items.length > 0 && (query ? true : g.label !== "SPACECRAFT" || true));
  }, [q]);

  if (!st.searchOpen) return null;
  return (
    <div className="absolute inset-0 z-[70] bg-black/55 backdrop-blur-[3px] anim-fade flex items-start justify-center pt-[9vh] px-4" onClick={() => st.setSearchOpen(false)}>
      <div className="glass rounded-2xl w-full max-w-lg anim-rise overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <div className="flex items-center gap-3 px-4 h-13 py-3 hairline-b">
          <Search size={16} className="text-cyan-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") st.setSearchOpen(false); }}
            placeholder="Search Earth, Titan, Voyager, comets…"
            className="flex-1 bg-transparent outline-none text-[14px] text-slate-100 placeholder:text-slate-500"
            aria-label="Search query"
          />
          <kbd className="font-mono text-[10px] text-slate-500 border border-slate-600/50 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {groups.map((g) => (
            <div key={g.label} className="mb-1.5">
              <div className="font-display text-[9px] tracking-[0.28em] text-cyan-300/70 px-2.5 pt-2 pb-1">{g.label}</div>
              {g.items.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { st.select(b.id); st.setSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-cyan-400/10 text-left transition-colors ring-focus"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                  <span className="text-[13px] text-slate-100">{b.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-slate-500">{b.distLabel}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.every((g) => g.items.length === 0) && (
            <div className="px-3 py-8 text-center text-slate-500 text-[13px]">No objects match “{q}”</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- left nav ------------------------------- */

const NAV_GROUPS: { label: string; ids: string[] }[] = [
  { label: "STAR", ids: ["sun"] },
  { label: "PLANETS", ids: ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"] },
  { label: "DWARF PLANETS", ids: ["pluto", "ceres"] },
  { label: "NOTABLE MOONS", ids: ["moon", "io", "europa", "ganymede", "titan", "enceladus", "triton"] },
  { label: "COMETS", ids: ["halley", "halebopp"] },
  { label: "SPACECRAFT", ids: ["voyager1", "voyager2", "newhorizons", "cassini", "juno", "parker"] },
];

export function LeftNav() {
  const st = useStore();
  const [open, setOpen] = useState(() => window.innerWidth >= 820);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return (
    <aside
      className="absolute left-3 top-16 bottom-[92px] z-[55] flex flex-col gap-2 pointer-events-none"
      style={{ opacity: st.settings.uiOpacity }}
      aria-label="Navigation"
    >
      {!open ? (
        <button className="icon-btn pointer-events-auto" data-tip="Open navigation" onClick={() => setOpen(true)} aria-label="Open navigation">
          <ChevronDown size={16} className="rotate-90" />
        </button>
      ) : (
        <div className="glass rounded-2xl w-[196px] flex-1 min-h-0 flex flex-col pointer-events-auto anim-left">
          <div className="flex items-center justify-between px-3.5 h-10 hairline-b shrink-0">
            <span className="font-display text-[10px] tracking-[0.24em] text-slate-300">NAVIGATION</span>
            <button className="icon-btn !w-7 !h-7" onClick={() => setOpen(false)} aria-label="Collapse navigation" data-tip="Collapse">
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <button
              onClick={() => { st.select(null, false); requestOverview(); }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ring-focus ${!st.selected ? "bg-cyan-400/15 text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              <Orbit size={14} className="text-cyan-300" />
              <span className="text-[12.5px] tracking-wide">System overview</span>
            </button>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="mt-2">
                <button
                  className="w-full flex items-center justify-between px-2.5 py-1 ring-focus rounded"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                  aria-expanded={!collapsed[g.label]}
                >
                  <span className="font-display text-[8.5px] tracking-[0.24em] text-cyan-300/60">{g.label}</span>
                  <ChevronDown size={11} className={`text-slate-500 transition-transform ${collapsed[g.label] ? "-rotate-90" : ""}`} />
                </button>
                {!collapsed[g.label] &&
                  g.ids.map((id) => {
                    const b = BODY_BY_ID[id];
                    const active = st.selected === id;
                    return (
                      <button
                        key={id}
                        onClick={() => st.select(id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-[5.5px] rounded-lg text-left transition-all ring-focus ${active ? "bg-cyan-400/15 text-white translate-x-0.5" : "text-slate-400 hover:text-slate-100 hover:bg-white/5"}`}
                        aria-current={active}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color, boxShadow: active ? `0 0 8px ${b.color}` : "none" }} />
                        <span className="text-[12.5px]">{b.name}</span>
                        {active && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-300 blink" />}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
          <div className="hairline-t px-3.5 py-2.5 shrink-0 space-y-[7px]">
            <NavToggle label="Orbit paths" icon={<Orbit size={13} />} on={st.showOrbits} onClick={() => st.toggle("showOrbits")} />
            <NavToggle label="Labels" icon={<Eye size={13} />} on={st.showLabels} onClick={() => st.toggle("showLabels")} />
            <NavToggle label="Moon orbits" icon={<Target size={13} />} on={st.showMoonOrbits} onClick={() => st.toggle("showMoonOrbits")} />
            <NavToggle label="Asteroid belt" icon={<CircleDot size={13} />} on={st.showAsteroids} onClick={() => st.toggle("showAsteroids")} />
            <NavToggle label="Spacecraft" icon={<Rocket size={13} />} on={st.showSpacecraft} onClick={() => st.toggle("showSpacecraft")} />
            <NavToggle label="Comets" icon={<ArrowLeftRight size={13} />} on={st.showComets} onClick={() => st.toggle("showComets")} />
          </div>
        </div>
      )}
    </aside>
  );
}

function NavToggle({ label, icon, on, onClick }: { label: string; icon: React.ReactNode; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-[11.5px] text-slate-400">{icon}{label}</span>
      <Switch on={on} onClick={onClick} label={`Toggle ${label.toLowerCase()}`} />
    </div>
  );
}

/* ------------------------------ bottom bar ------------------------------- */

const SPEEDS = [0.1, 1, 10, 100, 1000, 10000, 100000];

export function TimeBar() {
  const st = useStore();
  const now = useSimNow();
  const { date, time } = formatSimDate(now);
  const [custom, setCustom] = useState("");
  const dateStr = new Date(now).toISOString().slice(0, 10);

  const applyCustom = () => {
    const v = parseFloat(custom);
    if (isFinite(v) && v !== 0 && Math.abs(v) <= 1e7) {
      st.setSpeed(v);
      setCustom("");
    }
  };

  return (
    <footer
      className="absolute bottom-0 inset-x-0 z-[55] px-2 md:px-4 pb-2 md:pb-3"
      style={{ opacity: st.settings.uiOpacity }}
      aria-label="Simulation controls"
    >
      <div className="glass rounded-2xl px-3 md:px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 max-w-[1080px] mx-auto">
        {/* transport */}
        <div className="flex items-center gap-1">
          <button className="icon-btn" data-tip="Step back 1 day" onClick={() => st.step(-1)} aria-label="Step back one day"><StepBack size={15} /></button>
          <button
            className="icon-btn !w-10 !h-10 active"
            data-tip={st.playing ? "Pause simulation (Space)" : "Play simulation (Space)"}
            onClick={() => st.togglePlay()}
            aria-label={st.playing ? "Pause" : "Play"}
          >
            {st.playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>
          <button className="icon-btn" data-tip="Step forward 1 day" onClick={() => st.step(1)} aria-label="Step forward one day"><StepForward size={15} /></button>
          <button
            className={`icon-btn ${st.speed < 0 ? "!text-amber-300 !border-amber-300/50" : ""}`}
            data-tip="Reverse time direction"
            onClick={() => st.reverse()}
            aria-label="Reverse time"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* speed */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-display text-[8.5px] tracking-[0.22em] text-slate-500 mr-1">SPEED</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => st.setSpeed(st.speed < 0 ? -s : s)}
              className={`px-2 py-1 rounded-md font-mono text-[10.5px] transition-all ring-focus ${
                Math.abs(st.speed) === s ? "bg-cyan-400/90 text-slate-950 font-semibold" : "text-slate-400 hover:text-white border border-transparent hover:border-cyan-300/30"
              }`}
              data-tip={`${s.toLocaleString("en-US")} simulated days per second`}
            >
              {s >= 1000 ? `${s / 1000}k` : s}×
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              placeholder="custom"
              className="field !w-[70px] !py-1 !text-[11px]"
              aria-label="Custom time multiplier"
              data-tip="Type a custom multiplier, press Enter"
            />
            <span className="text-slate-500 font-mono text-[11px]">×</span>
          </div>
        </div>

        {/* date */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div className="text-right leading-tight hidden sm:block">
            <div className="font-display text-[9px] tracking-[0.22em] text-cyan-300/80">SIMULATION DATE</div>
            <div className="text-[13px] text-slate-100 font-medium">{date} · <span className="font-mono text-[11px] text-slate-400">{time}</span></div>
          </div>
          <div className="text-right leading-tight sm:hidden">
            <div className="text-[11px] text-slate-200 font-mono">{date}</div>
          </div>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => {
              if (e.target.value) st.setDate(new Date(e.target.value + "T12:00:00").getTime());
            }}
            className="field"
            aria-label="Jump to date"
            data-tip="Jump simulation to a date"
          />
          <button className="btn" data-tip="Reset to today's date" onClick={() => st.resetDate()}>TODAY</button>
        </div>
      </div>
      <p className="text-center text-[9.5px] text-slate-600 mt-1.5 font-mono tracking-wide pointer-events-none">
        Visualization uses simplified parameters for interactive educational purposes · not ephemeris-precise
      </p>
    </footer>
  );
}

/* ---------------------------------- HUD ---------------------------------- */

export function Hud() {
  const st = useStore();
  const selected = st.selected ? BODY_BY_ID[st.selected] : null;
  return (
    <>
      {/* selected object chip — top left */}
      {selected && !st.cinematic && (
        <div className="absolute top-16 left-3 md:left-[230px] z-[50] anim-left" style={{ opacity: st.settings.uiOpacity }}>
          <div className="glass rounded-xl px-3.5 py-2 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: selected.color, boxShadow: `0 0 10px ${selected.color}` }} />
            <div className="leading-tight">
              <div className="font-display text-[11px] tracking-[0.2em] text-white">{selected.name.toUpperCase()}</div>
              <div className="font-mono text-[9.5px] text-slate-400">{selected.type.toUpperCase()} · {selected.distLabel}</div>
            </div>
          </div>
        </div>
      )}
      {/* scale indicator — top center */}
      {!st.cinematic && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[45] pointer-events-none" style={{ opacity: st.settings.uiOpacity }}>
          <div className="glass-soft rounded-full px-3.5 py-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 blink" />
            <span className="font-display text-[8.5px] tracking-[0.26em] text-cyan-200/90">{st.scaleMode.toUpperCase()} SCALE</span>
          </div>
        </div>
      )}
      {/* camera controls — bottom left */}
      {!st.cinematic && st.settings.showHUD && (
        <div className="absolute left-3 bottom-[118px] z-[50] flex flex-col gap-1.5" style={{ opacity: st.settings.uiOpacity }}>
          <button className="icon-btn" data-tip="Reset camera — system overview (R)" aria-label="Reset camera" onClick={() => { st.select(null, false); requestOverview(); }}>
            <Orbit size={15} />
          </button>
          <button
            className="icon-btn"
            data-tip="Focus selected object (F)"
            aria-label="Focus selected object"
            onClick={() => { if (st.selected) st.select(st.selected); }}
          >
            <Crosshair size={15} />
          </button>
          <button
            className={`icon-btn ${st.follow ? "active" : ""}`}
            data-tip={st.follow ? "Stop following" : "Follow selected object"}
            aria-label="Toggle follow"
            onClick={() => {
              if (st.selected) {
                st.setFollow(!st.follow);
                if (!st.follow) st.select(st.selected);
              }
            }}
          >
            <Eye size={15} />
          </button>
        </div>
      )}
      {/* FPS + coords — bottom right */}
      {!st.cinematic && st.settings.showHUD && (
        <div className="absolute right-3 bottom-[118px] z-[50] font-mono text-[9.5px] text-slate-500 text-right leading-relaxed pointer-events-none" style={{ opacity: st.settings.uiOpacity }}>
          <div><span className={st.fps > 45 ? "text-emerald-400/80" : "text-amber-400/80"}>{st.fps}</span> FPS</div>
          <div>{formatSpeed(simClock.speed)} · {st.playing ? "RUNNING" : "PAUSED"}</div>
        </div>
      )}
    </>
  );
}

/* --------------------------- cinematic overlay --------------------------- */

export function CinematicOverlay() {
  const st = useStore();
  if (!st.cinematic) return null;
  const sel = st.selected ? BODY_BY_ID[st.selected] : null;
  return (
    <div className="absolute inset-x-0 bottom-10 z-[65] flex flex-col items-center gap-3 pointer-events-none anim-fade">
      <div className="font-display text-[10px] tracking-[0.5em] text-cyan-200/70">CINEMATIC MODE</div>
      <div className="font-display text-[22px] md:text-[30px] tracking-[0.3em] text-white text-glow-soft">
        {sel ? sel.name.toUpperCase() : "TOURING THE SYSTEM"}
      </div>
      <button className="btn btn-danger pointer-events-auto" onClick={() => st.setCinematic(false)}>
        <X size={13} /> EXIT CINEMATIC MODE
      </button>
    </div>
  );
}

/* ------------------------------ loading screen --------------------------- */

const LOAD_STEPS = [
  "Loading textures",
  "Building planetary system",
  "Generating asteroid field",
  "Initializing simulation",
  "Preparing navigation",
];

export function LoadingScreen() {
  const phase = useStore((s) => s.loadPhase);
  const label = useStore((s) => s.loadLabel);
  const loaded = useStore((s) => s.loaded);
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (loaded) {
      const t1 = setTimeout(() => setFading(true), 350);
      const t2 = setTimeout(() => setGone(true), 1050);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [loaded]);
  if (gone) return null;
  const pct = Math.round(clampPct(phase));
  return (
    <div
      className="absolute inset-0 z-[100] bg-[#030612] scanlines flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700"
      style={{ opacity: fading ? 0 : 1, pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(28,58,138,0.28), transparent 70%), radial-gradient(ellipse 40% 30% at 70% 70%, rgba(90,40,140,0.16), transparent 70%)" }} />
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full" style={{ background: "radial-gradient(circle at 38% 34%, #fff3c4, #ffb84d 45%, #ff7a00 78%, #b34700)", boxShadow: "0 0 70px rgba(255,160,60,0.55), 0 0 160px rgba(255,120,30,0.25)", animation: "pulseGlow 3s ease infinite" }} />
        <div className="absolute -inset-5 rounded-full border border-cyan-300/25" style={{ animation: "spinSlow 7s linear infinite", borderStyle: "dashed" }} />
        <div className="absolute -inset-11 rounded-full border border-cyan-300/10" style={{ animation: "spinSlowR 13s linear infinite", borderStyle: "dotted" }} />
        <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#5ee6ff]" style={{ animation: "spinSlow 7s linear infinite", transformOrigin: "50% calc(50% + 3.4rem)" }} />
      </div>
      <div className="relative font-display text-[15px] md:text-[18px] tracking-[0.5em] text-white mb-2">INITIALIZING SOLAR SYSTEM</div>
      <div className="relative font-mono text-[11px] text-cyan-200/70 tracking-[0.2em] mb-7 h-4">{label.toUpperCase()}</div>
      <div className="relative w-64 md:w-80">
        <div className="h-[3px] rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(94,230,255,0.7)" }} />
        </div>
        <div className="mt-4 space-y-1.5">
          {LOAD_STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-2.5 text-[11px] transition-colors ${i < phase ? "text-emerald-300/90" : i === phase ? "text-cyan-200" : "text-slate-600"}`}>
              {i < phase ? <Check size={11} /> : i === phase ? <span className="w-[11px] h-[11px] rounded-full border border-cyan-300 border-t-transparent animate-spin" /> : <span className="w-[11px] h-[11px] rounded-full border border-slate-700" />}
              <span className="font-mono tracking-wide">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function clampPct(p: number) { return Math.min(100, (p / LOAD_STEPS.length) * 100); }

/* ------------------------------ welcome panel ---------------------------- */

export function WelcomeOverlay() {
  const st = useStore();
  const [dontShow, setDontShow] = useState(false);
  const close = (mode?: "explore" | "learn" | "simulate") => {
    if (mode) {
      st.setCinematic(false);
      st.setMode(mode);
      if (mode === "explore") st.select("earth");
    }
    if (dontShow) st.dismissWelcome();
    st.setIntroDone();
  };
  return (
    <div className="absolute inset-0 z-[75] bg-black/45 backdrop-blur-[2px] flex items-center justify-center px-4 anim-fade">
      <div className="glass rounded-2xl max-w-md w-full p-7 anim-rise relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-25" style={{ background: "radial-gradient(circle, #5ee6ff, transparent 70%)" }} />
        <div className="font-display text-[9px] tracking-[0.4em] text-cyan-300/80 mb-3">MISSION BRIEFING</div>
        <h1 className="font-display text-[24px] leading-tight tracking-[0.12em] text-white mb-3">
          WELCOME TO THE<br /><span className="text-cyan-300 glow-cyan">SOLAR SYSTEM</span>
        </h1>
        <p className="text-[13.5px] text-slate-300 leading-relaxed mb-6">
          Explore planets, moons, asteroids and spacecraft in an interactive 3D simulation.
          Fly past Saturn's rings, chase comets, plan a transfer to Mars, or simply watch Earth turn beneath you.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <button className="btn btn-primary !py-3 flex-col !gap-1.5" onClick={() => close("explore")}>
            <Compass size={17} /> EXPLORE
          </button>
          <button className="btn !py-3 flex-col !gap-1.5" onClick={() => close("learn")}>
            <BookOpen size={17} /> LEARN
          </button>
          <button className="btn !py-3 flex-col !gap-1.5" onClick={() => close("simulate")}>
            <FlaskConical size={17} /> SIMULATE
          </button>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11.5px] text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="accent-cyan-400" />
            Don't show again
          </label>
          <button className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 ring-focus" onClick={() => close()}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- 2D fallback mode -------------------------- */

export function Fallback2D() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    const planets = BODIES.filter((b) => b.type === "planet" || b.type === "dwarf" || b.type === "star");
    const draw = () => {
      const w = (cv.width = cv.clientWidth * devicePixelRatio);
      const h = (cv.height = cv.clientHeight * devicePixelRatio);
      ctx.fillStyle = "#030612";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const unit = Math.min(w, h) / 76;
      const days = simClock.t / 86400000 - 10957;
      for (const p of planets) {
        if (p.a > 0) {
          const r = Math.sqrt(p.a) * 10 * unit;
          ctx.strokeStyle = "rgba(120,170,255,0.16)";
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
          const ang = (days / p.periodDays) * Math.PI * 2 + p.L0;
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r * 0.42;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2.5, unit * 0.42), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(200,225,255,0.75)";
          ctx.font = `${9 * devicePixelRatio}px monospace`;
          ctx.fillText(p.name.toUpperCase(), x + 6 * devicePixelRatio, y - 4 * devicePixelRatio);
        } else {
          ctx.fillStyle = "#ffb84d";
          ctx.beginPath();
          ctx.arc(cx, cy, unit * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (simClock.playing) simClock.t += 16.7 * simClock.speed * 1000;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="absolute inset-0 bg-[#030612] flex flex-col">
      <div className="p-5">
        <Logo />
        <p className="mt-3 text-[13px] text-slate-300 max-w-xl">
          WebGL is not available in this browser, so HELIOS is running in a <strong>simplified 2D mode</strong> (top-down schematic, not to scale).
          Try a hardware-accelerated browser for the full 3D experience.
        </p>
      </div>
      <canvas ref={ref} className="flex-1 w-full" />
    </div>
  );
}

/* --------------------------- mobile mode switch -------------------------- */

export function MobileModeBar() {
  const st = useStore();
  return (
    <div className="md:hidden absolute top-16 right-3 z-[56] flex flex-col gap-1.5" style={{ opacity: st.settings.uiOpacity }}>
      {MODES.slice(0, 3).map((m) => {
        const I = m.icon;
        const active = st.mode === m.id && !st.cinematic;
        return (
          <button key={m.id} className={`icon-btn ${active ? "active" : ""}`} aria-label={m.label} data-tip={m.label}
            onClick={() => { st.setCinematic(false); st.setMode(m.id as "explore" | "learn" | "simulate"); }}>
            <I size={15} />
          </button>
        );
      })}
      <button className={`icon-btn ${st.cinematic ? "active" : ""}`} aria-label="Cinematic mode" data-tip="Cinematic mode" onClick={() => st.setCinematic(!st.cinematic)}>
        <Film size={15} />
      </button>
    </div>
  );
}
