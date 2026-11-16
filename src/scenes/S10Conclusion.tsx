import type { SceneProps } from "../App";
import { BOUNDARY, FINDINGS, REFERENCES } from "../content";

export default function S10Conclusion(_: SceneProps) {
  return (
    <div className="s10">
      <h2 className="s10-title">What the benchmark shows</h2>
      <div className="s10-findings">
        {FINDINGS.map((f, i) => (
          <article key={f.title} className="rise" style={{ animationDelay: `${0.5 + i * 0.35}s` }}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </div>
      <div className="s10-foot rise" style={{ animationDelay: "1.8s" }}>
        <p className="s10-mark">HiggsLens</p>
        <p className="s10-boundary">{BOUNDARY}</p>
        <p className="note">{REFERENCES.join("  |  ")}</p>
      </div>
    </div>
  );
}
