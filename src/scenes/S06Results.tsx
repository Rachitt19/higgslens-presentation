import { useState } from "react";
import type { SceneProps } from "../App";
import { RESULTS } from "../content";
import { CountUp, Segmented, StepTabs } from "../components/common";
import { GroupDots, Leaderboard, RocChart } from "../components/charts";
import { BUDGET_LABEL, BUDGET_ORDER, data, int, type BudgetId } from "../lib/data";

const op = data.operatingPoints;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function S06Results({ step, setStep }: SceneProps) {
  const [budget, setBudget] = useState<BudgetId>("250k");
  return (
    <div className="s06">
      <aside className="s06-hero">
        <h2 className="headline">{RESULTS.headline}</h2>
        <p className="body">{RESULTS.sub}</p>
        <p className="s06-who">Residual MLP, all 28 features</p>
        <dl>
          {RESULTS.hero.map((h, i) => (
            <div key={h.label}>
              <dd><CountUp value={h.value} delay={200 + i * 250} /></dd>
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
              <p className="body s06-op">
                At the threshold chosen on validation for 50% signal efficiency, XGBoost rejects {pct(op.xgboost!.testBackgroundRejection)} of test background and logistic regression {pct(op.logreg!.testBackgroundRejection)}. This is a benchmark operating point, not a significance estimate.
              </p>
              <p className="note">All 28 features, 250k events. Values read from outputs/release/release_summary.json and the per-run metrics.json files.</p>
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
        </div>
      </div>
    </div>
  );
}
