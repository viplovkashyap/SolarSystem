import { useState } from "react";
import { X, Compass, Eye, ArrowLeftRight, Orbit, ChevronDown, BookOpen, Rocket } from "lucide-react";
import { useStore, useCountUp, orbitVisibleFor } from "../store";
import { BODY_BY_ID, moonsOf } from "../data";

function Stat({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-[rgba(8,16,36,0.55)] border border-[rgba(126,178,255,0.1)] px-2.5 py-2 ${wide ? "col-span-2" : ""}`}>
      <div className="font-display text-[7.5px] tracking-[0.22em] text-slate-500 mb-0.5">{label}</div>
      <div className="text-[12px] text-slate-100 leading-snug">{value}</div>
    </div>
  );
}

function AnimatedKm({ km }: { km: number }) {
  const v = useCountUp(km);
  return <>{Math.round(v).toLocaleString("en-US")} km</>;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[rgba(126,178,255,0.12)] rounded-lg overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2 bg-[rgba(10,20,44,0.5)] hover:bg-[rgba(16,30,64,0.6)] transition-colors ring-focus" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-display text-[9px] tracking-[0.24em] text-cyan-200/85">{title}</span>
        <ChevronDown size={12} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3 py-2.5 anim-fade">{children}</div>}
    </div>
  );
}

export function InfoPanel() {
  const st = useStore();
  const body = st.selected ? BODY_BY_ID[st.selected] : null;
  if (!body) return null;
  const moons = moonsOf(body.id);
  const orbitOn = orbitVisibleFor(st, body.id);

  return (
    <div className="flex flex-col h-full anim-right overflow-hidden">
      {/* header */}
      <div className="px-4 pt-4 pb-3 hairline-b shrink-0">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 w-3 h-3 rounded-full shrink-0" style={{ background: body.color, boxShadow: `0 0 14px ${body.color}` }} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[19px] tracking-[0.14em] text-white leading-none">{body.name.toUpperCase()}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.18em] text-cyan-300/90 border border-cyan-300/30 rounded px-1.5 py-0.5">{body.type.toUpperCase()}</span>
              <span className="font-mono text-[9.5px] text-slate-500">{body.distLabel}</span>
            </div>
          </div>
          <button className="icon-btn !w-7 !h-7 shrink-0" onClick={() => st.select(null, false)} aria-label="Close panel (Esc)" data-tip="Close (Esc)">
            <X size={14} />
          </button>
        </div>
        <p className="mt-3 text-[12px] text-slate-300/90 leading-relaxed">{body.description}</p>
      </div>

      {/* actions */}
      <div className="px-4 py-3 grid grid-cols-3 gap-1.5 shrink-0">
        <button className="btn btn-primary !px-1 !text-[8.5px]" data-tip="Fly close to this object" onClick={() => st.select(body.id)}>
          <Compass size={12} /> EXPLORE
        </button>
        <button
          className={`btn !px-1 !text-[8.5px] ${st.follow ? "!border-cyan-300/60 !text-cyan-200" : ""}`}
          data-tip="Keep camera locked on this object"
          onClick={() => { if (!st.follow) st.select(body.id); else st.setFollow(false); }}
        >
          <Eye size={12} /> {st.follow ? "FOLLOWING" : "FOLLOW"}
        </button>
        <button className="btn !px-1 !text-[8.5px]" data-tip="Add to comparison" onClick={() => { st.toggleCompare(body.id); st.setPanel("compare"); }}>
          <ArrowLeftRight size={12} /> COMPARE
        </button>
        <button className="btn !px-1 !text-[8.5px]" data-tip={orbitOn ? "Hide this orbit path" : "Show this orbit path"} onClick={() => st.toggleOrbitFor(body.id)}>
          <Orbit size={12} /> {orbitOn ? "ORBIT ON" : "ORBIT OFF"}
        </button>
        {moons.length > 0 ? (
          <button className="btn !px-1 !text-[8.5px]" data-tip="Show this world's moons" onClick={() => { if (!st.showMoonOrbits) st.toggle("showMoonOrbits"); st.select(moons[0].id); }}>
            <Rocket size={12} /> MOONS
          </button>
        ) : (
          <button className="btn !px-1 !text-[8.5px]" data-tip="Open the learn module" onClick={() => { st.setMode("learn"); }}>
            <BookOpen size={12} /> LEARN
          </button>
        )}
        <button className="btn !px-1 !text-[8.5px]" data-tip="Open the learn module" onClick={() => st.setMode("learn")}>
          <BookOpen size={12} /> MORE
        </button>
      </div>

      {/* stats */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="DIAMETER" value={<AnimatedKm km={body.radiusKm * 2} />} />
          <Stat label="MASS" value={body.massLabel} />
          <Stat label="GRAVITY" value={body.gravityLabel} />
          <Stat label="DISTANCE FROM SUN" value={body.distLabel} />
          <Stat label="DAY LENGTH" value={body.dayLabel} />
          <Stat label="YEAR LENGTH" value={body.yearLabel} />
          <Stat label="AVG TEMPERATURE" value={body.tempLabel} />
          <Stat label="KNOWN MOONS" value={String(body.moonCount)} />
        </div>

        <div className="mt-2.5 space-y-1.5">
          <Section title="ATMOSPHERE">
            <p className="text-[12px] text-slate-300">{body.atmosphere}</p>
          </Section>
          <Section title="SURFACE">
            <p className="text-[12px] text-slate-300">{body.surface}</p>
          </Section>
          <Section title={`FAST FACTS · ${body.facts.length}`} defaultOpen>
            <ul className="space-y-1.5">
              {body.facts.map((f, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-slate-300 leading-snug">
                  <span className="text-cyan-300 font-mono text-[10px] mt-0.5 shrink-0">0{i + 1}</span> {f}
                </li>
              ))}
            </ul>
          </Section>
          {moons.length > 0 && (
            <Section title="MOONS IN THIS SIMULATION" defaultOpen>
              <div className="flex flex-wrap gap-1.5">
                {moons.map((m) => (
                  <button key={m.id} className="btn !py-1 !px-2 !text-[9px]" onClick={() => st.select(m.id)}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} /> {m.name.toUpperCase()}
                  </button>
                ))}
              </div>
            </Section>
          )}
          {body.type === "spacecraft" && (
            <Section title="MISSION NOTE" defaultOpen>
              <p className="text-[11.5px] text-amber-200/80 leading-relaxed">
                Trajectory shown is illustrative for education — not live mission telemetry.
              </p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
