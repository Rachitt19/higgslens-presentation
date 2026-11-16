import { SCENE_TITLES } from "../content";

interface Props {
  scene: number;
  step: number;
  steps: number[];
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (scene: number) => void;
  onFullscreen: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Persistent deck controls: counter, progress, previous/next, fullscreen. */
export default function Chrome({ scene, step, steps, onPrev, onNext, onGoTo, onFullscreen }: Props) {
  const total = steps.length;
  const atStart = scene === 0 && step === 0;
  const atEnd = scene === total - 1 && step === steps[scene] - 1;
  return (
    <>
    {scene > 0 && (
      <header className="brand">
        <span className="brand-mark">HiggsLens</span>
        <span className="brand-note">Simulated UCI HIGGS benchmark</span>
      </header>
    )}
    <footer className="chrome">
      <div className="chrome-counter" aria-live="polite">
        <span className="num">
          {pad(scene + 1)} <span className="chrome-of">/ {pad(total)}</span>
        </span>
        <span className="chrome-title">{SCENE_TITLES[scene]}</span>
      </div>
      <nav className="chrome-progress" aria-label="Scenes">
        {steps.map((count, i) => {
          const fill = i < scene ? 1 : i > scene ? 0 : (step + 1) / count;
          return (
            <button key={i} type="button" className={i === scene ? "is-current" : ""} aria-label={`Scene ${i + 1}: ${SCENE_TITLES[i]}`} aria-current={i === scene ? "step" : undefined} title={`${pad(i + 1)} ${SCENE_TITLES[i]}`} onClick={() => onGoTo(i)}>
              <span style={{ transform: `scaleX(${fill})` }} />
            </button>
          );
        })}
      </nav>
      <div className="chrome-buttons">
        <button type="button" onClick={onPrev} disabled={atStart} aria-label="Previous">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
        </button>
        <button type="button" onClick={onNext} disabled={atEnd} aria-label="Next">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
        </button>
        <button type="button" onClick={onFullscreen} aria-label="Toggle full screen (F)" title="Full screen (F)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" /></svg>
        </button>
      </div>
    </footer>
    </>
  );
}
