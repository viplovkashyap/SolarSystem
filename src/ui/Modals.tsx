import { useState } from "react";
import { X, ArrowLeftRight, Check, Play, Rocket, Sun, Moon as MoonIcon, FlaskConical, RotateCcw } from "lucide-react";
import { useStore, useSimNow } from "../store";
import { simDays, bodyPositionAU, AU_KM, type ScaleMode, type Quality } from "../sim";

/** low-frequency re-render tick for live progress bars */
function useNowTick() {
  useSimNow();
}
import { BODY_BY_ID, MISSIONS, LEARN_TOPICS, PLANETS } from "../data";
import { InfoPanel } from "./InfoPanel";

/* ------------------------------ numeric maps ----------------------------- */

const MASS_24: Record<string, number> = {
  sun: 1989000, mercury: 0.33, venus: 4.87, earth: 5.97, mars: 0.642, jupiter: 1898,
  saturn: 568, uranus: 86.8, neptune: 102, pluto: 0.013, ceres: 0.000938,
};
const TEMP_K: Record<string, number> = {
  sun: 5778, mercury: 440, venus: 737, earth: 288, mars: 210, jupiter: 165,
  saturn: 134, uranus: 76, neptune: 72, pluto: 44, ceres: 167,
};
const MU_SUN = 1.32712440018e20;

const num = (s: string) => {
  const m = s.replace(/[^\d.]/g, "");
  return parseFloat(m) || 0;
};

/* ------------------------------ compare panel ---------------------------- */

const METRICS: { label: string; unit: string; get: (id: string) => number; fmt: (v: number) => string }[] = [
  { label: "DIAMETER", unit: "km", get: (id) => BODY_BY_ID[id].radiusKm * 2, fmt: (v) => Math.round(v).toLocaleString("en-US") },
  { label: "MASS", unit: "×10²⁴ kg", get: (id) => MASS_24[id] ?? 0, fmt: (v) => (v >= 100 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toPrecision(3)) },
  { label: "GRAVITY", unit: "m/s²", get: (id) => num(BODY_BY_ID[id].gravityLabel), fmt: (v) => v.toFixed(2) },
  { label: "DIST FROM SUN", unit: "AU", get: (id) => BODY_BY_ID[id].a, fmt: (v) => v.toFixed(2) },
  { label: "DAY LENGTH", unit: "hours", get: (id) => Math.abs(BODY_BY_ID[id].rotationHours), fmt: (v) => v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1) },
  { label: "YEAR LENGTH", unit: "days", get: (id) => BODY_BY_ID[id].periodDays, fmt: (v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
  { label: "AVG TEMP", unit: "K", get: (id) => TEMP_K[id] ?? 0, fmt: (v) => Math.round(v).toLocaleString() },
  { label: "MOONS", unit: "", get: (id) => BODY_BY_ID[id].moonCount, fmt: (v) => String(v) },
];

export function ComparePanel() {
  const st = useStore();
  const ids = st.compareIds;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Select up to three worlds to compare their physical properties side by side.
        </p>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {PLANETS.map((p) => {
            const on = ids.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => st.toggleCompare(p.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] font-display tracking-wider transition-all ring-focus ${
                  on ? "bg-cyan-400/20 text-cyan-100 border border-cyan-300/50" : "border border-[rgba(126,178,255,0.16)] text-slate-400 hover:text-white"
                }`}
                aria-pressed={on}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                {p.name.toUpperCase()}
                {on && <X size={10} />}
              </button>
            );
          })}
        </div>
        {!ids.includes("earth") && !ids.includes("mars") && ids.length < 2 && (
          <button className="btn !text-[9px] mt-2" onClick={() => { st.toggleCompare("earth"); if (!st.compareIds.includes("mars")) st.toggleCompare("mars"); }}>
            <ArrowLeftRight size={11} /> QUICK: EARTH vs MARS
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {ids.length === 0 && (
          <div className="text-center text-slate-500 text-[12.5px] py-10">Nothing to compare yet — pick two worlds above.</div>
        )}
        {ids.length > 0 && (
          <div key={ids.join("-")} className="space-y-3.5">
            {/* header row */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${ids.length}, 1fr)` }}>
              {ids.map((id) => (
                <div key={id} className="text-center">
                  <span className="w-6 h-6 mx-auto rounded-full block mb-1" style={{ background: `radial-gradient(circle at 35% 30%, #fff6, ${BODY_BY_ID[id].color})`, boxShadow: `0 0 16px ${BODY_BY_ID[id].color}66` }} />
                  <div className="font-display text-[10px] tracking-[0.18em] text-white">{BODY_BY_ID[id].name.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {METRICS.map((m) => {
              const vals = ids.map((id) => m.get(id));
              const max = Math.max(...vals, 1e-9);
              return (
                <div key={m.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display text-[8px] tracking-[0.22em] text-slate-500">{m.label}</span>
                    {m.unit && <span className="font-mono text-[8.5px] text-slate-600">{m.unit}</span>}
                  </div>
                  <div className="space-y-1">
                    {ids.map((id, i) => {
                      const v = vals[i];
                      const w = Math.max(2, (Math.log(1 + v) / Math.log(1 + max)) * 100);
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <div className="flex-1 h-[7px] rounded-full bg-[rgba(20,32,64,0.6)] overflow-hidden">
                            <div className="h-full rounded-full bar-grow" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${BODY_BY_ID[id].color}55, ${BODY_BY_ID[id].color})`, animationDelay: `${i * 90}ms` }} />
                          </div>
                          <span className="font-mono text-[10px] text-slate-300 w-[74px] text-right shrink-0">{m.fmt(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="text-[9.5px] text-slate-600 font-mono pt-1">Logarithmic bars · mean values · educational approximation</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ missions panel --------------------------- */

export function MissionsPanel() {
  const st = useStore();
  const done = st.missionsDone;
  const pct = Math.round((done.length / MISSIONS.length) * 100);
  const hint = (id: string) => {
    const s = useStore.getState();
    switch (id) {
      case "m1": s.select("earth"); break;
      case "m2": s.select("ganymede"); if (!s.showMoonOrbits) s.toggle("showMoonOrbits"); break;
      case "m3": s.select("saturn"); break;
      case "m4": s.select("ceres"); break;
      case "m5": s.setPanel("travel"); break;
      case "m6": s.setEclipse("lunar"); s.select("eclipse-earth"); break;
      case "m7": if (!s.compareIds.includes("earth")) s.toggleCompare("earth"); if (!s.compareIds.includes("mars")) s.toggleCompare("mars"); s.setPanel("compare"); break;
      case "m8": s.select("voyager1"); break;
    }
  };
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-display text-[9px] tracking-[0.24em] text-slate-400">CAMPAIGN PROGRESS</span>
          <span className="font-mono text-[10.5px] text-cyan-300">{done.length}/{MISSIONS.length}</span>
        </div>
        <div className="h-[5px] rounded-full bg-[rgba(20,32,64,0.7)] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700" style={{ width: `${pct}%`, boxShadow: "0 0 10px rgba(94,230,255,0.6)" }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {MISSIONS.map((m) => {
          const isDone = done.includes(m.id);
          return (
            <div key={m.id} className={`rounded-xl border p-3 transition-colors ${isDone ? "border-emerald-300/30 bg-emerald-400/5" : "border-[rgba(126,178,255,0.12)] bg-[rgba(8,16,36,0.45)]"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 border ${isDone ? "border-emerald-300 bg-emerald-400/20 text-emerald-300" : "border-slate-600 text-transparent"}`}>
                  <Check size={11} />
                </span>
                <span className={`font-display text-[10px] tracking-[0.16em] ${isDone ? "text-emerald-200" : "text-slate-200"}`}>{m.title.toUpperCase()}</span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1.5 ml-[26px]">{m.objective}</p>
              <div className="flex items-center justify-between mt-2 ml-[26px]">
                <span className="font-mono text-[9px] text-amber-200/70">✦ {m.reward}</span>
                {!isDone && <button className="btn !py-1 !px-2 !text-[8.5px]" onClick={() => hint(m.id)}>HINT</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- learn panel ----------------------------- */

export function LearnPanel() {
  const st = useStore();
  const [open, setOpen] = useState<string | null>(LEARN_TOPICS[0].id);
  const act = (a: NonNullable<(typeof LEARN_TOPICS)[number]["action"]>) => {
    const s = useStore.getState();
    if (a.type === "focus") s.select(a.payload as string);
    else if (a.type === "eclipse") { s.setEclipse(a.payload as "solar" | "lunar"); s.select("eclipse-earth"); }
    else if (a.type === "compare") { const arr = a.payload as string[]; arr.forEach((id) => { if (!s.compareIds.includes(id)) s.toggleCompare(id); }); s.setPanel("compare"); }
    else if (a.type === "travel") { const [f, t] = a.payload as string[]; s.startTravel(f, t); }
  };
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <p className="text-[12px] text-slate-400">Short answers to big questions — each with a place to see it live in the simulation.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {LEARN_TOPICS.map((t) => (
          <div key={t.id} className="rounded-xl border border-[rgba(126,178,255,0.12)] bg-[rgba(8,16,36,0.45)] overflow-hidden">
            <button className="w-full text-left px-3.5 py-2.5 hover:bg-[rgba(16,30,64,0.5)] transition-colors ring-focus" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
              <span className="font-display text-[10.5px] tracking-[0.14em] text-cyan-100">{t.q.toUpperCase()}</span>
            </button>
            {open === t.id && (
              <div className="px-3.5 pb-3 anim-fade">
                <p className="text-[12px] text-slate-300 leading-relaxed">{t.a}</p>
                {t.action && (
                  <button className="btn btn-primary !text-[9px] mt-2.5" onClick={() => act(t.action!)}>
                    <Play size={11} /> {t.action.label.toUpperCase()}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ travel panel ----------------------------- */

const TRAVEL_BODIES = ["earth", "mars", "venus", "mercury", "jupiter", "saturn", "moon"];

export function TravelPanel() {
  const st = useStore();
  useNowTick();
  const [from, setFrom] = useState("earth");
  const [to, setTo] = useState("mars");
  const travel = st.travel;

  const d = simDays();
  const p1 = bodyPositionAU(BODY_BY_ID[from], d);
  const p2 = bodyPositionAU(BODY_BY_ID[to], d);
  const distKm = from === to ? 0 : p1.distanceTo(p2) * AU_KM;

  const aM = ((p1.length() + p2.length()) / 2) * AU_KM * 1000;
  const hohmannDays = from === to ? 0 : (Math.PI * Math.sqrt(Math.pow(aM, 3) / MU_SUN)) / 86400;
  const synodicMonths =
    BODY_BY_ID[from].periodDays > 0 && BODY_BY_ID[to].periodDays > 0 && from !== to
      ? 1 / Math.abs(1 / BODY_BY_ID[from].periodDays - 1 / BODY_BY_ID[to].periodDays) / 30.44
      : 0;

  const progress = travel ? Math.min(1, (performance.now() - travel.startedAt) / 11000) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <p className="text-[12px] text-slate-400">Plan a simplified transfer between two worlds and watch a probe fly the arc.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block">
            <span className="font-display text-[8px] tracking-[0.22em] text-slate-500 block mb-1">FROM</span>
            <select className="field w-full" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Departure body">
              {TRAVEL_BODIES.map((id) => <option key={id} value={id}>{BODY_BY_ID[id].name}</option>)}
            </select>
          </label>
          <ArrowLeftRight size={15} className="text-cyan-300 mb-2.5" />
          <label className="block">
            <span className="font-display text-[8px] tracking-[0.22em] text-slate-500 block mb-1">TO</span>
            <select className="field w-full" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Destination body">
              {TRAVEL_BODIES.filter((id) => id !== from).map((id) => <option key={id} value={id}>{BODY_BY_ID[id].name}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-[rgba(8,16,36,0.55)] border border-[rgba(126,178,255,0.1)] px-2.5 py-2">
            <div className="font-display text-[7.5px] tracking-[0.2em] text-slate-500">CURRENT DISTANCE</div>
            <div className="font-mono text-[13px] text-white mt-0.5">{distKm > 0 ? `${(distKm / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M km` : "—"}</div>
          </div>
          <div className="rounded-lg bg-[rgba(8,16,36,0.55)] border border-[rgba(126,178,255,0.1)] px-2.5 py-2">
            <div className="font-display text-[7.5px] tracking-[0.2em] text-slate-500">HOHMANN TRANSFER</div>
            <div className="font-mono text-[13px] text-white mt-0.5">{hohmannDays > 0 ? `~${Math.round(hohmannDays)} days` : "—"}</div>
          </div>
          <div className="rounded-lg bg-[rgba(8,16,36,0.55)] border border-[rgba(126,178,255,0.1)] px-2.5 py-2 col-span-2">
            <div className="font-display text-[7.5px] tracking-[0.2em] text-slate-500">LAUNCH WINDOW</div>
            <div className="font-mono text-[13px] text-white mt-0.5">{synodicMonths > 0 ? `every ~${synodicMonths.toFixed(0)} months` : "—"}</div>
          </div>
        </div>

        {!travel ? (
          <button className="btn btn-primary w-full !py-3" disabled={from === to} onClick={() => st.startTravel(from, to)}>
            <Rocket size={14} /> LAUNCH TRANSFER
          </button>
        ) : (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-[9px] tracking-[0.22em] text-cyan-200">
                {BODY_BY_ID[travel.from].name.toUpperCase()} → {BODY_BY_ID[travel.to].name.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] text-cyan-300">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-[6px] rounded-full bg-[rgba(20,32,64,0.8)] overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <button className="btn w-full !text-[9px]" onClick={() => st.stopTravel()}>CANCEL FLIGHT</button>
          </div>
        )}

        <div className="rounded-xl border border-[rgba(126,178,255,0.12)] bg-[rgba(8,16,36,0.45)] p-3">
          <div className="font-display text-[8.5px] tracking-[0.22em] text-slate-500 mb-1.5">DESTINATION · {BODY_BY_ID[to].name.toUpperCase()}</div>
          <p className="text-[11.5px] text-slate-400 leading-relaxed line-clamp-3">{BODY_BY_ID[to].description}</p>
          <button className="btn !text-[9px] mt-2" onClick={() => st.select(to)}>INSPECT DESTINATION</button>
        </div>

        <p className="text-[9.5px] text-slate-600 font-mono leading-relaxed">
          Simplified simulation: Hohmann ellipse + straight-line scene path. Not a mission-planning tool.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ eclipse panel ---------------------------- */

export function EclipsePanel() {
  const st = useStore();
  const isSolar = st.eclipse === "solar";
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <p className="text-[12px] text-slate-400">A guided geometry lab — watch how shadows align during eclipses (animated, not to scale).</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`rounded-xl border p-3 text-left transition-all ring-focus ${isSolar ? "border-amber-300/50 bg-amber-400/10" : "border-[rgba(126,178,255,0.14)] hover:border-cyan-300/40"}`}
            onClick={() => st.setEclipse("solar")}
            aria-pressed={isSolar}
          >
            <Sun size={16} className="text-amber-300 mb-1.5" />
            <div className="font-display text-[10px] tracking-[0.18em] text-white">SOLAR</div>
            <div className="font-mono text-[9px] text-slate-500 mt-1">SUN → MOON → EARTH</div>
          </button>
          <button
            className={`rounded-xl border p-3 text-left transition-all ring-focus ${!isSolar && st.eclipse ? "border-red-300/50 bg-red-400/10" : "border-[rgba(126,178,255,0.14)] hover:border-cyan-300/40"}`}
            onClick={() => st.setEclipse("lunar")}
            aria-pressed={!isSolar && !!st.eclipse}
          >
            <MoonIcon size={16} className="text-red-300 mb-1.5" />
            <div className="font-display text-[10px] tracking-[0.18em] text-white">LUNAR</div>
            <div className="font-mono text-[9px] text-slate-500 mt-1">SUN → EARTH → MOON</div>
          </button>
        </div>

        {isSolar ? (
          <div className="space-y-2 text-[12px] text-slate-300 leading-relaxed">
            <p><strong className="text-amber-200">Solar eclipse:</strong> the Moon slides between Sun and Earth, casting its umbra onto a narrow track on Earth's surface. Totality lasts only minutes because the Moon's shadow cone barely reaches us.</p>
            <p className="text-slate-400 text-[11.5px]">The dark cone in the lab is the Moon's umbra. When it touches Earth, observers inside see the Sun completely covered.</p>
          </div>
        ) : (
          <div className="space-y-2 text-[12px] text-slate-300 leading-relaxed">
            <p><strong className="text-red-200">Lunar eclipse:</strong> Earth moves between Sun and Moon, and the full Moon drifts through Earth's shadow. Filtered sunlight bending through Earth's atmosphere paints the Moon copper-red — a “Blood Moon”.</p>
            <p className="text-slate-400 text-[11.5px]">Watch the Moon turn red as it enters the umbra cone behind Earth.</p>
          </div>
        )}

        <div className="rounded-xl border border-[rgba(126,178,255,0.12)] bg-[rgba(8,16,36,0.45)] p-3">
          <div className="font-display text-[8.5px] tracking-[0.22em] text-slate-500 mb-1.5">WHY NOT EVERY MONTH?</div>
          <p className="text-[11.5px] text-slate-400 leading-relaxed">The Moon's orbit is tilted 5° to Earth's orbit, so alignments (syzygies) only line up near the two nodes where the orbital planes cross — eclipse seasons come roughly every six months.</p>
        </div>

        <button className="btn w-full" onClick={() => { st.setEclipse(null); st.select("earth"); }}>
          <X size={13} /> EXIT ECLIPSE LAB
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- hypo panel ------------------------------ */

export function HypoPanel() {
  const st = useStore();
  const h = st.hypo;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={14} className="text-cyan-300" />
          <span className="font-display text-[10px] tracking-[0.22em] text-cyan-200">EXPERIMENTAL LABORATORY</span>
        </div>
        <p className="text-[12px] text-slate-400">Bend the rules of the Solar System. Changes are visual approximations and never alter real data.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        <HypoSlider label="PLANET SIZE" value={h.sizeMul} min={0.5} max={3} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => st.setHypo({ sizeMul: v })} />
        <HypoSlider label="ROTATION SPEED" value={h.rotMul} min={0.1} max={10} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} onChange={(v) => st.setHypo({ rotMul: v })} />
        <HypoSlider label="ORBITAL SPEED" value={h.orbitMul} min={0.1} max={10} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} onChange={(v) => st.setHypo({ orbitMul: v })} />
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-[8.5px] tracking-[0.22em] text-slate-400">REMOVE THE MOON</div>
            <div className="text-[10.5px] text-slate-600 mt-0.5">What if Earth had no companion?</div>
          </div>
          <button
            role="switch" aria-checked={h.noMoon} data-tip="Toggle Earth's moon"
            onClick={() => st.setHypo({ noMoon: !h.noMoon })}
            className={`relative w-9 h-5 rounded-full transition-colors ring-focus ${h.noMoon ? "bg-red-400/80" : "bg-slate-600/50"}`}
          >
            <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white transition-all ${h.noMoon ? "left-[19px]" : "left-[3px]"}`} />
          </button>
        </div>
        <div className="rounded-xl border border-amber-300/25 bg-amber-400/5 p-3">
          <p className="text-[10.5px] text-amber-200/80 leading-relaxed">
            Results are educational approximations — e.g. removing the Moon does not recompute tides or axial stability in this simulation.
          </p>
        </div>
        <button className="btn btn-danger w-full !py-3" onClick={() => st.resetHypo()}>
          <RotateCcw size={14} /> RESET SIMULATION
        </button>
      </div>
    </div>
  );
}

function HypoSlider({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-display text-[8.5px] tracking-[0.22em] text-slate-400">{label}</span>
        <span className="font-mono text-[11px] text-cyan-300">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} />
    </div>
  );
}

/* ------------------------------ settings panel --------------------------- */

export function SettingsPanel() {
  const st = useStore();
  const s = st.settings;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        <SettingsGroup title="GRAPHICS">
          <div className="grid grid-cols-4 gap-1">
            {(["ultra", "high", "medium", "low"] as Quality[]).map((q) => (
              <button key={q} className={`btn !px-1 !py-1.5 !text-[8px] ${s.quality === q ? "btn-primary" : ""}`} onClick={() => st.setSetting("quality", q)}>
                {q.toUpperCase()}
              </button>
            ))}
          </div>
          <SettingsRow label="Shadows" tip="Planet & ring shadows (high/ultra only)"><Toggle on={s.shadows} onToggle={() => st.setSetting("shadows", !s.shadows)} /></SettingsRow>
          <SettingsRow label="Sun bloom & glow" tip="Glowing corona around the Sun"><Toggle on={s.bloom} onToggle={() => st.setSetting("bloom", !s.bloom)} /></SettingsRow>
          <SettingsRow label="Atmospheres" tip="Fresnel atmosphere rims"><Toggle on={s.atmospheres} onToggle={() => st.setSetting("atmospheres", !s.atmospheres)} /></SettingsRow>
          <SettingsRow label="Star density" tip="Number of background stars"><MiniSlider value={s.starDensity} onChange={(v) => st.setSetting("starDensity", v)} /></SettingsRow>
          <SettingsRow label="Asteroid density" tip="Number of belt asteroids"><MiniSlider value={s.asteroidDensity} onChange={(v) => st.setSetting("asteroidDensity", v)} /></SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="SIMULATION">
          <div className="grid grid-cols-3 gap-1">
            {(["realistic", "visibility", "educational"] as ScaleMode[]).map((m) => (
              <button key={m} className={`btn !px-1 !py-1.5 !text-[7.5px] ${st.scaleMode === m ? "btn-primary" : ""}`} onClick={() => st.setScaleMode(m)} data-tip={`Scale: ${m}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <SettingsRow label="Orbit paths" tip="Toggle orbital paths"><Toggle on={st.showOrbits} onToggle={() => st.toggle("showOrbits")} /></SettingsRow>
          <SettingsRow label="Moon orbits" tip="Show orbits of moons"><Toggle on={st.showMoonOrbits} onToggle={() => st.toggle("showMoonOrbits")} /></SettingsRow>
          <SettingsRow label="Labels" tip="Floating object labels"><Toggle on={st.showLabels} onToggle={() => st.toggle("showLabels")} /></SettingsRow>
          <SettingsRow label="Moons" tip="Render moons"><Toggle on={st.showMoons} onToggle={() => st.toggle("showMoons")} /></SettingsRow>
          <SettingsRow label="Asteroid belt" tip="Show asteroid belt"><Toggle on={st.showAsteroids} onToggle={() => st.toggle("showAsteroids")} /></SettingsRow>
          <SettingsRow label="Comets" tip="Show comets"><Toggle on={st.showComets} onToggle={() => st.toggle("showComets")} /></SettingsRow>
          <SettingsRow label="Spacecraft" tip="Show spacecraft"><Toggle on={st.showSpacecraft} onToggle={() => st.toggle("showSpacecraft")} /></SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="CAMERA">
          <SettingsRow label="Sensitivity" tip="Rotation / zoom sensitivity"><MiniSlider value={s.camSensitivity / 2} onChange={(v) => st.setSetting("camSensitivity", v * 2)} /></SettingsRow>
          <SettingsRow label="Auto-follow on select" tip="Camera follows selected object"><Toggle on={s.autoFollow} onToggle={() => st.setSetting("autoFollow", !s.autoFollow)} /></SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="INTERFACE">
          <SettingsRow label="HUD" tip="Show heads-up display"><Toggle on={s.showHUD} onToggle={() => st.setSetting("showHUD", !s.showHUD)} /></SettingsRow>
          <SettingsRow label="Reduced motion" tip="Minimize animation"><Toggle on={s.reducedMotion} onToggle={() => st.setSetting("reducedMotion", !s.reducedMotion)} /></SettingsRow>
          <SettingsRow label="UI opacity" tip="Interface opacity"><MiniSlider value={s.uiOpacity} onChange={(v) => st.setSetting("uiOpacity", 0.4 + v * 0.6)} /></SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="AUDIO">
          <SettingsRow label="Ambient space audio" tip="Subtle drone + UI blips"><Toggle on={s.sound} onToggle={() => st.setSetting("sound", !s.sound)} /></SettingsRow>
          <SettingsRow label="Volume" tip="Master volume"><MiniSlider value={s.volume} onChange={(v) => st.setSetting("volume", v)} /></SettingsRow>
        </SettingsGroup>

        <p className="text-[9.5px] text-slate-600 font-mono pb-2">Settings persist locally · HELIOS v1.0</p>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-[8.5px] tracking-[0.28em] text-cyan-300/70 mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function SettingsRow({ label, tip, children }: { label: string; tip: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" data-tip="">
      <span className="text-[12px] text-slate-300" title={tip}>{label}</span>
      {children}
    </div>
  );
}
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle} className={`relative w-8 h-[17px] rounded-full transition-colors ring-focus ${on ? "bg-cyan-400/80" : "bg-slate-600/50"}`}>
      <span className={`absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white transition-all ${on ? "left-[17px]" : "left-[2px]"}`} />
    </button>
  );
}
function MiniSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="range" min={0.1} max={1} step={0.01} value={Math.min(1, Math.max(0.1, value))} onChange={(e) => onChange(parseFloat(e.target.value))} className="!w-24" aria-label="slider" />
  );
}

/* ----------------------------- simulate launcher ------------------------- */

const SIM_TOOLS: { id: NonNullable<ReturnType<typeof useStore.getState>["panel"]>; title: string; desc: string; icon: typeof Sun }[] = [
  { id: "eclipse", title: "ECLIPSE LAB", desc: "Solar & lunar eclipse geometry", icon: Sun },
  { id: "travel", title: "TRAVEL PLANNER", desc: "Plot a transfer between worlds", icon: Rocket },
  { id: "hypo", title: "LABORATORY", desc: "Bend size, spin & orbit rules", icon: FlaskConical },
  { id: "compare", title: "COMPARE WORLDS", desc: "Planets side by side", icon: ArrowLeftRight },
  { id: "missions", title: "MISSIONS", desc: "8 guided objectives", icon: Check },
];

export function SimulateLauncher() {
  const st = useStore();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 hairline-b shrink-0">
        <p className="text-[12px] text-slate-400">Simulation tools — run experiments on the Solar System.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {SIM_TOOLS.map((t) => {
          const I = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => st.setPanel(t.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-[rgba(126,178,255,0.12)] bg-[rgba(8,16,36,0.45)] p-3 text-left hover:border-cyan-300/45 hover:bg-cyan-400/5 transition-all ring-focus group"
            >
              <span className="w-9 h-9 rounded-lg bg-[rgba(20,36,72,0.7)] border border-[rgba(126,178,255,0.16)] flex items-center justify-center text-cyan-300 group-hover:shadow-[0_0_14px_rgba(94,230,255,0.25)] transition-shadow shrink-0">
                <I size={16} />
              </span>
              <span>
                <span className="font-display text-[10px] tracking-[0.2em] text-white block">{t.title}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{t.desc}</span>
              </span>
            </button>
          );
        })}
        <p className="text-[9.5px] text-slate-600 font-mono pt-1">All experiments are educational approximations.</p>
      </div>
    </div>
  );
}

/* ------------------------------- panels dock ----------------------------- */

const PANEL_META: Record<string, string> = {
  settings: "SETTINGS",
  compare: "COMPARE WORLDS",
  missions: "MISSIONS",
  learn: "LEARN",
  travel: "TRAVEL PLANNER",
  eclipse: "ECLIPSE LAB",
  hypo: "LABORATORY",
};

export function PanelsDock() {
  const st = useStore();
  let title = "";
  let content: React.ReactNode = null;
  if (st.panel) {
    title = PANEL_META[st.panel] ?? "";
    content =
      st.panel === "settings" ? <SettingsPanel />
        : st.panel === "compare" ? <ComparePanel />
        : st.panel === "missions" ? <MissionsPanel />
        : st.panel === "learn" ? <LearnPanel />
        : st.panel === "travel" ? <TravelPanel />
        : st.panel === "eclipse" ? <EclipsePanel />
        : <HypoPanel />;
  } else if (st.selected) {
    title = "OBJECT DATA";
    content = <InfoPanel />;
  } else if (st.mode === "simulate") {
    title = "SIMULATION TOOLS";
    content = <SimulateLauncher />;
  }
  if (!content) return null;
  return (
    <aside
      className="absolute z-[58] md:right-3 md:top-16 md:bottom-[92px] md:w-[338px] max-md:inset-x-2 max-md:bottom-[118px] max-md:top-auto max-md:max-h-[54vh] flex flex-col"
      style={{ opacity: st.settings.uiOpacity }}
      aria-label={title}
    >
      <div className="glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden anim-right">
        {st.panel && (
          <div className="flex items-center justify-between px-4 h-10 hairline-b shrink-0">
            <span className="font-display text-[10px] tracking-[0.26em] text-slate-200">{title}</span>
            <button className="icon-btn !w-7 !h-7" onClick={() => st.setPanel(null)} aria-label="Close panel (Esc)" data-tip="Close (Esc)">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">{content}</div>
      </div>
    </aside>
  );
}
