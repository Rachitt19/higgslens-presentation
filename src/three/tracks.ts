// Deterministic generator for the conceptual collision field. These tracks
// are an artistic visualisation in the style of a collider event display;
// they are not actual measured Higgs events or drawn from the HIGGS dataset.

export interface Track {
  points: [number, number, number][]; // x = beam axis, (y, z) = transverse plane
  color: [number, number, number];
  delay: number; // 0..1, staggered start
  clusterIndex: number; // 0..3 conceptual jet cluster, -1 for isolated lepton/soft
  isBJet: boolean;
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

// Quantum Noir palette: Stellar White, Muted Silver, Quantum Violet, Particle Magenta, Energy Gold
const VIOLET: [number, number, number] = [0.655, 0.545, 0.98];   // #A78BFA
const MAGENTA: [number, number, number] = [0.851, 0.275, 0.937]; // #D946EF
const GOLD: [number, number, number] = [0.941, 0.725, 0.353];    // #F0B95A
const WHITE: [number, number, number] = [0.957, 0.945, 0.922];   // #F4F1EB
const SILVER: [number, number, number] = [0.631, 0.631, 0.667];  // #A1A1AA

const JET_AXES = [
  { eta: 0.75, phi: 0.55, b: true },
  { eta: -0.65, phi: 2.25, b: true },
  { eta: 1.05, phi: 3.85, b: false },
  { eta: -0.95, phi: 5.15, b: false },
];

const SOFT_PALETTE: [number, number, number][] = [VIOLET, VIOLET, SILVER, SILVER, MAGENTA];
const STIFF_PALETTE: [number, number, number][] = [GOLD, GOLD, WHITE, MAGENTA, VIOLET];

export const STEPS = 96;

export function generateTracks(count = 175, seed = 42): Track[] {
  const rnd = mulberry32(seed);
  const tracks: Track[] = [];
  for (let i = 0; i < count; i++) {
    // ~65% clustered into 4 conceptual jet cones; ~35% wide-angle tracks & isolated lepton candidates
    const inJet = i < Math.floor(count * 0.66);
    const clusterIndex = inJet ? i % 4 : -1;
    const axis = inJet ? JET_AXES[clusterIndex] : null;
    const isBJet = axis ? axis.b : false;

    const eta = axis ? axis.eta + (rnd() - 0.5) * 0.65 : (rnd() - 0.5) * 4.0;
    let phi = axis ? axis.phi + (rnd() - 0.5) * 0.42 : rnd() * Math.PI * 2;
    const pt = axis
      ? 0.35 + Math.pow(rnd(), 1.8) * 3.1
      : 0.16 + Math.pow(rnd(), 2.2) * 3.4;

    const charge = rnd() < 0.5 ? -1 : 1;
    const radius = 0.55 + pt * 3.55; // curvature radius in a conceptual solenoidal field
    const length = axis ? 3.0 + rnd() * 4.4 : 2.5 + rnd() * 4.8;
    const ds = length / STEPS;
    const dx = Math.sinh(eta) * 0.38;
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

    const stiff = pt > 1.55;
    let color: [number, number, number];
    if (isBJet && rnd() < 0.55) {
      color = rnd() < 0.65 ? MAGENTA : GOLD;
    } else if (stiff) {
      color = STIFF_PALETTE[Math.floor(rnd() * STIFF_PALETTE.length)];
    } else {
      color = SOFT_PALETTE[Math.floor(rnd() * SOFT_PALETTE.length)];
    }

    tracks.push({ points, color, delay: rnd() * 0.34, clusterIndex, isBJet });
  }
  return tracks;
}
