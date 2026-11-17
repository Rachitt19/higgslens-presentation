import type { SceneProps } from "../App";
import { BOUNDARY, TEAM } from "../content";

export default function S01Collision({ intro, skipped }: SceneProps) {
  const showIntro = intro && !skipped;
  return (
    <div className={`s01 ${showIntro ? "is-intro" : ""}`}>
      <div className="s01-hud s01-hud--top rise" style={{ animationDelay: "0.3s" }} aria-hidden="true">
        <span className="num">CONCEPTUAL COLLIDER EVENT DISPLAY</span>
        <span className="num">SOLENOID FIELD · 2 STREAMS → VERTEX</span>
      </div>

      <div className="s01-center">
        <h1 className="s01-title" aria-label="HiggsLens">
          {"HIGGSLENS".split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${2.25 + i * 0.065}s` }} aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>
        <p className="s01-sub rise" style={{ animationDelay: "3.05s" }}>
          Machine Learning at the Edge of Particle Physics
        </p>
        <p className="s01-desc rise" style={{ animationDelay: "3.4s" }}>
          A reproducible benchmark on simulated UCI HIGGS events.
        </p>
      </div>

      <div className="s01-foot rise" style={{ animationDelay: "3.85s" }}>
        <ul className="s01-team" aria-label="Team">
          {TEAM.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="s01-boundary">{BOUNDARY}</p>
        {showIntro && (
          <p className="s01-hint num" aria-hidden="true">
            R replay · S skip animation · N speaker notes
          </p>
        )}
      </div>
    </div>
  );
}
