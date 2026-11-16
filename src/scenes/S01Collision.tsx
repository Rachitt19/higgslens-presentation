import type { SceneProps } from "../App";
import { BOUNDARY, TEAM } from "../content";

export default function S01Collision({ intro }: SceneProps) {
  return (
    <div className={`s01 ${intro ? "is-intro" : ""}`}>
      <div className="s01-center">
        <h1 className="s01-title" aria-label="HiggsLens">
          {"HIGGSLENS".split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${2.1 + i * 0.07}s` }} aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>
        <p className="s01-sub rise" style={{ animationDelay: "3.0s" }}>
          Machine Learning at the Edge of Particle Physics
        </p>
        <p className="s01-desc rise" style={{ animationDelay: "3.4s" }}>
          A reproducible machine-learning benchmark for simulated HIGGS events.
        </p>
      </div>
      <div className="s01-foot rise" style={{ animationDelay: "3.9s" }}>
        <ul className="s01-team" aria-label="Team">
          {TEAM.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="s01-boundary">{BOUNDARY}</p>
      </div>
    </div>
  );
}
