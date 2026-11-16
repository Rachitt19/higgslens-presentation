import type { SceneProps } from "../App";
import { REPRO } from "../content";

export default function S09Reproducibility(_: SceneProps) {
  return (
    <div className="s09">
      <h2 className="headline">{REPRO.headline}</h2>
      <div className="s09-cols">
        <section>
          <h3>Fixed by the protocol</h3>
          <dl className="s09-spec">
            {REPRO.fixed.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd className="num">{f.v}</dd>
                <dd className="s09-note">{f.note}</dd>
              </div>
            ))}
          </dl>
          <p className="body s09-leak">{REPRO.leakage}</p>
        </section>
        <section>
          <h3>Limits of the benchmark</h3>
          <ul className="s09-limits">
            {REPRO.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
