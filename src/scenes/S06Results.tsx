import { useState } from "react";
import type { SceneProps } from "../App";
import { RESULTS } from "../content";
import { CountUp, Segmented, StepTabs } from "../components/common";
import { CalibrationChart, GroupDots, Leaderboard, RocChart } from "../components/charts";
import { BUDGET_LABEL, BUDGET_ORDER, MODEL, data, f4, getRun, int, type BudgetId } from "../lib/data";

const op = data.operatingPoints;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function S06Results({ step, setStep, skipped }: SceneProps) {
  const [budget, setBudget] = useState<BudgetId>("250k");
  const res250 = getRun("250k", "resnet_mlp", "all");
  const xgb250 = getRun("250k", "xgboost", "all");
  const speedup = (res250.trainSeconds / xgb250.trainSeconds).toFixed(1);

  return (
    <div className="s06">
      <aside className="s06-hero">
        <h2 className="headline">{RESULTS.headline}</h2>
        <p className="body">{RESULTS.sub}</p>
        <p className="s06-who">Residual MLP, all 28 features</p>
        <dl>
          {RESULTS.hero.map((h, i) => (
            <div key={h.label}>
              <dd><CountUp value={h.value} delay={200 + i * 250} skipped={skipped} /></dd>
              <dt>{h.label}<span>{h.note}</span></dt>
            </div>
          ))}
        </dl>
      </aside>
      <div className="s06-main">
        <StepTabs views={RESULTS.views} step={step} onSelect={setStep} />
        <div className="s06-panel" key={step}>
          {step === 0 && (
            <>
              <Leaderboard budget="250k" group="all" />
              <div className="s06-tradeoff" aria-label="Performance versus training time trade-off">
                <article className="s06-to-card s06-to-card--lead">
                  <span className="s06-to-tag" style={{ color: MODEL.resnet_mlp.color }}>
                    Highest discrimination
                  </span>
                  <p className="s06-to-stat">
                    <strong>Residual MLP</strong>
                    <span className="num">{f4(res250.rocAuc)} ROC-AUC · {res250.trainSeconds.toFixed(1)}s</span>
                  </p>
                  <p className="s06-to-desc">
                    Achieves the highest ROC-AUC in this benchmark across all 28 features.
                  </p>
                </article>
                <article className="s06-to-card s06-to-card--fast">
                  <span className="s06-to-tag" style={{ color: MODEL.xgboost.color }}>
                    Performance / time trade-off
                  </span>
                  <p className="s06-to-stat">
                    <strong>XGBoost</strong>
                    <span className="num">{f4(xgb250.rocAuc)} ROC-AUC · {xgb250.trainSeconds.toFixed(1)}s</span>
                  </p>
                  <p className="s06-to-desc">
                    Trains {speedup}× faster; at 50% validation signal efficiency it rejects {pct(op.xgboost!.testBackgroundRejection)} of test background (vs. {pct(op.logreg!.testBackgroundRejection)} for LogReg).
                  </p>
                </article>
              </div>
              <p className="note">All 28 features, 250k events. Operating-point rejection is a benchmark reference, not a significance estimate.</p>
            </>
          )}
          {step === 1 && (
            <>
              <RocChart />
              <p className="note">Curves computed from each run's saved test_predictions.csv ({int(data.budgets["250k"].splitChecks.split_sizes.test)} held-out events).</p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="s06-toolbar">
                <p className="body">With more data, the deep networks score higher on raw kinematics than on the invariant masses.</p>
                <Segmented label="Sample size" value={budget} onChange={setBudget} options={BUDGET_ORDER.map((b) => ({ id: b, label: BUDGET_LABEL[b] }))} />
              </div>
              <GroupDots budget={budget} />
            </>
          )}
          {step === 3 && (
            <>
              <CalibrationChart />
              <p className="note">10-bin reliability diagram on the {int(data.budgets["250k"].splitChecks.split_sizes.test)} test events. XGBoost is best calibrated; neural logits need post-hoc recalibration as probabilities.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
