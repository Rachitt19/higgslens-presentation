import { useEffect, useLayoutEffect, useState, type ComponentType } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import CollisionField from "./three/CollisionField";
import Chrome from "./components/Chrome";
import { useDeck, useReducedMotion } from "./lib/useDeck";
import S01 from "./scenes/S01Collision";
import S02 from "./scenes/S02Problem";
import S03 from "./scenes/S03Features";
import S04 from "./scenes/S04Pipeline";
import S05 from "./scenes/S05Models";
import S06 from "./scenes/S06Results";
import S07 from "./scenes/S07Scaling";
import S08 from "./scenes/S08Workbench";
import S09 from "./scenes/S09Reproducibility";
import S10 from "./scenes/S10Conclusion";

export interface SceneProps {
  step: number;
  setStep: (step: number) => void;
  intro: boolean; // true only while the opening animation is playing for the first time
}

const SCENES: { Component: ComponentType<SceneProps>; steps: number }[] = [
  { Component: S01, steps: 1 },
  { Component: S02, steps: 1 },
  { Component: S03, steps: 4 },
  { Component: S04, steps: 1 },
  { Component: S05, steps: 5 },
  { Component: S06, steps: 3 },
  { Component: S07, steps: 3 },
  { Component: S08, steps: 4 },
  { Component: S09, steps: 1 },
  { Component: S10, steps: 1 },
];
const STEPS = SCENES.map((s) => s.steps);
const STAGE_W = 1600;
const STAGE_H = 900;

export default function App() {
  const deck = useDeck(STEPS);
  const reduced = useReducedMotion();
  const [scale, setScale] = useState(1);
  const [replayKey, setReplayKey] = useState(0);
  const [intro, setIntro] = useState(() => deck.scene === 0 && !reduced);

  // The deck is composed on a fixed 1600 × 900 stage and scaled to the screen,
  // so the 16:9 composition is identical on a laptop and on a projector.
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (deck.scene !== 0) setIntro(false);
    if (deck.scene === SCENES.length - 1) setReplayKey((k) => k + 1); // closing burst
  }, [deck.scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && deck.scene === 0 && !e.metaKey && !e.ctrlKey) {
        setIntro(true);
        setReplayKey((k) => k + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.scene]);

  const { Component } = SCENES[deck.scene];
  const blur = reduced ? "blur(0px)" : "blur(14px)";

  return (
    <MotionConfig reducedMotion="user">
      <div className="viewport">
        <CollisionField scene={deck.scene} reducedMotion={reduced} replayKey={replayKey} />
        <div className="vignette" aria-hidden="true" />
        <main className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <AnimatePresence initial={false}>
            <motion.section
              key={deck.scene === 0 ? `0-${replayKey}` : deck.scene}
              className={`scene scene-${deck.scene + 1}`}
              aria-label={`Scene ${deck.scene + 1}`}
              initial={{ opacity: 0, scale: 1 + 0.025 * deck.direction, filter: blur }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1 - 0.025 * deck.direction, filter: blur }}
              transition={{ duration: 0.65, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Component step={deck.step} setStep={(s) => deck.goTo(deck.scene, s)} intro={intro} />
            </motion.section>
          </AnimatePresence>
          <Chrome scene={deck.scene} step={deck.step} steps={STEPS} onPrev={deck.prev} onNext={deck.next} onGoTo={deck.goTo} onFullscreen={deck.toggleFullscreen} />
        </main>
      </div>
    </MotionConfig>
  );
}
