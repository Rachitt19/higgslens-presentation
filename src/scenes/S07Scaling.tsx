import { useState } from "react";
import type { SceneProps } from "../App";
import { SCALING } from "../content";
import { Segmented, StepTabs } from "../components/common";
import { CostBars, ScalingChart } from "../components/charts";
import { BUDGET_LABEL, BUDGET_ORDER, MODEL, data, f4, getRun, int, type BudgetId, type GroupId } from "../lib/data";

// Lead of the better deep network over XGBoost at each budget, from the artifacts.
function gaps(group: GroupId) {
  return BUDGET_ORDER.map((b) => {
    const deep = Math.max(getRun(b, "deep_mlp", group).rocAuc, getRun(b, "resnet_mlp", group).rocAuc);
    return {
      budget: b,
      gap: deep - getRun(b, "xgboost", group).rocAuc,
      rows: data.budgets[b].rows,
      testRows: data.budgets[b].splitChecks.split_sizes.test,
    };
  });
}

function Gaps({ group }: { group: GroupId }) {
  return (
    <dl className="s07-budgets">
      {gaps(group).map((g) => (
        <div key={g.budget} className="s07-budget-card">
          <dt>
            <span className="num s07-budget-name">{BUDGET_LABEL[g.budget]}</span>
            <span className="s07-budget-split">{int(g.rows)} rows · {int(g.testRows)} test</span>
          </dt>
          <dd className="num">+{g.gap.toFixed(3)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function S07Scaling({ step, setStep }: SceneProps) {
  const [budget, setBudget] = useState<BudgetId>("2.5m");
  const xgbAll = getRun("2.5m", "xgboost", "all");
  const resLow = getRun("2.5m", "resnet_mlp", "low_level");
  const xgb = getRun(budget, "xgboost", "all");
  const res = getRun(budget, "resnet_mlp", "all");
  const compactGain = getRun("2.5m", "mlp", "all").rocAuc - getRun("250k", "mlp", "all").rocAuc;
  const residualGain = getRun("2.5m", "resnet_mlp", "all").rocAuc - getRun("250k", "resnet_mlp", "all").rocAuc;
  const seed = data.run.seed;

  return (
    <div className="s07">
      <header className="s07-head">
        <h2 className="headline">{SCALING.headline}</h2>
        <StepTabs views={SCALING.views} step={step} onSelect={setStep} />
      </header>
      <div className="s07-body" key={step}>
        {step === 0 && (
          <>
            <ScalingChart group="all" />
            <aside className="s07-side">
              <p className="s07-kicker">Three seeded budgets · Lead over XGBoost</p>
              <Gaps group="all" />
              <p className="body">
                From 250k to 2.5M events the compact MLP gains +{compactGain.toFixed(3)} and the residual MLP +{residualGain.toFixed(3)}. Logistic regression stays flat.
              </p>
              <p className="note">
                Nested samples (250k ⊂ 1M ⊂ 2.5M) with one seed ({seed}) per budget. Run-to-run variance and intermediate sizes are not measured. Hover or click a budget column to inspect exact values.
              </p>
            </aside>
          </>
        )}
        {step === 1 && (
          <>
            <ScalingChart group="low_level" reference={{ value: xgbAll.rocAuc, label: `XGBoost given all 28 features, 2.5M: ${f4(xgbAll.rocAuc)}` }} />
            <aside className="s07-side">
              <p className="s07-kicker">21 raw inputs · Lead over XGBoost</p>
              <Gaps group="low_level" />
              <p className="body">
                On raw kinematics alone the residual MLP reaches {f4(resLow.rocAuc)} at 2.5M, above XGBoost with the hand-built invariant masses included.
              </p>
              <p className="note">
                Matches the trend reported by Baldi et al. (2014). Single seed ({seed}) per budget; no uncertainty bars are estimated.
              </p>
            </aside>
          </>
        )}
        {step === 2 && (
          <>
            <div className="s07-cost">
              <div className="s06-toolbar">
                <p className="body">All 28 features across the three discrete budgets. Higher ROC-AUC costs GPU time and calibration.</p>
                <Segmented label="Sample size" value={budget} onChange={setBudget} options={BUDGET_ORDER.map((b) => ({ id: b, label: BUDGET_LABEL[b] }))} />
              </div>
              <CostBars budget={budget} />
            </div>
            <aside className="s07-side">
              <p className="s07-kicker">At {BUDGET_LABEL[budget]} events ({int(data.budgets[budget].splitChecks.split_sizes.test)} test)</p>
              <dl className="s07-gaps">
                <div>
                  <dd className="num">{(res.trainSeconds / xgb.trainSeconds).toFixed(0)}×</dd>
                  <dt>longer to train: {MODEL.resnet_mlp.label} against XGBoost</dt>
                </div>
              </dl>
              <p className="body">
                XGBoost is better calibrated: expected calibration error {f4(xgb.ece)} against {f4(res.ece)}.
              </p>
              <p className="note">Single seed ({seed}) per budget on one {data.run.gpu} GPU; times compare only within this run.</p>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
