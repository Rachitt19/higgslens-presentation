import { useState } from "react";
import type { SceneProps } from "../App";
import { FEATURE_STAGES, MEASUREMENTS } from "../content";
import { EventDisplay, SIGNAL_EVENT } from "../components/common";
import { data, int } from "../lib/data";

const low = data.features.filter((f) => f.group === "low_level");
const high = data.features.filter((f) => f.group === "high_level");

export default function S03Features({ step, setStep }: SceneProps) {
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover === null ? null : data.features[hover];
  const cls = (i: number) => `s03-col ${i === step ? "is-now" : i < step ? "is-past" : "is-future"}`;
  return (
    <div className="s03">
      <header className="s03-head">
        <h2 className="headline">From a collision to 28 numbers.</h2>
        <dl className="s03-facts">
          <div><dt>source events</dt><dd className="num">{int(data.run.sourceRows)}</dd></div>
          <div><dt>binary label</dt><dd className="num">1</dd></div>
          <div><dt>input features</dt><dd className="num">{data.features.length}</dd></div>
          <div><dt>low-level + high-level</dt><dd className="num">{low.length} + {high.length}</dd></div>
        </dl>
      </header>

      <div className="s03-flow">
        <button type="button" className={cls(0)} onClick={() => setStep(0)}>
          <div className="s03-visual"><EventDisplay objects={SIGNAL_EVENT} size={280} showLabels={false} /></div>
          <h3>{FEATURE_STAGES[0].title}</h3>
          <p>{FEATURE_STAGES[0].body}</p>
        </button>

        <button type="button" className={cls(1)} onClick={() => setStep(1)}>
          <div className="s03-visual s03-measure">
            {MEASUREMENTS.map((m) => (
              <div key={m.object}>
                <span>{m.object}</span>
                <span className="s03-fields">{m.fields.join("  ")}</span>
                <span className="num">{m.count}</span>
              </div>
            ))}
          </div>
          <h3>{FEATURE_STAGES[1].title}</h3>
          <p>{FEATURE_STAGES[1].body}</p>
        </button>

        <div className={cls(2)} onClick={() => setStep(2)}>
          <div className="s03-visual s03-vector" onMouseLeave={() => setHover(null)}>
            <div className="s03-cells">
              {data.features.map((f, i) => (
                <span key={f.name} tabIndex={step >= 2 ? 0 : -1} className={`cell ${f.group} ${hover === i ? "is-hover" : ""}`} style={{ animationDelay: `${i * 28}ms` }} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${f.name}: ${f.description}`} />
              ))}
            </div>
            <div className="s03-legend">
              {hovered ? (
                <span><b className="num">{hovered.name}</b> {hovered.description}</span>
              ) : (
                <>
                  <span><i className="cell low_level" /> {low.length} low-level</span>
                  <span><i className="cell high_level" /> {high.length} high-level</span>
                </>
              )}
            </div>
          </div>
          <h3>{FEATURE_STAGES[2].title}</h3>
          <p>{FEATURE_STAGES[2].body}</p>
        </div>

        <button type="button" className={cls(3)} onClick={() => setStep(3)}>
          <div className="s03-visual s03-inputs">
            <div><span className="num">low_level</span><span className="bar" style={{ width: `${(low.length / 28) * 100}%` }} /><span className="num">{low.length}</span></div>
            <div><span className="num">high_level</span><span className="bar solid" style={{ width: `${(high.length / 28) * 100}%` }} /><span className="num">{high.length}</span></div>
            <div><span className="num">all</span><span className="bar both" style={{ width: "100%" }} /><span className="num">{data.features.length}</span></div>
            <p className="s03-math">x ∈ ℝ<sup>28</sup> → model → score in [0, 1]</p>
          </div>
          <h3>{FEATURE_STAGES[3].title}</h3>
          <p>{FEATURE_STAGES[3].body}</p>
        </button>
      </div>
    </div>
  );
}
