import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateTracks, STEPS } from "./tracks";

// Continuous camera & field pose per scene: one unified WebGL world morphs
// smoothly across all ten scenes without resetting.
interface Pose {
  rotY: number;
  rotX: number;
  dist: number;
  x: number;
  y: number;
  glow: number;
  detector: number;
  measure: number;
  modes: [number, number, number, number, number]; // cluster, stream, bimodal, pop, grid
}

const POSES: Pose[] = [
  { rotY: 0.36, rotX: 0.12, dist: 9.2, x: 0, y: 0.1, glow: 1.0, detector: 0.22, measure: 0.0, modes: [1, 0, 0, 0, 0] },        // 01 collision
  { rotY: 1.12, rotX: 0.18, dist: 12.2, x: -3.2, y: 0, glow: 0.28, detector: 0.16, measure: 0.0, modes: [1, 0, 0, 0, 0] },     // 02 hidden signal
  { rotY: 1.5708, rotX: 0.06, dist: 12.8, x: 4.1, y: 0.25, glow: 0.24, detector: 0.20, measure: 1.0, modes: [0.65, 0, 0, 0, 0.35] }, // 03 features
  { rotY: 0.12, rotX: 0.44, dist: 14.8, x: 0, y: -0.9, glow: 0.18, detector: 0.08, measure: 0.0, modes: [0, 1, 0, 0, 0] },     // 04 pipeline
  { rotY: -0.88, rotX: 0.16, dist: 12.6, x: -3.6, y: 0.35, glow: 0.20, detector: 0.09, measure: 0.0, modes: [0, 0.8, 0.2, 0, 0] }, // 05 models
  { rotY: 0.72, rotX: -0.22, dist: 15.6, x: 3.4, y: 1.2, glow: 0.16, detector: 0.07, measure: 0.0, modes: [0, 0, 1, 0, 0] },     // 06 results
  { rotY: 2.05, rotX: 0.22, dist: 14.8, x: -3.2, y: -0.9, glow: 0.26, detector: 0.09, measure: 0.0, modes: [0, 0, 0, 1, 0] },    // 07 scaling
  { rotY: -0.42, rotX: 0.38, dist: 17.0, x: 0, y: 0, glow: 0.10, detector: 0.06, measure: 0.0, modes: [0, 0, 0, 0, 1] },         // 08 workbench
  { rotY: 1.5708, rotX: 0.05, dist: 11.6, x: 0.1, y: 0.15, glow: 0.18, detector: 0.10, measure: 0.0, modes: [0, 0, 0, 0, 1] },   // 09 reproducibility
  { rotY: 0.24, rotX: 0.22, dist: 12.0, x: 0, y: 0.35, glow: 0.82, detector: 0.18, measure: 0.65, modes: [0.35, 0, 0, 0, 0.65] }, // 10 final collision
];

const TRACK_VERT = /* glsl */ `
  attribute float aS;
  attribute float aDelay;
  attribute vec3 aColor;
  uniform float uProgress;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float local = clamp((uProgress - aDelay) / (1.0 - aDelay * 0.6), 0.0, 1.35);
    float visible = step(aS, local);
    float head = 1.0 - smoothstep(0.0, 0.16, local - aS);
    float tail = 1.0 - smoothstep(0.65, 1.0, aS);
    vAlpha = visible * (0.44 * (0.25 + 0.75 * tail) + head * 0.90 * (1.0 - smoothstep(1.0, 1.35, local)));
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TRACK_FRAG = /* glsl */ `
  uniform float uGlow;
  uniform float uTrackFade;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * uGlow * uTrackFade);
  }
`;

const BEAM_VERT = /* glsl */ `
  attribute float aSide;
  attribute float aOffset;
  attribute vec2 aSpread;
  attribute vec3 aColor;
  uniform float uBeam;
  uniform float uBeamFadeIn;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float travel = (1.0 - uBeam) * 12.0;
    float x = aSide * (aOffset * 2.7 + travel);
    float squeeze = mix(1.0, 0.16, uBeam);
    float twist = (1.0 - uBeam) * 3.0 * aSide;
    float c = cos(twist);
    float s = sin(twist);
    vec2 spun = vec2(aSpread.x * c - aSpread.y * s, aSpread.x * s + aSpread.y * c) * squeeze;
    vec3 p = vec3(x, spun.x, spun.y);
    vAlpha = uBeamFadeIn * smoothstep(0.0, 0.28, abs(x)) * (1.0 - smoothstep(0.92, 1.0, uBeam));
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * 25.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const COLOR_POINT_FRAG = /* glsl */ `
  uniform float uGlow;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha * uGlow);
  }
`;

const BURST_VERT = /* glsl */ `
  attribute vec3 aDir;
  attribute float aSpeed;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uBurst;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float isActive = step(0.001, uBurst);
    float travel = (1.0 - exp(-uBurst * 1.45)) * aSpeed * 5.0;
    vec3 p = aDir * travel;
    float fadeIn = smoothstep(0.0, 0.18, uBurst);
    float fadeOut = 1.0 - smoothstep(1.3, 4.8, uBurst);
    vAlpha = isActive * fadeIn * fadeOut * 0.82;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * aSize / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const MORPH_VERT = /* glsl */ `
  attribute vec3 aClusterPos;
  attribute vec3 aStreamPos;
  attribute vec3 aBimodalPos;
  attribute vec3 aPopulationPos;
  attribute vec3 aGridPos;
  attribute float aPhase;
  attribute float aRank;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uModeCluster;
  uniform float uModeStream;
  uniform float uModeBimodal;
  uniform float uModePop;
  uniform float uModeGrid;
  uniform float uPopFraction;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Streaming flow motion along x conduit
    vec3 streamP = aStreamPos;
    streamP.x = mod(streamP.x + uTime * 0.85 + 7.0, 14.0) - 7.0;
    streamP.y += sin(streamP.x * 0.7 + aPhase) * 0.22;

    // Gentle orbital motion in cluster and grid modes
    float ang = uTime * 0.14 + aPhase;
    vec3 clusterP = aClusterPos;
    clusterP.y += sin(ang) * 0.08;
    clusterP.z += cos(ang) * 0.08;

    vec3 p = clusterP * uModeCluster
           + streamP * uModeStream
           + aBimodalPos * uModeBimodal
           + aPopulationPos * uModePop
           + aGridPos * uModeGrid;

    // Population gating when in scaling mode
    float popMask = mix(1.0, step(aRank, uPopFraction), uModePop);
    // Subtle pulse along narrative particle field
    float shimmer = 0.42 + 0.18 * sin(uTime * 0.9 + aPhase * 3.0);
    vAlpha = popMask * shimmer;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * aSize / max(1.2, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const AMBIENT_VERT = /* glsl */ `
  attribute float aOrbitRadius;
  attribute float aOrbitSpeed;
  attribute float aPhase;
  attribute float aSize;
  attribute float aIsOrbital;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 p = position;
    if (aIsOrbital > 0.5) {
      float angle = aPhase + uTime * aOrbitSpeed;
      p.y = cos(angle) * aOrbitRadius;
      p.z = sin(angle) * aOrbitRadius;
      p.x += sin(uTime * 0.22 + aPhase) * 0.18;
      vAlpha = 0.26 + 0.12 * sin(uTime * 0.6 + aPhase * 2.0);
    } else {
      p.x += sin(uTime * 0.12 + aPhase) * 0.25;
      p.y += cos(uTime * 0.10 + aPhase * 1.3) * 0.22;
      vAlpha = 0.16 + 0.09 * sin(uTime * 0.45 + aPhase);
    }
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * aSize / max(1.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = 0.12 + 0.10 * sin(uTime * 0.35 + aPhase);
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uPixelRatio * aSize;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLASH_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = 1.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uPixelRatio * uSize / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * vAlpha * uGlow);
  }
`;

const LATTICE_VERT = /* glsl */ `
  attribute vec3 aChaos;
  attribute vec3 aColor;
  uniform float uResolve;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 target = position;
    float breathe = 1.0 + 0.025 * sin(uTime * 0.7 + target.x * 1.8);
    vec3 p = mix(aChaos, target * breathe, uResolve);
    vAlpha = uResolve * 0.85;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * 26.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function createPrng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Props {
  scene: number;
  step: number;
  reducedMotion: boolean;
  replayKey: number;
  skipped: boolean;
  paused?: boolean;
  populationBudget?: "250k" | "1m" | "2.5m";
}

const POP_FRACTION: Record<"250k" | "1m" | "2.5m", number> = {
  "250k": 0.22,
  "1m": 0.56,
  "2.5m": 1.0,
};

export default function CollisionField({
  scene,
  step,
  reducedMotion,
  replayKey,
  skipped,
  paused = false,
  populationBudget = "2.5m",
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  const stepRef = useRef(step);
  const reducedRef = useRef(reducedMotion);
  const skippedRef = useRef(skipped);
  const pausedRef = useRef(paused);
  const popBudgetRef = useRef(populationBudget);
  const clockStart = useRef(performance.now());
  const pausedAt = useRef<number | null>(null);
  const simTimeRef = useRef(0);
  const [failed, setFailed] = useState(false);

  sceneRef.current = scene;
  stepRef.current = step;
  reducedRef.current = reducedMotion;
  skippedRef.current = skipped;
  popBudgetRef.current = populationBudget;

  useEffect(() => {
    if (paused && !pausedRef.current) {
      pausedAt.current = performance.now();
    } else if (!paused && pausedRef.current && pausedAt.current !== null) {
      clockStart.current += performance.now() - pausedAt.current;
      pausedAt.current = null;
    }
    pausedRef.current = paused;
  }, [paused]);

  // Replay the timeline when asked ("R" key, replay button, first load, or closing scene).
  useEffect(() => {
    clockStart.current = performance.now();
  }, [replayKey]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 120);
    const field = new THREE.Group();
    scene3.add(field);

    const rnd = createPrng(137);
    const C_WHITE = [0.957, 0.945, 0.922];
    const C_SILVER = [0.631, 0.631, 0.667];
    const C_VIOLET = [0.655, 0.545, 0.98];
    const C_MAGENTA = [0.851, 0.275, 0.937];
    const C_GOLD = [0.941, 0.725, 0.353];

    // --- 1. quiet deep-field backdrop (very restrained) --------------------
    const starCount = 120;
    const starPos = new Float32Array(starCount * 3);
    const starPhase = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    const starColor = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = rnd() * 2 - 1;
      const theta = rnd() * Math.PI * 2;
      const rad = 24 + rnd() * 24;
      const s = Math.sqrt(1 - u * u);
      starPos[i * 3] = rad * s * Math.cos(theta);
      starPos[i * 3 + 1] = rad * s * Math.sin(theta);
      starPos[i * 3 + 2] = rad * u - 8;
      starPhase[i] = rnd() * Math.PI * 2;
      starSize[i] = 1.0 + rnd() * 1.4;
      const c = rnd() < 0.78 ? C_SILVER : rnd() < 0.7 ? C_WHITE : C_GOLD;
      starColor.set(c, i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(starPhase, 1));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
    starGeo.setAttribute("aColor", new THREE.BufferAttribute(starColor, 3));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 0.75 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene3.add(stars);

    // --- 2. orbital detector-plane particles --------------------------------
    const ambientCount = 120;
    const ambPos = new Float32Array(ambientCount * 3);
    const ambOrbitR = new Float32Array(ambientCount);
    const ambSpeed = new Float32Array(ambientCount);
    const ambPhase = new Float32Array(ambientCount);
    const ambSize = new Float32Array(ambientCount);
    const ambIsOrbital = new Float32Array(ambientCount);
    const ambColor = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      const orbital = i < 72;
      ambIsOrbital[i] = orbital ? 1 : 0;
      ambPhase[i] = rnd() * Math.PI * 2;
      if (orbital) {
        const ringChoice = [1.15, 2.35, 3.75][i % 3];
        ambOrbitR[i] = ringChoice + (rnd() - 0.5) * 0.22;
        ambSpeed[i] = (0.09 + rnd() * 0.09) * (i % 2 === 0 ? 1 : -1);
        ambPos[i * 3] = (rnd() - 0.5) * 6.4;
        ambSize[i] = 10 + rnd() * 10;
        ambColor.set(i % 4 === 0 ? C_GOLD : i % 2 === 0 ? C_VIOLET : C_SILVER, i * 3);
      } else {
        ambOrbitR[i] = 0;
        ambSpeed[i] = 0;
        ambPos[i * 3] = (rnd() - 0.5) * 15;
        ambPos[i * 3 + 1] = (rnd() - 0.5) * 8;
        ambPos[i * 3 + 2] = (rnd() - 0.5) * 9;
        ambSize[i] = 9 + rnd() * 11;
        ambColor.set(rnd() < 0.5 ? C_SILVER : rnd() < 0.65 ? C_VIOLET : C_WHITE, i * 3);
      }
    }
    const ambGeo = new THREE.BufferGeometry();
    ambGeo.setAttribute("position", new THREE.BufferAttribute(ambPos, 3));
    ambGeo.setAttribute("aOrbitRadius", new THREE.BufferAttribute(ambOrbitR, 1));
    ambGeo.setAttribute("aOrbitSpeed", new THREE.BufferAttribute(ambSpeed, 1));
    ambGeo.setAttribute("aPhase", new THREE.BufferAttribute(ambPhase, 1));
    ambGeo.setAttribute("aSize", new THREE.BufferAttribute(ambSize, 1));
    ambGeo.setAttribute("aIsOrbital", new THREE.BufferAttribute(ambIsOrbital, 1));
    ambGeo.setAttribute("aColor", new THREE.BufferAttribute(ambColor, 3));
    const ambMat = new THREE.ShaderMaterial({
      vertexShader: AMBIENT_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ambientPts = new THREE.Points(ambGeo, ambMat);
    ambientPts.frustumCulled = false;
    field.add(ambientPts);

    // --- 3. continuous narrative particle population (1,200 GPU points) -----
    const morphCount = 1200;
    const mCluster = new Float32Array(morphCount * 3);
    const mStream = new Float32Array(morphCount * 3);
    const mBimodal = new Float32Array(morphCount * 3);
    const mPop = new Float32Array(morphCount * 3);
    const mGrid = new Float32Array(morphCount * 3);
    const mPhase = new Float32Array(morphCount);
    const mRank = new Float32Array(morphCount);
    const mSize = new Float32Array(morphCount);
    const mColor = new Float32Array(morphCount * 3);
    const jetPhis = [0.55, 2.25, 3.85, 5.15];
    for (let i = 0; i < morphCount; i++) {
      // Cluster mode: 4 jet energy cones
      const j = i % 4;
      const dist = 0.8 + Math.pow(rnd(), 0.9) * 3.8;
      const coneR = dist * 0.22 * rnd();
      const ca = rnd() * Math.PI * 2;
      const jp = jetPhis[j] + Math.cos(ca) * coneR * 0.35;
      mCluster[i * 3] = (j % 2 === 0 ? 1 : -1) * dist * 0.45 + Math.sin(ca) * coneR;
      mCluster[i * 3 + 1] = Math.cos(jp) * dist;
      mCluster[i * 3 + 2] = Math.sin(jp) * dist;

      // Stream mode: horizontal/serpentine data conduit
      const sx = (rnd() - 0.5) * 14.0;
      const sr = 0.25 + rnd() * 0.75;
      const sa = rnd() * Math.PI * 2;
      mStream[i * 3] = sx;
      mStream[i * 3 + 1] = Math.cos(sa) * sr;
      mStream[i * 3 + 2] = Math.sin(sa) * sr;

      // Bimodal mode: separated Signal vs Background probability distributions
      const isSig = i % 2 === 0;
      const bx = (isSig ? 2.2 : -2.2) + (rnd() - 0.5) * 1.6;
      const bu = rnd() * 2 - 1;
      const bphi = rnd() * Math.PI * 2;
      const brad = Math.pow(rnd(), 0.7) * 1.45;
      const bs = Math.sqrt(1 - bu * bu);
      mBimodal[i * 3] = bx;
      mBimodal[i * 3 + 1] = bs * Math.cos(bphi) * brad;
      mBimodal[i * 3 + 2] = bs * Math.sin(bphi) * brad;

      // Population mode: expanding dataset shell (250k -> 1M -> 2.5M)
      const pu = rnd() * 2 - 1;
      const pphi = rnd() * Math.PI * 2;
      const prad = 1.0 + Math.pow(rnd(), 0.65) * 3.8;
      const ps = Math.sqrt(1 - pu * pu);
      mPop[i * 3] = pu * prad * 0.85;
      mPop[i * 3 + 1] = ps * Math.cos(pphi) * prad;
      mPop[i * 3 + 2] = ps * Math.sin(pphi) * prad;

      // Grid / stratified 70/15/15 mode
      const col = i % 40;
      const row = Math.floor(i / 40);
      mGrid[i * 3] = (col - 19.5) * 0.24;
      mGrid[i * 3 + 1] = (row - 14.5) * 0.19;
      mGrid[i * 3 + 2] = (i % 3 === 0 ? -0.4 : i % 3 === 1 ? 0 : 0.4);

      mPhase[i] = rnd() * Math.PI * 2;
      mRank[i] = i / morphCount;
      mSize[i] = 10 + rnd() * 14;
      const colChoice = i % 7 === 0 ? C_GOLD : i % 3 === 0 ? C_MAGENTA : i % 2 === 0 ? C_VIOLET : C_SILVER;
      mColor.set(colChoice, i * 3);
    }
    const morphGeo = new THREE.BufferGeometry();
    morphGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(morphCount * 3), 3));
    morphGeo.setAttribute("aClusterPos", new THREE.BufferAttribute(mCluster, 3));
    morphGeo.setAttribute("aStreamPos", new THREE.BufferAttribute(mStream, 3));
    morphGeo.setAttribute("aBimodalPos", new THREE.BufferAttribute(mBimodal, 3));
    morphGeo.setAttribute("aPopulationPos", new THREE.BufferAttribute(mPop, 3));
    morphGeo.setAttribute("aGridPos", new THREE.BufferAttribute(mGrid, 3));
    morphGeo.setAttribute("aPhase", new THREE.BufferAttribute(mPhase, 1));
    morphGeo.setAttribute("aRank", new THREE.BufferAttribute(mRank, 1));
    morphGeo.setAttribute("aSize", new THREE.BufferAttribute(mSize, 1));
    morphGeo.setAttribute("aColor", new THREE.BufferAttribute(mColor, 3));
    const morphMat = new THREE.ShaderMaterial({
      vertexShader: MORPH_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: 0.7 },
        uModeCluster: { value: 1 },
        uModeStream: { value: 0 },
        uModeBimodal: { value: 0 },
        uModePop: { value: 0 },
        uModeGrid: { value: 0 },
        uPopFraction: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const morphPts = new THREE.Points(morphGeo, morphMat);
    morphPts.frustumCulled = false;
    field.add(morphPts);

    // --- 4. curved helical trajectories -------------------------------------
    const tracks = generateTracks();
    const segs = tracks.length * STEPS;
    const pos = new Float32Array(segs * 6);
    const aS = new Float32Array(segs * 2);
    const aDelay = new Float32Array(segs * 2);
    const aColor = new Float32Array(segs * 6);
    let k = 0;
    for (const t of tracks) {
      for (let i = 0; i < STEPS; i++) {
        for (let e = 0; e < 2; e++) {
          const p = t.points[i + e];
          pos.set(p, k * 3);
          aS[k] = (i + e) / STEPS;
          aDelay[k] = t.delay;
          aColor.set(t.color, k * 3);
          k++;
        }
      }
    }
    const trackGeo = new THREE.BufferGeometry();
    trackGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    trackGeo.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    trackGeo.setAttribute("aDelay", new THREE.BufferAttribute(aDelay, 1));
    trackGeo.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    const trackMat = new THREE.ShaderMaterial({
      vertexShader: TRACK_VERT,
      fragmentShader: TRACK_FRAG,
      uniforms: { uProgress: { value: 0 }, uGlow: { value: 1 }, uTrackFade: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    field.add(new THREE.LineSegments(trackGeo, trackMat));

    // --- 5. two incoming particle streams -----------------------------------
    const beamCount = 560;
    const side = new Float32Array(beamCount);
    const offset = new Float32Array(beamCount);
    const spread = new Float32Array(beamCount * 2);
    const beamColor = new Float32Array(beamCount * 3);
    for (let i = 0; i < beamCount; i++) {
      side[i] = i % 2 === 0 ? -1 : 1;
      offset[i] = Math.pow(rnd(), 1.6);
      const r = Math.pow(rnd(), 2) * 0.24;
      const a = rnd() * Math.PI * 2;
      spread[i * 2] = Math.cos(a) * r;
      spread[i * 2 + 1] = Math.sin(a) * r;
      const c = i % 5 === 0 ? C_GOLD : i % 2 === 0 ? C_WHITE : C_VIOLET;
      beamColor.set(c, i * 3);
    }
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(beamCount * 3), 3));
    beamGeo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    beamGeo.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
    beamGeo.setAttribute("aSpread", new THREE.BufferAttribute(spread, 2));
    beamGeo.setAttribute("aColor", new THREE.BufferAttribute(beamColor, 3));
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uBeam: { value: 0 }, uBeamFadeIn: { value: 1 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beams = new THREE.Points(beamGeo, beamMat);
    beams.frustumCulled = false;
    field.add(beams);

    // --- 6. expanding collision particle shower -----------------------------
    const burstCount = 280;
    const burstDir = new Float32Array(burstCount * 3);
    const burstSpeed = new Float32Array(burstCount);
    const burstSize = new Float32Array(burstCount);
    const burstColor = new Float32Array(burstCount * 3);
    for (let i = 0; i < burstCount; i++) {
      const u = rnd() * 2 - 1;
      const phi = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      burstDir[i * 3] = u * 0.65;
      burstDir[i * 3 + 1] = s * Math.cos(phi);
      burstDir[i * 3 + 2] = s * Math.sin(phi);
      burstSpeed[i] = 0.45 + Math.pow(rnd(), 1.4) * 1.25;
      burstSize[i] = 14 + rnd() * 22;
      const c = i % 4 === 0 ? C_GOLD : i % 3 === 0 ? C_MAGENTA : i % 2 === 0 ? C_VIOLET : C_WHITE;
      burstColor.set(c, i * 3);
    }
    const burstGeo = new THREE.BufferGeometry();
    burstGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(burstCount * 3), 3));
    burstGeo.setAttribute("aDir", new THREE.BufferAttribute(burstDir, 3));
    burstGeo.setAttribute("aSpeed", new THREE.BufferAttribute(burstSpeed, 1));
    burstGeo.setAttribute("aSize", new THREE.BufferAttribute(burstSize, 1));
    burstGeo.setAttribute("aColor", new THREE.BufferAttribute(burstColor, 3));
    const burstMat = new THREE.ShaderMaterial({
      vertexShader: BURST_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uBurst: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const burstPts = new THREE.Points(burstGeo, burstMat);
    burstPts.frustumCulled = false;
    field.add(burstPts);

    // --- 7. restrained luminous collision flash -----------------------------
    const flashGeo = new THREE.BufferGeometry();
    flashGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const flashMat = new THREE.ShaderMaterial({
      vertexShader: FLASH_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uSize: { value: 0 }, uPixelRatio: { value: pixelRatio }, uColor: { value: new THREE.Color(0.97, 0.85, 0.62) }, uGlow: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    field.add(new THREE.Points(flashGeo, flashMat));

    // --- 8. detector-inspired geometric structures --------------------------
    const detectorMat = new THREE.LineBasicMaterial({ color: 0xa1a1aa, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
    const detectorAccentMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = (radius: number, x: number, segsCount = 96, mat = detectorMat) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segsCount; i++) {
        const a = (i / segsCount) * Math.PI * 2;
        pts.push(new THREE.Vector3(x, Math.cos(a) * radius, Math.sin(a) * radius));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    };
    for (const r of [1.15, 2.35, 3.75]) {
      for (const x of [-3.3, 0, 3.3]) field.add(ring(r, x));
    }
    for (const x of [-3.3, 3.3]) field.add(ring(4.55, x, 12, detectorAccentMat));

    const staves: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      staves.push(new THREE.Vector3(-3.3, Math.cos(a) * 3.75, Math.sin(a) * 3.75), new THREE.Vector3(3.3, Math.cos(a) * 3.75, Math.sin(a) * 3.75));
      staves.push(new THREE.Vector3(0, Math.cos(a) * 3.75, Math.sin(a) * 3.75), new THREE.Vector3(0, Math.cos(a) * 3.92, Math.sin(a) * 3.92));
    }
    staves.push(new THREE.Vector3(-14, 0, 0), new THREE.Vector3(14, 0, 0));
    field.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(staves), detectorMat));

    // --- 9. 3D measurement markers & 7 invariant-mass chords ----------------
    const markerCount = 21;
    const markerPos = new Float32Array(markerCount * 3);
    const markerColor = new Float32Array(markerCount * 3);
    const markerVecs: THREE.Vector3[] = [];
    for (let i = 0; i < markerCount; i++) {
      const t = tracks[(i * 7) % tracks.length];
      const pt = t.points[Math.min(STEPS, 48 + (i % 3) * 14)];
      markerPos.set(pt, i * 3);
      markerColor.set(i % 3 === 0 ? C_GOLD : C_VIOLET, i * 3);
      markerVecs.push(new THREE.Vector3(pt[0], pt[1], pt[2]));
    }
    const markerGeo = new THREE.BufferGeometry();
    markerGeo.setAttribute("position", new THREE.BufferAttribute(markerPos, 3));
    markerGeo.setAttribute("aColor", new THREE.BufferAttribute(markerColor, 3));
    const markerMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = 0.92;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPixelRatio * 48.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uPixelRatio: { value: pixelRatio }, uGlow: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const markerPts = new THREE.Points(markerGeo, markerMat);
    field.add(markerPts);

    const chordVerts: THREE.Vector3[] = [];
    for (let i = 0; i < 7; i++) {
      chordVerts.push(markerVecs[i * 2], markerVecs[(i * 2 + 5) % markerCount]);
    }
    const chordMat = new THREE.LineBasicMaterial({ color: 0xf0b95a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const chordLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(chordVerts), chordMat);
    field.add(chordLines);

    // --- 10. Scene 10 coherent data structure (event -> ML manifold) --------
    const latticeCount = 128;
    const latPos = new Float32Array(latticeCount * 3);
    const latChaos = new Float32Array(latticeCount * 3);
    const latColor = new Float32Array(latticeCount * 3);
    const latVecs: THREE.Vector3[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < latticeCount; i++) {
      const shell = i < 48 ? 1.05 : 1.75;
      const idx = i < 48 ? i : i - 48;
      const tot = i < 48 ? 48 : latticeCount - 48;
      const y = 1 - (idx / (tot - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * idx;
      const tx = Math.cos(theta) * r * shell;
      const ty = y * shell * 0.68 + 0.12;
      const tz = Math.sin(theta) * r * shell;
      latPos[i * 3] = tx;
      latPos[i * 3 + 1] = ty;
      latPos[i * 3 + 2] = tz;
      latVecs.push(new THREE.Vector3(tx, ty, tz));

      const cRad = 3.2 + rnd() * 3.6;
      const cA = rnd() * Math.PI * 2;
      const cU = rnd() * 2 - 1;
      const cS = Math.sqrt(1 - cU * cU);
      latChaos[i * 3] = cU * cRad * 0.9;
      latChaos[i * 3 + 1] = cS * Math.cos(cA) * cRad;
      latChaos[i * 3 + 2] = cS * Math.sin(cA) * cRad;

      const c = i < 48 ? (i % 3 === 0 ? C_GOLD : C_WHITE) : (i % 4 === 0 ? C_MAGENTA : C_VIOLET);
      latColor.set(c, i * 3);
    }
    const latticeGeo = new THREE.BufferGeometry();
    latticeGeo.setAttribute("position", new THREE.BufferAttribute(latPos, 3));
    latticeGeo.setAttribute("aChaos", new THREE.BufferAttribute(latChaos, 3));
    latticeGeo.setAttribute("aColor", new THREE.BufferAttribute(latColor, 3));
    const latticeMat = new THREE.ShaderMaterial({
      vertexShader: LATTICE_VERT,
      fragmentShader: COLOR_POINT_FRAG,
      uniforms: { uResolve: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const latticePts = new THREE.Points(latticeGeo, latticeMat);
    latticePts.frustumCulled = false;
    field.add(latticePts);

    const edgeVerts: THREE.Vector3[] = [];
    for (let i = 0; i < latticeCount; i++) {
      for (let j = i + 1; j < latticeCount; j++) {
        if (latVecs[i].distanceTo(latVecs[j]) < 0.72) {
          edgeVerts.push(latVecs[i], latVecs[j]);
        }
      }
    }
    const latticeEdgeMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const latticeEdges = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgeVerts), latticeEdgeMat);
    field.add(latticeEdges);

    const resize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const cur: Pose = {
      ...POSES[sceneRef.current],
      modes: [...POSES[sceneRef.current].modes],
    };
    let resolveAmt = sceneRef.current === 9 ? 1 : 0;
    let popFracCur = POP_FRACTION[popBudgetRef.current];
    let raf = 0;
    let lastFrame = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const isPaused = pausedRef.current;
      const dt = isPaused ? 0 : Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      if (!isPaused) simTimeRef.current += dt;
      const instant = reducedRef.current || skippedRef.current;
      const activeNow = isPaused && pausedAt.current !== null ? pausedAt.current : now;
      const t = instant ? 99 : (activeNow - clockStart.current) / 1000;
      const uTime = reducedRef.current ? 0 : simTimeRef.current;

      // Scene 01 opening choreography:
      // 0.0-0.9s near darkness -> detector emerges -> 0.35-1.55s two beams converge -> 1.55s collision burst & tracks
      const isOpening = sceneRef.current === 0;
      const detectorIntro = isOpening ? smoothstep(0.18, 1.05, t) : 1.0;
      const beamIntro = isOpening ? smoothstep(0.3, 0.75, t) : 1.0;
      const beam = Math.min(1, Math.max(0, (t - 0.3) / 1.25));
      const burst = t - 1.55;

      beamMat.uniforms.uBeam.value = beam * beam;
      beamMat.uniforms.uBeamFadeIn.value = beamIntro;
      burstMat.uniforms.uBurst.value = Math.max(0, burst);
      trackMat.uniforms.uProgress.value = burst <= 0 ? 0 : ease(burst / 3.2) * 1.35;
      const flash = burst <= 0 ? 0 : Math.exp(-burst * 2.4);
      flashMat.uniforms.uSize.value = 860 * flash + 46;
      flashMat.uniforms.uGlow.value = flash * 0.9 + 0.08 * cur.glow;

      const target = POSES[sceneRef.current];
      const rate = instant ? 1 : 1 - Math.exp(-dt * 2.4);
      cur.rotY += (target.rotY - cur.rotY) * rate;
      cur.rotX += (target.rotX - cur.rotX) * rate;
      cur.dist += (target.dist - cur.dist) * rate;
      cur.x += (target.x - cur.x) * rate;
      cur.y += (target.y - cur.y) * rate;
      cur.glow += (target.glow - cur.glow) * rate;
      cur.detector += (target.detector - cur.detector) * rate;
      cur.measure += (target.measure - cur.measure) * rate;
      for (let m = 0; m < 5; m++) {
        cur.modes[m] += (target.modes[m] - cur.modes[m]) * rate;
      }

      const wantPop = POP_FRACTION[popBudgetRef.current];
      popFracCur += (wantPop - popFracCur) * rate;

      const wantResolve = sceneRef.current === 9 && (instant || burst > 1.3) ? 1 : 0;
      resolveAmt += (wantResolve - resolveAmt) * (instant ? 1 : 1 - Math.exp(-dt * 1.6));
      latticeMat.uniforms.uResolve.value = resolveAmt;
      latticeMat.uniforms.uTime.value = uTime;
      latticeMat.uniforms.uGlow.value = cur.glow;
      latticeEdgeMat.opacity = resolveAmt * cur.glow * 0.24;
      trackMat.uniforms.uTrackFade.value = 1 - resolveAmt * 0.25;

      // Measurement markers & invariant-mass chords illuminate in Scene 3 (all steps) and Scene 10
      const measureBoost = sceneRef.current === 2 ? (stepRef.current >= 1 ? 1.0 : 0.45) : resolveAmt;
      markerMat.uniforms.uGlow.value = cur.measure * measureBoost;
      chordMat.opacity = cur.measure * measureBoost * 0.42;

      morphMat.uniforms.uTime.value = uTime;
      morphMat.uniforms.uGlow.value = (isOpening ? smoothstep(1.3, 2.5, t) : 1.0) * (0.25 + cur.glow * 0.55);
      morphMat.uniforms.uModeCluster.value = cur.modes[0];
      morphMat.uniforms.uModeStream.value = cur.modes[1];
      morphMat.uniforms.uModeBimodal.value = cur.modes[2];
      morphMat.uniforms.uModePop.value = cur.modes[3];
      morphMat.uniforms.uModeGrid.value = cur.modes[4];
      morphMat.uniforms.uPopFraction.value = popFracCur;

      field.rotation.y = cur.rotY + Math.sin(uTime * 0.07) * 0.1 + resolveAmt * 0.08 * Math.sin(uTime * 0.25);
      field.rotation.x = cur.rotX + Math.sin(uTime * 0.05) * 0.04;
      stars.rotation.y = cur.rotY * 0.15 + uTime * 0.004;

      camera.position.set(cur.x, cur.y, cur.dist);
      camera.lookAt(cur.x, cur.y * 0.6, 0);

      starMat.uniforms.uTime.value = uTime;
      starMat.uniforms.uGlow.value = isOpening ? smoothstep(0.2, 1.4, t) * 0.8 : 0.75;
      ambMat.uniforms.uTime.value = uTime;
      ambMat.uniforms.uGlow.value = (isOpening ? smoothstep(0.25, 1.3, t) : 1.0) * (0.3 + cur.glow * 0.65);
      trackMat.uniforms.uGlow.value = cur.glow;
      beamMat.uniforms.uGlow.value = cur.glow;
      burstMat.uniforms.uGlow.value = cur.glow;
      detectorMat.opacity = detectorIntro * cur.detector * 0.45;
      detectorAccentMat.opacity = detectorIntro * cur.detector * 0.3;

      renderer.render(scene3, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      starGeo.dispose();
      ambGeo.dispose();
      morphGeo.dispose();
      trackGeo.dispose();
      beamGeo.dispose();
      burstGeo.dispose();
      flashGeo.dispose();
      markerGeo.dispose();
      chordLines.geometry.dispose();
      latticeGeo.dispose();
      latticeEdges.geometry.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return <StaticField dim={scene !== 0 && scene !== 9} />;
  return <div ref={mount} className="field" aria-hidden="true" />;
}

// Fallback when WebGL is unavailable: the same tracks, projected to a static SVG.
function StaticField({ dim }: { dim: boolean }) {
  const tracks = generateTracks(120);
  return (
    <svg className="field field-static" viewBox="-8 -4.5 16 9" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ opacity: dim ? 0.18 : 0.8 }}>
      {tracks.map((t, i) => (
        <polyline
          key={i}
          fill="none"
          strokeWidth={0.012}
          stroke={`rgb(${t.color.map((c) => Math.round(c * 255)).join(",")})`}
          strokeOpacity={0.5}
          points={t.points.map((p) => `${(p[0] * 0.9 + p[2] * 0.35).toFixed(3)},${(-p[1]).toFixed(3)}`).join(" ")}
        />
      ))}
    </svg>
  );
}
