import { useState } from "react";
import type { SceneProps } from "../App";
import { SCALING } from "../content";
import { Segmented, StepTabs } from "../components/common";
import { CostBars, ScalingChart } from "../components/charts";
import { BUDGET_LABEL, BUDGET_ORDER, MODEL, f4, getRun, type BudgetId, type GroupId } from "../lib/data";

// Lead of the better deep network over XGBoost at each budget, from the artifacts.
function gaps(group: GroupId) {
  return BUDGET_ORDER.map((b) => {
    const deep = Math.max(getRun(b, "deep_mlp", group).rocAuc, getRun(b, "resnet_mlp", group).rocAuc);
    return { budget: b, gap: deep - getRun(b, "xgboost", group).rocAuc };
  });
}

function Gaps({ group }: { group: GroupId }) {
  return (
    <dl className="s07-gaps">
      {gaps(group).map((g) => (
        <div key={g.budget}>
          <dd className="num">+{g.gap.toFixed(3)}</dd>
          <dt>{BUDGET_LABEL[g.budget]}</dt>
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
              <p className="s07-kicker">Deep network lead over XGBoost</p>
              <Gaps group="all" />
              <p className="body">
                From 250k to 2.5M events the compact MLP gains +{compactGain.toFixed(3)} and the residual MLP +{residualGain.toFixed(3)}. Logistic regression does not move.
              </p>
              <p className="note">Same code, same seed, nested samples: 250k ⊂ 1M ⊂ 2.5M.</p>
            </aside>
          </>
        )}
        {step === 1 && (
          <>
            <ScalingChart group="low_level" reference={{ value: xgbAll.rocAuc, label: `XGBoost given all 28 features, 2.5M: ${f4(xgbAll.rocAuc)}` }} />
            <aside className="s07-side">
              <p className="s07-kicker">Deep network lead over XGBoost</p>
              <Gaps group="low_level" />
              <p className="body">
                On raw kinematics alone the residual MLP reaches {f4(resLow.rocAuc)} at 2.5M, above XGBoost with the hand-built invariant masses included.
              </p>
              <p className="note">This is the pattern Baldi et al. (2014) reported: depth lets the network build such features itself.</p>
            </aside>
          </>
        )}
        {step === 2 && (
          <>
            <div className="s07-cost">
              <div className="s06-toolbar">
                <p className="body">All 28 features. The better score costs training time and calibration.</p>
                <Segmented label="Sample size" value={budget} onChange={setBudget} options={BUDGET_ORDER.map((b) => ({ id: b, label: BUDGET_LABEL[b] }))} />
              </div>
              <CostBars budget={budget} />
            </div>
            <aside className="s07-side">
              <p className="s07-kicker">At {BUDGET_LABEL[budget]} events</p>
              <dl className="s07-gaps">
                <div>
                  <dd className="num">{(res.trainSeconds / xgb.trainSeconds).toFixed(0)}×</dd>
                  <dt>longer to train: {MODEL.resnet_mlp.label} against XGBoost</dt>
                </div>
              </dl>
              <p className="body">
                XGBoost is also better calibrated: expected calibration error {f4(xgb.ece)} against {f4(res.ece)}.
              </p>
              <p className="note">Times are comparable only within this run, on this hardware.</p>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
