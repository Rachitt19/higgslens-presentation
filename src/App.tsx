import { useCallback, useEffect, useLayoutEffect, useState, type ComponentType } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import CollisionField from "./three/CollisionField";
import Chrome from "./components/Chrome";
import SpeakerNotes from "./components/SpeakerNotes";
import { useDeck, useReducedMotion } from "./lib/useDeck";
import type { BudgetId } from "./lib/data";
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

export type PresentationMode = "cinematic" | "presenter";

export interface SceneProps {
  step: number;
  setStep: (step: number) => void;
  intro: boolean; // true only while the opening animation is playing for the first time
  skipped: boolean;
  paused: boolean;
  presentationMode: PresentationMode;
  onSkip: () => void;
  onReplay: () => void;
  onPopulationChange?: (budget: BudgetId) => void;
}

const SCENES: { Component: ComponentType<SceneProps>; steps: number }[] = [
  { Component: S01, steps: 1 },
  { Component: S02, steps: 1 },
  { Component: S03, steps: 4 },
  { Component: S04, steps: 1 },
  { Component: S05, steps: 5 },
  { Component: S06, steps: 4 },
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
  const [notesOpen, setNotesOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("cinematic");
  const [paused, setPaused] = useState(false);
  const [skipped, setSkipped] = useState(() => reduced);
  const [intro, setIntro] = useState(() => deck.scene === 0 && !reduced);
  const [populationBudget, setPopulationBudget] = useState<BudgetId>("2.5m");

  // The deck is composed on a fixed 1600 × 900 stage and scaled to the screen,
  // so the 16:9 composition is identical on a laptop and on a projector.
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    setPaused(false);
    setSkipped(reduced || presentationMode === "presenter");
    if (deck.scene !== 0 || presentationMode === "presenter") setIntro(false);
    if (deck.scene === SCENES.length - 1 && presentationMode === "cinematic") {
      setReplayKey((k) => k + 1); // closing burst
    }
  }, [deck.scene, reduced, presentationMode]);

  useEffect(() => {
    setSkipped(reduced || presentationMode === "presenter");
  }, [deck.step, reduced, presentationMode]);

  // Pause or resume SVG SMIL animations across the active scene cleanly
  useEffect(() => {
    document.querySelectorAll("svg").forEach((svg) => {
      try {
        if (paused) svg.pauseAnimations?.();
        else svg.unpauseAnimations?.();
      } catch {
        // ignore non-SMIL SVGs
      }
    });
  }, [paused, deck.scene, deck.step, replayKey]);

  const replayScene = useCallback(() => {
    setPaused(false);
    setSkipped(false);
    if (deck.scene === 0 && !reduced) setIntro(true);
    setReplayKey((k) => k + 1);
  }, [deck.scene, reduced]);

  const skipScene = useCallback(() => {
    setPaused(false);
    setSkipped(true);
    setIntro(false);
  }, []);

  const toggleMode = useCallback(() => {
    setPaused(false);
    setPresentationMode((m) => {
      const next = m === "cinematic" ? "presenter" : "cinematic";
      if (next === "presenter") {
        setSkipped(true);
        setIntro(false);
      } else {
        setSkipped(reduced);
        if (deck.scene === 0 && !reduced) setIntro(true);
      }
      return next;
    });
  }, [deck.scene, reduced]);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        replayScene();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skipScene();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePause();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMode();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setNotesOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replayScene, skipScene, togglePause, toggleMode]);

  const { Component } = SCENES[deck.scene];
  const fast = reduced || skipped || presentationMode === "presenter";
  const blur = fast ? "blur(0px)" : "blur(14px)";
  const stageClass = [
    "stage",
    fast ? "is-skipped" : "",
    paused ? "is-paused" : "",
    presentationMode === "presenter" ? "is-presenter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MotionConfig reducedMotion="user">
      <div className="viewport">
        <CollisionField
          scene={deck.scene}
          step={deck.step}
          reducedMotion={reduced}
          replayKey={replayKey}
          skipped={skipped || presentationMode === "presenter"}
          paused={paused}
          populationBudget={populationBudget}
        />
        <div className="vignette" aria-hidden="true" />
        <main className={stageClass} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <AnimatePresence initial={false}>
            <motion.section
              key={`${deck.scene}-${replayKey}`}
              className={`scene scene-${deck.scene + 1}`}
              aria-label={`Scene ${deck.scene + 1}`}
              initial={{ opacity: 0, scale: 1 + 0.025 * deck.direction, filter: blur }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1 - 0.025 * deck.direction, filter: blur }}
              transition={{ duration: fast ? 0.16 : 0.65, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Component
                step={deck.step}
                setStep={(s) => deck.goTo(deck.scene, s)}
                intro={intro}
                skipped={fast}
                paused={paused}
                presentationMode={presentationMode}
                onSkip={skipScene}
                onReplay={replayScene}
                onPopulationChange={setPopulationBudget}
              />
            </motion.section>
          </AnimatePresence>
          <Chrome
            scene={deck.scene}
            step={deck.step}
            steps={STEPS}
            notesOpen={notesOpen}
            skipped={skipped}
            paused={paused}
            presentationMode={presentationMode}
            onPrev={deck.prev}
            onNext={deck.next}
            onGoTo={deck.goTo}
            onFullscreen={deck.toggleFullscreen}
            onToggleNotes={() => setNotesOpen((o) => !o)}
            onReplay={replayScene}
            onSkip={skipScene}
            onTogglePause={togglePause}
            onToggleMode={toggleMode}
          />
          <SpeakerNotes open={notesOpen} scene={deck.scene} totalScenes={SCENES.length} onClose={() => setNotesOpen(false)} />
        </main>
      </div>
    </MotionConfig>
  );
}
