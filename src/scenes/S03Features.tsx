import { useState } from "react";
import type { SceneProps } from "../App";
import { FEATURE_STAGES, MEASUREMENTS } from "../content";
import { EventDisplay, SIGNAL_EVENT } from "../components/common";
import { data, int } from "../lib/data";

const low = data.features.filter((f) => f.group === "low_level");
const high = data.features.filter((f) => f.group === "high_level");

const SAMPLE_LOW_TAGS = ["lepton_pT", "missing_energy_magnitude", "jet_1_pT", "jet_1_btag"];
const SAMPLE_HIGH_TAGS = ["m_bb", "m_wwbb", "m_jjj"];

export default function S03Features({ step, setStep }: SceneProps) {
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover === null ? null : data.features[hover];
  const cls = (i: number) => `s03-col ${i === step ? "is-now" : i < step ? "is-past" : "is-future"}`;

  return (
    <div className="s03">
      <header className="s03-head">
        <div className="rise" style={{ animationDelay: "0.2s" }}>
          <span className="tag">Event → Measurements → 28-feature vector</span>
          <h2 className="headline">From a collision to 28 numbers.</h2>
        </div>
        <dl className="s03-facts rise" style={{ animationDelay: "0.45s" }}>
          <div><dt>source events</dt><dd className="num">{int(data.run.sourceRows)}</dd></div>
          <div><dt>low-level</dt><dd className="num">{low.length}</dd></div>
          <div><dt>high-level</dt><dd className="num">{high.length}</dd></div>
          <div><dt>total inputs</dt><dd className="num">{data.features.length}</dd></div>
        </dl>
      </header>

      <div className="s03-flow">
        <button type="button" className={cls(0)} onClick={() => setStep(0)}>
          <div className="s03-visual">
            <EventDisplay objects={SIGNAL_EVENT} size={260} showLabels={step === 0} freezeReticles />
            <span className="s03-badge num">EVENT FROZEN · 6 OBJECTS LOCKED</span>
          </div>
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
            <span className="s03-badge s03-badge--violet num">3 + 2 + 16 = 21 LOW-LEVEL</span>
          </div>
          <h3>{FEATURE_STAGES[1].title}</h3>
          <p>{FEATURE_STAGES[1].body}</p>
        </button>

        <div className={cls(2)} onClick={() => setStep(2)}>
          <div className="s03-visual s03-vector" onMouseLeave={() => setHover(null)}>
            <div className="s03-cells">
              {data.features.map((f, i) => (
                <span
                  key={f.name}
                  tabIndex={step >= 2 ? 0 : -1}
                  className={`cell ${f.group} ${hover === i ? "is-hover" : ""}`}
                  style={{ animationDelay: `${i * 26}ms` }}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${f.name}: ${f.description}`}
                />
              ))}
            </div>
            <div className="s03-sample-tags">
              {SAMPLE_LOW_TAGS.map((t) => (
                <code key={t} className="tag-chip tag-chip--low">{t}</code>
              ))}
              {SAMPLE_HIGH_TAGS.map((t) => (
                <code key={t} className="tag-chip tag-chip--high">{t}</code>
              ))}
            </div>
            <div className="s03-legend">
              {hovered ? (
                <span><b className="num">{hovered.name}</b> {hovered.description}</span>
              ) : (
                <>
                  <span><i className="cell low_level" /> {low.length} kinematic</span>
                  <span><i className="cell high_level" /> {high.length} invariant mass</span>
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
            <p className="s03-math">x ∈ ℝ<sup>28</sup> → z → σ(z) ∈ (0, 1)</p>
            <span className="s03-badge num">RAW ℝ²¹ TESTS LEARNED INVARIANT MASSES</span>
          </div>
          <h3>{FEATURE_STAGES[3].title}</h3>
          <p>{FEATURE_STAGES[3].body}</p>
        </button>
      </div>
    </div>
  );
}
