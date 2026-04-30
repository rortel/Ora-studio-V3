/**
 * Brand-fidelity scoring — v0.
 *
 * Computes a 0-100 "palette respect" score for a generated image by
 * comparing its dominant colours against the brand palette. The number
 * is the proof of the promise — Ora pitches "brand-coherent packs",
 * and this lib lets us show that as a measurable fact on every result.
 *
 * Design choices for v0:
 *   - Pure client-side. The browser has canvas + ImageData; the server
 *     edge function doesn't (and adding a Deno image library bloats
 *     cold start). Computation happens on the user's machine and is
 *     measured in milliseconds.
 *   - No external deps. ~150 LOC of plain TypeScript.
 *   - Lab colour space (not RGB). RGB distance is perceptually wrong
 *     — two browns can be close in RGB but very different to the eye,
 *     two reds can be far in RGB but indistinguishable. Lab + ΔE76
 *     matches human perception well enough for v0; we can upgrade to
 *     ΔE2000 if scores feel off.
 *   - Coarse bucket-and-count instead of full k-means. We don't need
 *     centroid optimality — just the top-N most common colours. A 5-bit
 *     quantisation (32³ = 32k buckets) collapses neighbouring pixels
 *     into the same bucket and lets us count in a single pass.
 *
 * Future v1: per-shot consistency scoring (do the 6 shots share the
 * same DA?), and brand-mark detection (logo OCR). v0 ships only the
 * palette score because that's the cheapest signal with the highest
 * "wow this actually proves something" payoff.
 */

export interface RGB { r: number; g: number; b: number }
interface Lab { L: number; a: number; b: number }
export interface DominantColor { rgb: RGB; weight: number }

/* ── Colour-space conversions ── */

function rgbToXyz({ r, g, b }: RGB): { x: number; y: number; z: number } {
  // sRGB → linear
  const lin = (v: number) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  // D65 reference white
  return {
    x: R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    y: R * 0.2126729 + G * 0.7151522 + B * 0.0721750,
    z: R * 0.0193339 + G * 0.1191920 + B * 0.9503041,
  };
}

function xyzToLab({ x, y, z }: { x: number; y: number; z: number }): Lab {
  // Reference white D65, ICC values
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
  const fx = f(x / Xn), fy = f(y / Yn), fz = f(z / Zn);
  return { L: (116 * fy) - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function rgbToLab(rgb: RGB): Lab {
  return xyzToLab(rgbToXyz(rgb));
}

/** ΔE76 — Euclidean distance in Lab. Lower = more similar. */
export function deltaE(a: Lab, b: Lab): number {
  const dL = a.L - b.L, dA = a.a - b.a, dB = a.b - b.b;
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

/* ── Palette parsing ── */

/** Parse a hex string (#RRGGBB or #RGB) into RGB. Returns null if invalid. */
export function parseHex(hex: string): RGB | null {
  if (!hex) return null;
  const m = hex.trim().toLowerCase().replace(/^#/, "");
  if (m.length === 3) {
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  return null;
}

/* ── Dominant-colour extraction ── */

const SAMPLE_SIZE = 100;          // downsample target — 100x100 = 10k pixels
const QUANT_BITS = 5;             // 5 bits per channel → 32³ = 32 768 buckets
const QUANT_MASK = ~((1 << (8 - QUANT_BITS)) - 1) & 0xff;
const TOP_N = 8;                  // how many dominant colours to return

/**
 * Extract the dominant colours from an image URL.
 * Skips near-white and near-black pixels that usually come from
 * photographic backgrounds or shadows and inflate the "neutrals" bucket.
 */
export async function extractDominantColors(imageUrl: string, topN: number = TOP_N): Promise<DominantColor[]> {
  const img = await loadImageWithCors(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Skip neutral extremes that don't represent the brand colour story
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 20 || min > 240) continue;
    const qr = r & QUANT_MASK, qg = g & QUANT_MASK, qb = b & QUANT_MASK;
    const key = (qr << 16) | (qg << 8) | qb;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r; bucket.g += g; bucket.b += b; bucket.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const total = Array.from(buckets.values()).reduce((s, x) => s + x.n, 0);
  if (total === 0) return [];

  return Array.from(buckets.values())
    .sort((x, y) => y.n - x.n)
    .slice(0, topN)
    .map((x) => ({
      rgb: { r: Math.round(x.r / x.n), g: Math.round(x.g / x.n), b: Math.round(x.b / x.n) },
      weight: x.n / total,
    }));
}

function loadImageWithCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });
}

/* ── Palette respect score ── */

// ΔE thresholds. Below MATCH = dominant colour is "in" the brand palette
// (full credit). Between MATCH and MISS = partial credit fading linearly
// to zero. Above MISS = no credit (fully off-palette).
const MATCH_DELTA = 18;
const MISS_DELTA = 50;

/**
 * Score a shot's palette against the brand palette.
 * Returns 0-100. 100 = every dominant colour has a near-perfect match in
 * the brand palette. 0 = every dominant colour is far from anything in
 * the brand palette.
 *
 * The score is weighted by pixel coverage — a 60% red wash + 40% near-
 * brand colour scores low if red isn't in the brand palette, even if
 * the smaller wedge matches perfectly.
 */
export function scorePaletteRespect(dominant: DominantColor[], brandPalette: RGB[]): number {
  if (dominant.length === 0) return 0;
  if (brandPalette.length === 0) return 0;
  const brandLab = brandPalette.map(rgbToLab);
  let weightedScore = 0;
  for (const dc of dominant) {
    const lab = rgbToLab(dc.rgb);
    let minD = Infinity;
    for (const bl of brandLab) {
      const d = deltaE(lab, bl);
      if (d < minD) minD = d;
    }
    const matchScore =
      minD <= MATCH_DELTA ? 1 :
      minD >= MISS_DELTA ? 0 :
      1 - (minD - MATCH_DELTA) / (MISS_DELTA - MATCH_DELTA);
    weightedScore += matchScore * dc.weight;
  }
  return Math.round(Math.max(0, Math.min(1, weightedScore)) * 100);
}

/* ── Convenience wrapper for a full pack ── */

export interface ShotFidelity {
  imageUrl: string;
  score: number;
  dominantColors: DominantColor[];
}

export async function scorePack(imageUrls: string[], brandPalette: RGB[]): Promise<{
  packScore: number;
  shots: ShotFidelity[];
}> {
  const shots: ShotFidelity[] = [];
  for (const url of imageUrls) {
    try {
      const dominant = await extractDominantColors(url);
      const score = scorePaletteRespect(dominant, brandPalette);
      shots.push({ imageUrl: url, score, dominantColors: dominant });
    } catch {
      // Skip on load/CORS failure — better to show a partial score than block.
      shots.push({ imageUrl: url, score: 0, dominantColors: [] });
    }
  }
  const valid = shots.filter((s) => s.dominantColors.length > 0);
  const packScore = valid.length > 0
    ? Math.round(valid.reduce((s, x) => s + x.score, 0) / valid.length)
    : 0;
  return { packScore, shots };
}
