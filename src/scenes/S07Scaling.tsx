import { useEffect, useState } from "react";
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

const POP_DOTS: Record<BudgetId, { count: number; scale: string }> = {
  "250k": { count: 4, scale: "1×" },
  "1m": { count: 10, scale: "4×" },
  "2.5m": { count: 18, scale: "10×" },
};

function PopGlyph({ budget }: { budget: BudgetId }) {
  const { count } = POP_DOTS[budget];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return (
    <svg viewBox="-16 -16 32 32" className="pop-glyph" aria-hidden="true">
      <circle r={14} fill="none" stroke="rgba(167,139,250,0.22)" strokeWidth={1} />
      {Array.from({ length: count }, (_, i) => {
        const r = 2 + Math.sqrt((i + 0.5) / count) * 10.5;
        const a = i * golden;
        return (
          <circle
            key={i}
            cx={(Math.cos(a) * r).toFixed(1)}
            cy={(Math.sin(a) * r).toFixed(1)}
            r={i % 3 === 0 ? 1.5 : 1.15}
            fill={i % 4 === 0 ? "#F0B95A" : i % 2 === 0 ? "#D946EF" : "#A78BFA"}
          />
        );
      })}
    </svg>
  );
}

function Gaps({ group, active, onSelect }: { group: GroupId; active?: BudgetId; onSelect?: (b: BudgetId) => void }) {
  return (
    <dl className="s07-budgets">
      {gaps(group).map((g) => (
        <div
          key={g.budget}
          className={`s07-budget-card ${active === g.budget ? "is-on" : ""}`}
          onMouseEnter={() => onSelect?.(g.budget)}
        >
          <PopGlyph budget={g.budget} />
          <dt>
            <span className="num s07-budget-name">
              {BUDGET_LABEL[g.budget]} <em>({POP_DOTS[g.budget].scale})</em>
            </span>
            <span className="s07-budget-split">{int(g.rows)} rows · {int(g.testRows)} test</span>
          </dt>
          <dd className="num">+{g.gap.toFixed(3)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function S07Scaling({ step, setStep, onPopulationChange }: SceneProps) {
  const [budget, setBudget] = useState<BudgetId>("2.5m");
  const xgbAll = getRun("2.5m", "xgboost", "all");
  const resLow = getRun("2.5m", "resnet_mlp", "low_level");
  const xgb = getRun(budget, "xgboost", "all");
  const res = getRun(budget, "resnet_mlp", "all");
  const compactGain = getRun("2.5m", "mlp", "all").rocAuc - getRun("250k", "mlp", "all").rocAuc;
  const residualGain = getRun("2.5m", "resnet_mlp", "all").rocAuc - getRun("250k", "resnet_mlp", "all").rocAuc;
  const seed = data.run.seed;

  useEffect(() => {
    onPopulationChange?.(budget);
  }, [budget, onPopulationChange]);

  const handleFocus = (b: BudgetId) => {
    setBudget(b);
    onPopulationChange?.(b);
  };

  return (
    <div className="s07">
      <header className="s07-head">
        <h2 className="headline">{SCALING.headline}</h2>
        <StepTabs views={SCALING.views} step={step} onSelect={setStep} />
      </header>
      <div className="s07-body" key={step}>
        {step === 0 && (
          <>
            <ScalingChart group="all" onBudgetFocus={handleFocus} />
            <aside className="s07-side">
              <p className="s07-kicker">Expanding budgets · Lead over XGBoost</p>
              <Gaps group="all" active={budget} onSelect={handleFocus} />
              <p className="body">
                From 250k to 2.5M, compact MLP gains +{compactGain.toFixed(3)} and residual MLP +{residualGain.toFixed(3)}; logistic regression stays flat.
              </p>
              <p className="note">
                Three discrete nested samples (250k ⊂ 1M ⊂ 2.5M), one seed ({seed}) per budget. No intermediate points or variance intervals are measured.
              </p>
            </aside>
          </>
        )}
        {step === 1 && (
          <>
            <ScalingChart
              group="low_level"
              reference={{ value: xgbAll.rocAuc, label: `XGBoost given all 28 features, 2.5M: ${f4(xgbAll.rocAuc)}` }}
              onBudgetFocus={handleFocus}
            />
            <aside className="s07-side">
              <p className="s07-kicker">21 raw inputs · Lead over XGBoost</p>
              <Gaps group="low_level" active={budget} onSelect={handleFocus} />
              <p className="body">
                On raw kinematics alone at 2.5M, residual MLP reaches {f4(resLow.rocAuc)}—above 28-feature XGBoost.
              </p>
              <p className="note">
                Matches Baldi et al. (2014). Single seed ({seed}) per budget; no uncertainty bars estimated.
              </p>
            </aside>
          </>
        )}
        {step === 2 && (
          <>
            <div className="s07-cost">
              <div className="s06-toolbar">
                <p className="body">All 28 features across the three discrete budgets. Higher ROC-AUC costs GPU time and calibration.</p>
                <Segmented label="Sample size" value={budget} onChange={handleFocus} options={BUDGET_ORDER.map((b) => ({ id: b, label: BUDGET_LABEL[b] }))} />
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
