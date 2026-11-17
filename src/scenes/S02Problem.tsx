import { useEffect, useState } from "react";
import type { SceneProps } from "../App";
import { PROBLEM } from "../content";
import { BACKGROUND_EVENTS, EventDisplay, SIGNAL_EVENTS } from "../components/common";
import { useReducedMotion } from "../lib/useDeck";

export default function S02Problem({ skipped }: SceneProps) {
  const reduced = useReducedMotion();
  const [evIdx, setEvIdx] = useState(0);

  // Cycle through conceptual simulated events automatically unless reduced motion or skipped
  useEffect(() => {
    if (reduced || skipped) return;
    const id = window.setInterval(() => {
      setEvIdx((i) => (i + 1) % SIGNAL_EVENTS.length);
    }, 3800);
    return () => window.clearInterval(id);
  }, [reduced, skipped]);

  return (
    <div className="s02">
      <div className="s02-stage">
        <div className="s02-controls rise" style={{ animationDelay: "0.15s" }}>
          <span className="tag">Conceptual simulated final states</span>
          <div className="s02-ev-pills" role="group" aria-label="Conceptual simulated event selector">
            {SIGNAL_EVENTS.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`num ${evIdx === i ? "is-on" : ""}`}
                aria-pressed={evIdx === i}
                onClick={() => setEvIdx(i)}
              >
                Event 0{i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="s02-chambers rise" style={{ animationDelay: "0.25s" }} key={evIdx}>
          <figure className="s02-card s02-card--signal">
            <div className="s02-chamber">
              <EventDisplay objects={SIGNAL_EVENTS[evIdx]} size={280} variant="signal" />
            </div>
            <figcaption>
              <span className="s02-kind s02-kind--signal">Signal class</span>
              <strong>{PROBLEM.signal.name}</strong>
              <span className="s02-sub">{PROBLEM.signal.sub}</span>
              <p>{PROBLEM.signal.body}</p>
            </figcaption>
          </figure>

          <div className="s02-bridge" aria-label="Identical visible inventory and binary classification task">
            <span className="s02-eq num">=</span>
            <p className="num">{PROBLEM.finalState}</p>
            <span className="s02-bridge-note">Counting visible particles cannot separate them</span>
            <code className="s02-binary num">x ∈ ℝ²⁸ → f(x) → σ(z) ∈ (0,1) vs y ∈ &#123;0,1&#125;</code>
          </div>

          <figure className="s02-card s02-card--background">
            <div className="s02-chamber">
              <EventDisplay objects={BACKGROUND_EVENTS[evIdx]} size={280} variant="background" />
            </div>
            <figcaption>
              <span className="s02-kind s02-kind--background">Background class</span>
              <strong>{PROBLEM.background.name}</strong>
              <span className="s02-sub">{PROBLEM.background.sub}</span>
              <p>{PROBLEM.background.body}</p>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="s02-bottom">
        <div className="s02-headline-wrap rise" style={{ animationDelay: "0.75s" }}>
          <h2 className="headline">{PROBLEM.headline}</h2>
          <p className="body">{PROBLEM.why}</p>
        </div>
        <blockquote className="s02-question rise" style={{ animationDelay: "1.15s" }}>
          <span className="tag">Research question</span>
          {PROBLEM.question}
        </blockquote>
      </div>
      <p className="note s02-note rise" style={{ animationDelay: "1.35s" }}>
        Conceptual transverse schematics of the shared final state. Particle appearance alone is insufficient—both dataset classes are simulated.
      </p>
    </div>
  );
}
