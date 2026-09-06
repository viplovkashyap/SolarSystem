/* Subtle synthesized audio — no asset files, no autoplay. */

let ctx: AudioContext | null = null;
let enabled = false;
let volume = 0.5;
let ambientNodes: { osc: OscillatorNode; osc2: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setEnabled(on: boolean) {
  enabled = on;
  if (on) {
    ensureCtx();
    startAmbient();
  } else {
    stopAmbient();
  }
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (ambientNodes && ctx) {
    ambientNodes.gain.gain.setTargetAtTime(volume * 0.05, ctx.currentTime, 0.4);
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gainV: number) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gainV * volume * 0.25, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur + 0.05);
}

export function playClick() {
  blip(1300, 0.07, "square", 0.16);
}
export function playSelect() {
  blip(620, 0.16, "sine", 0.3);
  setTimeout(() => blip(930, 0.2, "sine", 0.22), 70);
}
export function playSuccess() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, "sine", 0.3), i * 90));
}

/** Deep space drone: two detuned oscillators + slow LFO on the filter. */
export function startAmbient() {
  const c = ensureCtx();
  if (!c || ambientNodes) return;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 54;
  osc2.type = "triangle";
  osc2.frequency.value = 81.5;
  filter.type = "lowpass";
  filter.frequency.value = 220;
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 90;
  lfo.connect(lfoGain).connect(filter.frequency);
  gain.gain.value = 0.0001;
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain).connect(c.destination);
  osc.start();
  osc2.start();
  lfo.start();
  gain.gain.setTargetAtTime(volume * 0.05, c.currentTime, 1.2);
  ambientNodes = { osc, osc2, lfo, gain };
}

export function stopAmbient() {
  if (!ambientNodes || !ctx) return;
  const { osc, osc2, lfo, gain } = ambientNodes;
  gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  setTimeout(() => {
    try {
      osc.stop();
      osc2.stop();
      lfo.stop();
    } catch {
      /* already stopped */
    }
  }, 1200);
  ambientNodes = null;
}

/** Must be called from a user gesture once. */
export function unlock() {
  ensureCtx();
  if (enabled) startAmbient();
}
