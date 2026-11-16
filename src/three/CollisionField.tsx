import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateTracks, STEPS } from "./tracks";

// Camera/field pose per scene: the same conceptual collision environment is
// framed from a distinct angle and quietness level in every scene.
interface Pose {
  rotY: number;
  rotX: number;
  dist: number;
  x: number;
  y: number;
  glow: number; // overall brightness of the field
}

const POSES: Pose[] = [
  { rotY: 0.36, rotX: 0.12, dist: 9.2, x: 0, y: 0.1, glow: 1.0 },       // 01 collision
  { rotY: 1.18, rotX: 0.2, dist: 12.2, x: -3.2, y: 0, glow: 0.22 },    // 02 problem
  { rotY: 1.5708, rotX: 0.04, dist: 13.2, x: 4.5, y: 0.35, glow: 0.15 }, // 03 features
  { rotY: 0.12, rotX: 0.48, dist: 15.2, x: 0, y: -1.1, glow: 0.14 },   // 04 pipeline
  { rotY: -0.92, rotX: 0.16, dist: 12.6, x: -3.8, y: 0.4, glow: 0.16 }, // 05 models
  { rotY: 0.72, rotX: -0.28, dist: 16.0, x: 3.6, y: 1.5, glow: 0.11 }, // 06 results
  { rotY: 2.15, rotX: 0.25, dist: 15.2, x: -3.5, y: -1.2, glow: 0.11 }, // 07 scaling
  { rotY: -0.42, rotX: 0.38, dist: 17.2, x: 0, y: 0, glow: 0.08 },     // 08 workbench
  { rotY: 1.5708, rotX: 0.05, dist: 11.4, x: 0.2, y: 0.2, glow: 0.14 }, // 09 reproducibility
  { rotY: 0.24, rotX: 0.22, dist: 12.2, x: 0, y: 0.35, glow: 0.78 },   // 10 conclusion
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
    float head = 1.0 - smoothstep(0.0, 0.15, local - aS);
    float tail = 1.0 - smoothstep(0.65, 1.0, aS);
    vAlpha = visible * (0.42 * (0.25 + 0.75 * tail) + head * 0.85 * (1.0 - smoothstep(1.0, 1.35, local)));
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
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float travel = (1.0 - uBeam) * 11.5;
    float x = aSide * (aOffset * 2.6 + travel);
    float squeeze = mix(1.0, 0.18, uBeam);
    float twist = (1.0 - uBeam) * 2.8 * aSide;
    float c = cos(twist);
    float s = sin(twist);
    vec2 spun = vec2(aSpread.x * c - aSpread.y * s, aSpread.x * s + aSpread.y * c) * squeeze;
    vec3 p = vec3(x, spun.x, spun.y);
    vAlpha = smoothstep(0.0, 0.28, abs(x)) * (1.0 - smoothstep(0.92, 1.0, uBeam));
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * 24.0 / -mv.z;
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
    float travel = (1.0 - exp(-uBurst * 1.45)) * aSpeed * 4.8;
    vec3 p = aDir * travel;
    float fadeIn = smoothstep(0.0, 0.18, uBurst);
    float fadeOut = 1.0 - smoothstep(1.2, 4.6, uBurst);
    vAlpha = isActive * fadeIn * fadeOut * 0.78;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * aSize / -mv.z;
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
      vAlpha = 0.24 + 0.12 * sin(uTime * 0.6 + aPhase * 2.0);
    } else {
      p.x += sin(uTime * 0.12 + aPhase) * 0.25;
      p.y += cos(uTime * 0.10 + aPhase * 1.3) * 0.22;
      vAlpha = 0.18 + 0.10 * sin(uTime * 0.45 + aPhase);
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
    vAlpha = 0.14 + 0.12 * sin(uTime * 0.35 + aPhase);
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
    // Gentle crystalline breathing once resolved
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
  reducedMotion: boolean;
  replayKey: number;
}

export default function CollisionField({ scene, reducedMotion, replayKey }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  const reducedRef = useRef(reducedMotion);
  const clockStart = useRef(performance.now());
  const [failed, setFailed] = useState(false);
  sceneRef.current = scene;
  reducedRef.current = reducedMotion;

  // Replay the collision when asked (first load, "R", and the closing scene).
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

    // --- 1. subtle distant star field (static in world, faint parallax) ----
    const starCount = 160;
    const starPos = new Float32Array(starCount * 3);
    const starPhase = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    const starColor = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = rnd() * 2 - 1;
      const theta = rnd() * Math.PI * 2;
      const rad = 22 + rnd() * 24;
      const s = Math.sqrt(1 - u * u);
      starPos[i * 3] = rad * s * Math.cos(theta);
      starPos[i * 3 + 1] = rad * s * Math.sin(theta);
      starPos[i * 3 + 2] = rad * u - 8;
      starPhase[i] = rnd() * Math.PI * 2;
      starSize[i] = 1.1 + rnd() * 1.6;
      const c = rnd() < 0.75 ? C_SILVER : rnd() < 0.7 ? C_WHITE : C_GOLD;
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
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 0.9 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene3.add(stars);

    // --- 2. sparse floating & subtle orbital particles ----------------------
    const ambientCount = 140;
    const ambPos = new Float32Array(ambientCount * 3);
    const ambOrbitR = new Float32Array(ambientCount);
    const ambSpeed = new Float32Array(ambientCount);
    const ambPhase = new Float32Array(ambientCount);
    const ambSize = new Float32Array(ambientCount);
    const ambIsOrbital = new Float32Array(ambientCount);
    const ambColor = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      const orbital = i < 64;
      ambIsOrbital[i] = orbital ? 1 : 0;
      ambPhase[i] = rnd() * Math.PI * 2;
      if (orbital) {
        const ringChoice = [1.2, 2.35, 3.75][i % 3];
        ambOrbitR[i] = ringChoice + (rnd() - 0.5) * 0.25;
        ambSpeed[i] = (0.08 + rnd() * 0.1) * (i % 2 === 0 ? 1 : -1);
        ambPos[i * 3] = (rnd() - 0.5) * 6.4;
        ambPos[i * 3 + 1] = 0;
        ambPos[i * 3 + 2] = 0;
        ambSize[i] = 10 + rnd() * 10;
        ambColor.set(i % 4 === 0 ? C_GOLD : i % 2 === 0 ? C_VIOLET : C_SILVER, i * 3);
      } else {
        ambOrbitR[i] = 0;
        ambSpeed[i] = 0;
        ambPos[i * 3] = (rnd() - 0.5) * 16;
        ambPos[i * 3 + 1] = (rnd() - 0.5) * 9;
        ambPos[i * 3 + 2] = (rnd() - 0.5) * 10;
        ambSize[i] = 9 + rnd() * 12;
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

    // --- 3. curved helical trajectories -------------------------------------
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

    // --- 4. two incoming particle streams -----------------------------------
    const beamCount = 520;
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
      uniforms: { uBeam: { value: 0 }, uPixelRatio: { value: pixelRatio }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beams = new THREE.Points(beamGeo, beamMat);
    beams.frustumCulled = false;
    field.add(beams);

    // --- 5. expanding collision particle burst ------------------------------
    const burstCount = 240;
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

    // --- 6. restrained luminous collision flash -----------------------------
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

    // --- 7. detector-inspired geometric structures --------------------------
    const detectorMat = new THREE.LineBasicMaterial({ color: 0xa1a1aa, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
    const detectorAccentMat = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending });
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
    // Outer dodecagonal calorimeter silhouette
    for (const x of [-3.3, 3.3]) field.add(ring(4.55, x, 12, detectorAccentMat));

    const staves: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      staves.push(new THREE.Vector3(-3.3, Math.cos(a) * 3.75, Math.sin(a) * 3.75), new THREE.Vector3(3.3, Math.cos(a) * 3.75, Math.sin(a) * 3.75));
      // Subtle radial calibration ticks at the central plane
      staves.push(new THREE.Vector3(0, Math.cos(a) * 3.75, Math.sin(a) * 3.75), new THREE.Vector3(0, Math.cos(a) * 3.92, Math.sin(a) * 3.92));
    }
    staves.push(new THREE.Vector3(-14, 0, 0), new THREE.Vector3(14, 0, 0));
    field.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(staves), detectorMat));

    // --- 8. Scene 10 coherent data structure (event -> ML manifold) ---------
    const latticeCount = 128;
    const latPos = new Float32Array(latticeCount * 3);
    const latChaos = new Float32Array(latticeCount * 3);
    const latColor = new Float32Array(latticeCount * 3);
    const latVecs: THREE.Vector3[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < latticeCount; i++) {
      // Ordered Fibonacci shells representing structured feature manifold
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

      // Chaotic pre-resolution positions outward along collision burst
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

    // Delicate nearest-neighbor edges between structured manifold nodes
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

    const cur: Pose = { ...POSES[sceneRef.current] };
    let resolveAmt = sceneRef.current === 9 ? 1 : 0;
    let raf = 0;
    let lastFrame = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const reduced = reducedRef.current;
      const t = reduced ? 99 : (now - clockStart.current) / 1000;
      const uTime = reduced ? 0 : now / 1000;

      // Timeline: beams converge (0–1.5 s), flash + burst, curved tracks radiate.
      const beam = Math.min(1, t / 1.5);
      const burst = t - 1.5;
      beamMat.uniforms.uBeam.value = beam * beam;
      burstMat.uniforms.uBurst.value = Math.max(0, burst);
      trackMat.uniforms.uProgress.value = burst <= 0 ? 0 : ease(burst / 3.4) * 1.35;
      const flash = burst <= 0 ? 0 : Math.exp(-burst * 2.5);
      flashMat.uniforms.uSize.value = 820 * flash + 48;
      flashMat.uniforms.uGlow.value = flash * 0.85 + 0.08 * cur.glow;

      const target = POSES[sceneRef.current];
      const rate = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
      (Object.keys(cur) as (keyof Pose)[]).forEach((key) => {
        cur[key] += (target[key] - cur[key]) * rate;
      });

      // In Scene 10 (Conclusion), once the burst expands past 1.3s, smoothly
      // resolve into the coherent data structure lattice.
      const wantResolve = sceneRef.current === 9 && (reduced || burst > 1.3) ? 1 : 0;
      resolveAmt += (wantResolve - resolveAmt) * (reduced ? 1 : 1 - Math.exp(-dt * 1.6));
      latticeMat.uniforms.uResolve.value = resolveAmt;
      latticeMat.uniforms.uTime.value = uTime;
      latticeMat.uniforms.uGlow.value = cur.glow;
      latticeEdgeMat.opacity = resolveAmt * cur.glow * 0.22;
      trackMat.uniforms.uTrackFade.value = 1 - resolveAmt * 0.25;

      field.rotation.y = cur.rotY + Math.sin(uTime * 0.07) * 0.11 + resolveAmt * 0.08 * Math.sin(uTime * 0.25);
      field.rotation.x = cur.rotX + Math.sin(uTime * 0.05) * 0.04;
      stars.rotation.y = cur.rotY * 0.15 + uTime * 0.004;

      camera.position.set(cur.x, cur.y, cur.dist);
      camera.lookAt(cur.x, cur.y * 0.6, 0);

      starMat.uniforms.uTime.value = uTime;
      ambMat.uniforms.uTime.value = uTime;
      ambMat.uniforms.uGlow.value = 0.35 + cur.glow * 0.65;
      trackMat.uniforms.uGlow.value = cur.glow;
      beamMat.uniforms.uGlow.value = cur.glow;
      burstMat.uniforms.uGlow.value = cur.glow;
      detectorMat.opacity = 0.025 + cur.glow * 0.05;
      detectorAccentMat.opacity = 0.015 + cur.glow * 0.035;

      renderer.render(scene3, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      starGeo.dispose();
      ambGeo.dispose();
      trackGeo.dispose();
      beamGeo.dispose();
      burstGeo.dispose();
      flashGeo.dispose();
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
