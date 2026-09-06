import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Procedural texture generation — every surface is synthesized on    */
/*  canvas at load time, so the app works fully offline and scales     */
/*  resolution per quality preset.                                     */
/* ------------------------------------------------------------------ */

function hash(ix: number, iy: number, seed: number): number {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, oct: number, seed: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, y * f, seed + i * 17.3);
    amp *= 0.5;
    f *= 2.07;
  }
  return v;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mix(c1: number[], c2: number[], t: number): number[] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

/** Seamless-in-u fbm for equirectangular maps. */
function fbmW(u: number, v: number, fu: number, fv: number, oct: number, seed: number): number {
  const n1 = fbm(u * fu, v * fv, oct, seed);
  const b = smoothstep(0.86, 1, u);
  if (b <= 0) return n1;
  const n2 = fbm((u - 1) * fu, v * fv, oct, seed);
  return n1 * (1 - b) + n2 * b;
}

type PixelFn = (u: number, v: number) => [number, number, number, number];

function paintCanvas(w: number, h: number, fn: PixelFn): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let i = 0;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const [r, g, b, a] = fn(u, v);
      d[i++] = r;
      d[i++] = g;
      d[i++] = b;
      d[i++] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function addCraters(cv: HTMLCanvasElement, count: number, seed: number, dark: string, light: string, maxSize = 14) {
  const ctx = cv.getContext("2d")!;
  const w = cv.width;
  const h = cv.height;
  for (let i = 0; i < count; i++) {
    const x = hash(i, 1, seed) * w;
    const y = hash(i, 2, seed) * h;
    const r = 1.5 + Math.pow(hash(i, 3, seed), 2.2) * maxSize;
    ctx.globalAlpha = 0.22 + hash(i, 4, seed) * 0.3;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(0.6, r * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, -Math.PI * 0.85, Math.PI * 0.45);
    ctx.stroke();
    if (x - r < 0) {
      ctx.beginPath();
      ctx.arc(x + w, y, r, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.3;
      ctx.fill();
    } else if (x + r > w) {
      ctx.beginPath();
      ctx.arc(x - w, y, r, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.3;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function toTexture(cv: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cv);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------- painters ------------------------------ */

const painters: Record<string, (w: number, h: number) => HTMLCanvasElement> = {
  sun: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 9, 9, 5, 11) * 0.7 + fbmW(u, v, 22, 22, 4, 23) * 0.3;
      const c = n < 0.45 ? mix([255, 110, 10], [255, 170, 40], n / 0.45)
        : n < 0.72 ? mix([255, 170, 40], [255, 214, 110], (n - 0.45) / 0.27)
        : mix([255, 214, 110], [255, 248, 214], (n - 0.72) / 0.28);
      return [c[0], c[1], c[2], 255];
    }),

  mercury: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 7, 7, 5, 31);
      const m = smoothstep(0.3, 0.7, fbmW(u, v, 3, 3, 4, 37));
      const base = mix(mix([96, 88, 80], [148, 138, 126], n), [74, 68, 62], m * 0.5);
      return [base[0] * (0.85 + 0.3 * n), base[1] * (0.85 + 0.3 * n), base[2] * (0.85 + 0.3 * n), 255];
    });
    addCraters(cv, 160, 5, "#3d3731", "#c9bfb2", 12);
    return cv;
  },

  venus: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const warp = fbmW(u, v, 6, 6, 4, 41);
      const n = fbmW(u + warp * 0.06, v, 5, 9, 5, 43);
      const band = Math.sin(v * Math.PI * 7 + warp * 4.5) * 0.5 + 0.5;
      const c = mix(mix([212, 172, 110], [238, 210, 152], n), [247, 232, 190], band * 0.45);
      return [c[0], c[1], c[2], 255];
    }),

  "earth-day": (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const lat = (v - 0.5) * Math.PI;
      const cont = fbmW(u, v, 4, 4, 5, 51) + 0.32 * fbmW(u, v, 9, 9, 4, 53) - 0.13;
      const isLand = cont > 0.52;
      const ice = smoothstep(1.15, 1.45, Math.abs(lat) + fbmW(u, v, 8, 8, 3, 57) * 0.35);
      let c: number[];
      if (ice > 0.85) c = mix([225, 236, 244], [248, 251, 254], fbmW(u, v, 12, 12, 3, 59));
      else if (isLand) {
        const arid = smoothstep(0.2, 0.75, fbmW(u, v, 6, 6, 4, 61)) * (1 - Math.abs(lat) / 1.2);
        const lush = mix([52, 96, 44], [96, 122, 58], fbmW(u, v, 11, 11, 4, 63));
        c = mix(lush, [168, 140, 92], arid * 0.8);
        const mtn = smoothstep(0.66, 0.82, cont);
        c = mix(c, [138, 122, 102], mtn * 0.7);
        c = mix(c, [240, 244, 248], mtn * smoothstep(0.5, 1.1, Math.abs(lat)) * 0.6);
      } else {
        const depth = clamp01((0.52 - cont) * 3.4);
        c = mix([38, 96, 158], [8, 28, 74], depth);
        const shal = smoothstep(0.5, 0.52, cont);
        c = mix(c, [46, 130, 172], shal * 0.8);
      }
      return [c[0], c[1], c[2], 255];
    }),

  "earth-night": (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const lat = (v - 0.5) * Math.PI;
      const cont = fbmW(u, v, 4, 4, 5, 51) + 0.32 * fbmW(u, v, 9, 9, 4, 53) - 0.13;
      const isLand = cont > 0.52;
      const ice = Math.abs(lat) > 1.15;
      let r = 0, g = 0, b = 0;
      if (isLand && !ice) {
        const city = fbmW(u, v, 26, 26, 4, 67);
        const coast = smoothstep(0.52, 0.6, cont) * (1 - smoothstep(0.72, 0.85, cont));
        const p = city * (0.55 + coast);
        if (p > 0.62) {
          const k = smoothstep(0.62, 0.85, p);
          r = 255 * k; g = 190 * k; b = 96 * k;
        }
      }
      return [r, g, b, 255];
    }),

  "earth-clouds": (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 7, 12, 5, 71) * 0.65 + fbmW(u, v, 15, 26, 4, 73) * 0.35;
      const a = smoothstep(0.52, 0.78, n) * 235;
      return [255, 255, 255, a];
    }),

  moon: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 5, 81);
      const mare = smoothstep(0.55, 0.72, fbmW(u, v, 3, 3, 4, 83));
      const c = mix(mix([122, 122, 128], [178, 176, 172], n), [88, 88, 96], mare * 0.55);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 220, 9, "#585860", "#d8d6d2", 11);
    return cv;
  },

  mars: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const lat = (v - 0.5) * Math.PI;
      const n = fbmW(u, v, 6, 6, 5, 91);
      const dark = smoothstep(0.55, 0.75, fbmW(u, v, 4, 4, 4, 93));
      let c = mix([142, 68, 38], [206, 116, 70], n);
      c = mix(c, [96, 52, 34], dark * 0.5);
      const cap = smoothstep(1.22, 1.42, Math.abs(lat) + n * 0.25);
      c = mix(c, [240, 236, 228], cap);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 90, 13, "#5e2f1c", "#e0a070", 9);
    return cv;
  },

  jupiter: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const turb = fbmW(u, v, 10, 26, 5, 101);
      const band = Math.sin(v * Math.PI * 13 + turb * 3.2) * 0.5 + 0.5;
      const band2 = Math.sin(v * Math.PI * 29 + turb * 5.0) * 0.5 + 0.5;
      let c = mix([158, 110, 74], [224, 196, 152], band);
      c = mix(c, [196, 148, 102], band2 * 0.35);
      c = mix(c, [240, 226, 196], smoothstep(0.6, 1.0, band) * 0.5);
      // Great Red Spot
      const du = Math.min(Math.abs(u - 0.7), 1 - Math.abs(u - 0.7));
      const dx = du / 0.055;
      const dy = (v - 0.64) / 0.042;
      const spot = dx * dx + dy * dy;
      if (spot < 1.6) {
        const k = smoothstep(1.6, 0.15, spot);
        c = mix(c, [196, 78, 46], k * 0.85);
        c = mix(c, [232, 140, 100], smoothstep(0.9, 0.4, spot) * 0.4);
      }
      const pole = smoothstep(0.82, 1.0, Math.abs(v - 0.5) * 2);
      c = mix(c, [128, 108, 92], pole * 0.45);
      return [c[0], c[1], c[2], 255];
    }),

  saturn: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const turb = fbmW(u, v, 8, 20, 4, 111);
      const band = Math.sin(v * Math.PI * 11 + turb * 2.2) * 0.5 + 0.5;
      let c = mix([196, 168, 122], [232, 214, 168], band);
      c = mix(c, [214, 190, 140], turb * 0.3);
      const pole = smoothstep(0.85, 1.0, Math.abs(v - 0.5) * 2);
      c = mix(c, [168, 148, 112], pole * 0.4);
      return [c[0], c[1], c[2], 255];
    }),

  uranus: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 5, 10, 4, 121);
      const band = Math.sin(v * Math.PI * 6 + n * 1.4) * 0.5 + 0.5;
      let c = mix([136, 204, 212], [172, 226, 230], n);
      c = mix(c, [196, 238, 240], band * 0.25);
      return [c[0], c[1], c[2], 255];
    }),

  neptune: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 12, 5, 131);
      const band = Math.sin(v * Math.PI * 9 + n * 3.0) * 0.5 + 0.5;
      let c = mix([44, 72, 178], [86, 122, 232], n);
      c = mix(c, [120, 156, 240], band * 0.3);
      const du = Math.min(Math.abs(u - 0.32), 1 - Math.abs(u - 0.32));
      const dx = du / 0.05;
      const dy = (v - 0.42) / 0.05;
      const s = dx * dx + dy * dy;
      if (s < 1.4) c = mix(c, [26, 44, 120], smoothstep(1.4, 0.1, s) * 0.8);
      const streak = smoothstep(0.72, 0.86, fbmW(u, v, 14, 30, 4, 133));
      c = mix(c, [216, 228, 250], streak * 0.5 * smoothstep(0.3, 0.5, v) * smoothstep(0.7, 0.5, v));
      return [c[0], c[1], c[2], 255];
    }),

  pluto: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 5, 141);
      let c = mix([172, 138, 108], [214, 190, 158], n);
      const dark = smoothstep(0.5, 0.62, v) * smoothstep(0.78, 0.66, v);
      c = mix(c, [96, 62, 44], dark * smoothstep(0.35, 0.6, n) * 0.75);
      const du = Math.min(Math.abs(u - 0.42), 1 - Math.abs(u - 0.42));
      const dx = du / 0.1;
      const dy = (v - 0.52) / 0.12;
      const heart = dx * dx + dy * dy;
      if (heart < 1.5) c = mix(c, [236, 222, 200], smoothstep(1.5, 0.2, heart) * 0.85);
      const cap = smoothstep(0.9, 1.0, Math.abs(v - 0.5) * 2);
      c = mix(c, [226, 214, 196], cap * 0.5);
      return [c[0], c[1], c[2], 255];
    }),

  ceres: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 7, 7, 5, 151);
      const c = mix([92, 86, 78], [146, 138, 124], n);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 120, 21, "#4a443c", "#b8ac9c", 9);
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "rgba(240,240,235,0.85)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cv.width * (0.3 + i * 0.012), cv.height * 0.44, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return cv;
  },

  io: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 8, 8, 5, 161);
      let c = mix([196, 168, 84], [232, 214, 140], n);
      const blotch = smoothstep(0.6, 0.8, fbmW(u, v, 16, 16, 4, 163));
      c = mix(c, [168, 62, 32], blotch * 0.6);
      const white = smoothstep(0.65, 0.85, fbmW(u, v, 12, 12, 4, 167));
      c = mix(c, [238, 236, 220], white * 0.4);
      return [c[0], c[1], c[2], 255];
    }),

  europa: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 4, 171);
      let c = mix([196, 182, 158], [226, 218, 202], n);
      const line = smoothstep(0.86, 0.99, fbmW(u, v, 3, 40, 4, 173));
      c = mix(c, [158, 88, 58], line * 0.35);
      return [c[0], c[1], c[2], 255];
    });
    return cv;
  },

  ganymede: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 5, 181);
      const grove = smoothstep(0.55, 0.7, fbmW(u, v, 10, 10, 4, 183));
      let c = mix([106, 98, 88], [168, 158, 146], n);
      c = mix(c, [196, 188, 176], grove * 0.5);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 110, 23, "#4e463c", "#c8bfb2", 8);
    return cv;
  },

  callisto: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 5, 191);
      const c = mix([74, 68, 62], [126, 118, 108], n);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 260, 27, "#38322c", "#d8cfc0", 9);
    return cv;
  },

  titan: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 5, 5, 5, 201);
      const c = mix([204, 148, 66], [228, 180, 100], n);
      const pole = smoothstep(0.75, 0.95, Math.abs(v - 0.5) * 2);
      const out = mix(c, [158, 118, 68], pole * 0.5);
      return [out[0], out[1], out[2], 255];
    }),

  enceladus: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 8, 8, 4, 211);
      const stripe = smoothstep(0.7, 0.95, v) * smoothstep(0.6, 0.8, fbmW(u, v, 14, 6, 4, 213));
      let c = mix([214, 226, 236], [244, 249, 253], n);
      c = mix(c, [140, 190, 216], stripe * 0.5);
      return [c[0], c[1], c[2], 255];
    }),

  triton: (w, h) =>
    paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 6, 6, 5, 221);
      let c = mix([176, 192, 210], [222, 230, 240], n);
      const cant = smoothstep(0.6, 0.78, fbmW(u, v, 12, 12, 4, 223));
      c = mix(c, [196, 176, 170], cant * 0.35);
      const cap = smoothstep(0.62, 0.8, v) ;
      c = mix(c, [240, 210, 200], cap * 0.25);
      return [c[0], c[1], c[2], 255];
    }),

  nucleus: (w, h) => {
    const cv = paintCanvas(w, h, (u, v) => {
      const n = fbmW(u, v, 10, 10, 5, 231);
      const c = mix([24, 24, 30], [58, 56, 62], n);
      return [c[0], c[1], c[2], 255];
    });
    addCraters(cv, 30, 29, "#101014", "#8a8892", 5);
    return cv;
  },
};

/* --------------------------- sprite painters --------------------------- */

function radialSprite(size: number, stops: [number, string][]): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

function ringCanvas(): HTMLCanvasElement {
  const w = 1024;
  const h = 16;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    const n1 = fbm(t * 60, 0.5, 4, 241);
    const n2 = fbm(t * 190, 1.5, 3, 243);
    let alpha = 0.25 + n1 * 0.55 + n2 * 0.25;
    // ring structure: inner C-ring faint, B bright, Cassini division, A, Encke gap
    alpha *= smoothstep(0.0, 0.06, t) * 0.7 + 0.3;
    if (t < 0.16) alpha *= 0.35;
    alpha *= 1 - smoothstep(0.6, 0.63, t) * (1 - smoothstep(0.655, 0.685, t)) * 0.92; // Cassini
    alpha *= 1 - smoothstep(0.925, 0.935, t) * (1 - smoothstep(0.945, 0.955, t)) * 0.8; // Encke
    alpha *= 1 - smoothstep(0.985, 1, t);
    const warm = n2;
    const c = mix(mix([166, 148, 118], [214, 198, 162], warm), [238, 228, 202], n1 * 0.5);
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = Math.round(clamp01(alpha) * 235);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function uranusRingCanvas(): HTMLCanvasElement {
  const w = 512;
  const h = 8;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    let alpha = 0.05;
    for (const [pos, wd, str] of [[0.52, 0.012, 0.5], [0.66, 0.008, 0.35], [0.78, 0.01, 0.45], [0.93, 0.02, 0.75]] as const) {
      alpha += str * Math.exp(-Math.pow((t - pos) / wd, 2));
    }
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      img.data[i] = 180; img.data[i + 1] = 200; img.data[i + 2] = 210;
      img.data[i + 3] = Math.round(clamp01(alpha) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* -------------------------------- cache -------------------------------- */

const cache = new Map<string, THREE.Texture>();
let texSize = 512;

export function setTextureSize(size: number) {
  texSize = size;
}

export function getTexture(key: string): THREE.Texture {
  const cached = cache.get(key);
  if (cached) return cached;
  let tex: THREE.Texture;
  switch (key) {
    case "glow-sun":
      tex = toTexture(radialSprite(256, [[0, "rgba(255,214,140,0.9)"], [0.22, "rgba(255,170,70,0.42)"], [0.5, "rgba(255,130,40,0.14)"], [1, "rgba(255,120,30,0)"]]), false);
      break;
    case "glow-soft":
      tex = toTexture(radialSprite(128, [[0, "rgba(255,255,255,0.85)"], [0.3, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]), false);
      break;
    case "glow-cyan":
      tex = toTexture(radialSprite(128, [[0, "rgba(94,230,255,0.8)"], [0.35, "rgba(94,230,255,0.22)"], [1, "rgba(94,230,255,0)"]]), false);
      break;
    case "star-sprite":
      tex = toTexture(radialSprite(64, [[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,0.7)"], [1, "rgba(255,255,255,0)"]]), false);
      break;
    case "ring-saturn":
      tex = toTexture(ringCanvas());
      break;
    case "ring-uranus":
      tex = toTexture(uranusRingCanvas());
      break;
    case "nebula-0":
      tex = toTexture(radialSprite(256, [[0, "rgba(56,90,200,0.5)"], [0.5, "rgba(40,60,160,0.18)"], [1, "rgba(30,40,120,0)"]]), false);
      break;
    case "nebula-1":
      tex = toTexture(radialSprite(256, [[0, "rgba(120,70,190,0.42)"], [0.5, "rgba(90,50,160,0.14)"], [1, "rgba(60,30,120,0)"]]), false);
      break;
    case "nebula-2":
      tex = toTexture(radialSprite(256, [[0, "rgba(40,160,190,0.36)"], [0.5, "rgba(30,120,160,0.12)"], [1, "rgba(20,80,120,0)"]]), false);
      break;
    default: {
      const painter = painters[key];
      const h = Math.round(texSize / 2);
      tex = painter ? toTexture(painter(texSize, h)) : toTexture(painters.sun(texSize, h));
    }
  }
  cache.set(key, tex);
  return tex;
}

export function preloadBodyTextures(keys: string[]) {
  for (const k of keys) getTexture(k);
}

export const ALL_BODY_TEX_KEYS = [
  "sun", "mercury", "venus", "earth-day", "earth-night", "earth-clouds", "moon",
  "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ceres",
  "io", "europa", "ganymede", "callisto", "titan", "enceladus", "triton", "nucleus",
];
