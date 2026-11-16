import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateTracks, STEPS } from "./tracks";

// Camera/field pose per scene: the same collision is seen from a different
// angle in every scene, which keeps the deck visually coherent.
interface Pose {
  rotY: number;
  rotX: number;
  dist: number;
  x: number;
  y: number;
  glow: number; // overall brightness of the field
}

const POSES: Pose[] = [
  { rotY: 0.35, rotX: 0.12, dist: 9.2, x: 0, y: 0.1, glow: 1.0 }, // 01 collision
  { rotY: 1.2, rotX: 0.2, dist: 12, x: -3.2, y: 0, glow: 0.2 }, // 02 problem
  { rotY: 1.5708, rotX: 0, dist: 13, x: 4.6, y: 0.4, glow: 0.14 }, // 03 features
  { rotY: 0.1, rotX: 0.5, dist: 15, x: 0, y: -1.2, glow: 0.12 }, // 04 pipeline
  { rotY: -0.9, rotX: 0.15, dist: 12.5, x: -3.8, y: 0.5, glow: 0.15 }, // 05 models
  { rotY: 0.7, rotX: -0.3, dist: 16, x: 3.5, y: 1.6, glow: 0.1 }, // 06 results
  { rotY: 2.2, rotX: 0.25, dist: 15, x: -3.5, y: -1.2, glow: 0.1 }, // 07 scaling
  { rotY: -0.4, rotX: 0.4, dist: 17, x: 0, y: 0, glow: 0.08 }, // 08 workbench
  { rotY: 1.5708, rotX: 0.05, dist: 11, x: 0.2, y: 0.2, glow: 0.16 }, // 09 reproducibility
  { rotY: 0.2, rotX: 0.3, dist: 11.5, x: 0, y: 1.9, glow: 0.7 }, // 10 conclusion
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
    vAlpha = visible * (0.46 * (1.0 - aS * 0.5) + head * 0.9 * (1.0 - smoothstep(1.0, 1.35, local)));
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const TRACK_FRAG = /* glsl */ `
  uniform float uGlow;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * uGlow);
  }
`;
const BEAM_VERT = /* glsl */ `
  attribute float aSide;
  attribute float aOffset;
  attribute vec2 aSpread;
  uniform float uBeam;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    float travel = (1.0 - uBeam) * 11.0;
    float x = aSide * (aOffset * 2.6 + travel);
    float squeeze = mix(1.0, 0.25, uBeam);
    vec3 p = vec3(x, aSpread.x * squeeze, aSpread.y * squeeze);
    vAlpha = smoothstep(0.0, 0.3, abs(x)) * (1.0 - smoothstep(0.92, 1.0, uBeam));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * 26.0 / -mv.z;
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

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

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
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
    const field = new THREE.Group();
    scene3.add(field);

    // --- tracks: one draw call for every trajectory -------------------------
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
      uniforms: { uProgress: { value: 0 }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    field.add(new THREE.LineSegments(trackGeo, trackMat));

    // --- two incoming beams -------------------------------------------------
    const beamCount = 520;
    const side = new Float32Array(beamCount);
    const offset = new Float32Array(beamCount);
    const spread = new Float32Array(beamCount * 2);
    for (let i = 0; i < beamCount; i++) {
      side[i] = i % 2 === 0 ? -1 : 1;
      offset[i] = Math.pow(Math.random(), 1.6);
      const r = Math.pow(Math.random(), 2) * 0.22;
      const a = Math.random() * Math.PI * 2;
      spread[i * 2] = Math.cos(a) * r;
      spread[i * 2 + 1] = Math.sin(a) * r;
    }
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(beamCount * 3), 3));
    beamGeo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    beamGeo.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
    beamGeo.setAttribute("aSpread", new THREE.BufferAttribute(spread, 2));
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uBeam: { value: 0 }, uPixelRatio: { value: pixelRatio }, uColor: { value: new THREE.Color(0.55, 0.9, 1.0) }, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beams = new THREE.Points(beamGeo, beamMat);
    beams.frustumCulled = false;
    field.add(beams);

    // --- collision flash ----------------------------------------------------
    const flashGeo = new THREE.BufferGeometry();
    flashGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const flashMat = new THREE.ShaderMaterial({
      vertexShader: FLASH_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uSize: { value: 0 }, uPixelRatio: { value: pixelRatio }, uColor: { value: new THREE.Color(0.8, 0.95, 1.0) }, uGlow: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    field.add(new THREE.Points(flashGeo, flashMat));

    // --- detector geometry: barrel layers and beam line ----------------------
    const detectorMat = new THREE.LineBasicMaterial({ color: 0x6f8fd0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = (radius: number, x: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(x, Math.cos(a) * radius, Math.sin(a) * radius));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), detectorMat);
    };
    for (const r of [1.1, 2.3, 3.7]) {
      for (const x of [-3.2, 0, 3.2]) field.add(ring(r, x));
    }
    const staves: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      staves.push(new THREE.Vector3(-3.2, Math.cos(a) * 3.7, Math.sin(a) * 3.7), new THREE.Vector3(3.2, Math.cos(a) * 3.7, Math.sin(a) * 3.7));
    }
    staves.push(new THREE.Vector3(-14, 0, 0), new THREE.Vector3(14, 0, 0));
    field.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(staves), detectorMat));

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
    let raf = 0;
    let lastFrame = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const reduced = reducedRef.current;
      const t = reduced ? 99 : (now - clockStart.current) / 1000;

      // Timeline: beams converge (0–1.5 s), flash, tracks radiate and settle.
      const beam = Math.min(1, t / 1.5);
      const burst = t - 1.5;
      beamMat.uniforms.uBeam.value = beam * beam;
      trackMat.uniforms.uProgress.value = burst <= 0 ? 0 : ease(burst / 3.4) * 1.35;
      const flash = burst <= 0 ? 0 : Math.exp(-burst * 2.6);
      flashMat.uniforms.uSize.value = 900 * flash + 60;
      flashMat.uniforms.uGlow.value = flash * 0.9;

      const target = POSES[sceneRef.current];
      const rate = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
      (Object.keys(cur) as (keyof Pose)[]).forEach((key) => {
        cur[key] += (target[key] - cur[key]) * rate;
      });
      const drift = reduced ? 0 : now / 1000;
      field.rotation.y = cur.rotY + Math.sin(drift * 0.07) * 0.12;
      field.rotation.x = cur.rotX + Math.sin(drift * 0.05) * 0.04;
      camera.position.set(cur.x, cur.y, cur.dist);
      camera.lookAt(cur.x, cur.y * 0.6, 0);
      trackMat.uniforms.uGlow.value = cur.glow;
      beamMat.uniforms.uGlow.value = cur.glow;
      detectorMat.opacity = 0.05 + cur.glow * 0.1;
      renderer.render(scene3, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      trackGeo.dispose();
      beamGeo.dispose();
      flashGeo.dispose();
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
