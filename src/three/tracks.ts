// Deterministic generator for the decorative collision field. These tracks
// are an illustration in the style of a collider event display; they are not
// drawn from the HIGGS dataset.

export interface Track {
  points: [number, number, number][]; // x = beam axis, (y, z) = transverse plane
  color: [number, number, number];
  delay: number; // 0..1, staggered start
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE: [number, number, number][] = [
  [0.31, 0.85, 0.92], // cyan
  [0.31, 0.85, 0.92],
  [0.3, 0.49, 1.0], // blue
  [0.3, 0.49, 1.0],
  [0.61, 0.48, 1.0], // violet
  [0.95, 0.7, 0.29], // amber
];

export const STEPS = 72;

export function generateTracks(count = 170, seed = 42): Track[] {
  const rnd = mulberry32(seed);
  const tracks: Track[] = [];
  for (let i = 0; i < count; i++) {
    const eta = (rnd() - 0.5) * 4.2;
    let phi = rnd() * Math.PI * 2;
    const pt = 0.15 + Math.pow(rnd(), 2.2) * 3.2; // most tracks soft, a few stiff
    const charge = rnd() < 0.5 ? -1 : 1;
    const radius = 0.5 + pt * 3.4; // curvature radius in the solenoid field
    const length = 2.4 + rnd() * 4.6;
    const ds = length / STEPS;
    const dx = Math.sinh(eta) * 0.42;
    let x = 0;
    let y = 0;
    let z = 0;
    const points: [number, number, number][] = [[0, 0, 0]];
    for (let s = 0; s < STEPS; s++) {
      phi += (charge * ds) / radius;
      y += Math.cos(phi) * ds;
      z += Math.sin(phi) * ds;
      x += dx * ds;
      points.push([x, y, z]);
    }
    const stiff = pt > 1.6;
    const color = stiff && rnd() < 0.5 ? PALETTE[5] : PALETTE[Math.floor(rnd() * 5)];
    tracks.push({ points, color, delay: rnd() * 0.35 });
  }
  return tracks;
}
