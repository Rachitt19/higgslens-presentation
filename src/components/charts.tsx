import { useState } from "react";
import { BUDGET_LABEL, BUDGET_ORDER, MODEL, MODEL_ORDER, data, f4, getRun, type BudgetId, type GroupId, type ModelId } from "../lib/data";

const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/* ---------------------------------------------------------------- leaderboard */
export function Leaderboard({ budget, group }: { budget: BudgetId; group: GroupId }) {
  const rows = MODEL_ORDER.map((m) => getRun(budget, m, group)).sort((a, b) => b.rocAuc - a.rocAuc);
  const x = lin(0.5, 0.9, 0, 100); // ROC-AUC axis starts at chance (0.5), stated on the axis
  return (
    <div className="lb">
      <div className="lb-head">
        <span />
        <span>Model</span>
        <span className="lb-axis"><i>0.5 chance</i><i>0.7</i><i>0.9</i></span>
        <span>ROC-AUC</span>
        <span>PR-AUC</span>
        <span>Brier</span>
        <span>Train (s)</span>
      </div>
      {rows.map((r, i) => (
        <div className={`lb-row ${i === 0 ? "is-lead" : ""}`} key={r.run} style={{ animationDelay: `${0.15 + i * 0.16}s` }}>
          <span className="num lb-rank">{i + 1}</span>
          <span className="lb-name">{MODEL[r.model].label}</span>
          <span className="lb-bar">
            <i style={{ width: `${x(r.rocAuc)}%`, background: MODEL[r.model].color, animationDelay: `${0.3 + i * 0.16}s` }} />
          </span>
          <span className={`num ${i === 0 ? "lb-gold" : "lb-strong"}`}>{f4(r.rocAuc)}</span>
          <span className="num">{f4(r.prAuc)}</span>
          <span className="num">{f4(r.brier)}</span>
          <span className="num">{r.trainSeconds.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ ROC chart */
export function RocChart() {
  const S = 560;
  const m = { l: 88, t: 16, r: 16, b: 56 };
  const x = lin(0, 1, m.l, m.l + S);
  const y = lin(0, 1, m.t + S, m.t);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const order = MODEL_ORDER.slice().sort((a, b) => getRun("250k", b, "all").rocAuc - getRun("250k", a, "all").rocAuc);
  return (
    <div className="roc">
      <svg viewBox={`0 0 ${m.l + S + m.r} ${m.t + S + m.b}`} role="img" aria-label="ROC curves for the five all-feature models at 250k events">
        <rect x={m.l} y={m.t} width={S} height={S} className="plot-surface" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={y(0)} x2={x(t)} y2={y(1)} className="grid" />
            <line x1={x(0)} y1={y(t)} x2={x(1)} y2={y(t)} className="grid" />
            <text x={x(t)} y={y(0) + 24} textAnchor="middle" className="tick">{t}</text>
            <text x={x(0) - 12} y={y(t) + 5} textAnchor="end" className="tick">{t}</text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="chance" />
        <text x={x(0.62)} y={y(0.56)} className="tick" transform={`rotate(-45 ${x(0.62)} ${y(0.56)})`}>chance</text>
        {MODEL_ORDER.map((id, i) => (
          <path key={id} d={"M" + data.roc[id].map(([f, t]) => `${x(f).toFixed(1)},${y(t).toFixed(1)}`).join("L")} pathLength={1} className="curve" stroke={MODEL[id].color} style={{ animationDelay: `${0.2 + i * 0.35}s` }} />
        ))}
        <text x={x(0.5)} y={y(0) + 50} textAnchor="middle" className="axis-title">False positive rate (background accepted)</text>
        <text transform={`translate(18 ${y(0.5)}) rotate(-90)`} textAnchor="middle" className="axis-title">True positive rate (signal efficiency)</text>
      </svg>
      <div className="legend">
        <p className="legend-title">Test ROC-AUC</p>
        {order.map((id, idx) => (
          <div key={id}>
            <i style={{ background: MODEL[id].color }} />
            <span>{MODEL[id].label}</span>
            <b className={`num ${idx === 0 ? "is-gold" : ""}`}>{f4(getRun("250k", id, "all").rocAuc)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- feature-group dots */
export function GroupDots({ budget }: { budget: BudgetId }) {
  const W = 540;
  const rowH = 74;
  const x = lin(0.55, 0.9, 0, W);
  const ticks = [0.6, 0.7, 0.8, 0.9];
  return (
    <div className="dots">
      <div className="dots-grid" style={{ gridTemplateRows: `repeat(${MODEL_ORDER.length}, ${rowH}px) 34px` }}>
        {MODEL_ORDER.slice().reverse().map((id) => {
          const v = { low: getRun(budget, id, "low_level").rocAuc, high: getRun(budget, id, "high_level").rocAuc, all: getRun(budget, id, "all").rocAuc };
          const lo = Math.min(v.low, v.high, v.all);
          const hi = Math.max(v.low, v.high, v.all);
          const c = MODEL[id].color;
          return (
            <div className="dots-row" key={id}>
              <span className="dots-name">{MODEL[id].label}</span>
              <span className="dots-track" style={{ width: W }}>
                {ticks.map((t) => <i key={t} className="dots-tick" style={{ left: x(t) }} />)}
                <i className="dots-span" style={{ left: x(lo), width: x(hi) - x(lo), background: c }} />
                <i className="mark mark-low" style={{ left: x(v.low), borderColor: c }} title={`low-level ${f4(v.low)}`} />
                <i className="mark mark-high" style={{ left: x(v.high), background: c }} title={`high-level ${f4(v.high)}`} />
                <i className="mark mark-all" style={{ left: x(v.all), borderColor: c }} title={`all ${f4(v.all)}`}><b style={{ background: c }} /></i>
              </span>
              <span className="num dots-vals"><em>{f4(v.low)}</em><em>{f4(v.high)}</em><em>{f4(v.all)}</em></span>
            </div>
          );
        })}
        <div className="dots-row dots-axis">
          <span />
          <span className="dots-track" style={{ width: W }}>
            {ticks.map((t) => <em key={t} className="num" style={{ left: x(t) }}>{t.toFixed(1)}</em>)}
          </span>
          <span className="dots-vals dots-keys"><em>low</em><em>high</em><em>all</em></span>
        </div>
      </div>
      <div className="dots-legend">
        <span><i className="mark mark-low" /> 21 low-level features</span>
        <span><i className="mark mark-high" /> 7 high-level features</span>
        <span><i className="mark mark-all"><b /></i> all 28</span>
        <span className="dots-unit">Test ROC-AUC at {BUDGET_LABEL[budget]} events</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- scaling chart */
export function ScalingChart({ group, reference }: { group: GroupId; reference?: { value: number; label: string } }) {
  const [hover, setHover] = useState<BudgetId | null>(null);
  const W = 980;
  const H = 520;
  const m = { l: 70, t: 24, r: 250, b: 60 };
  const series = MODEL_ORDER.map((id) => ({ id, values: BUDGET_ORDER.map((b) => getRun(b, id, group).rocAuc) }));
  const all = series.flatMap((s) => s.values).concat(reference ? [reference.value] : []);
  const yMin = Math.floor((Math.min(...all) - 0.01) * 20) / 20;
  const yMax = Math.ceil((Math.max(...all) + 0.005) * 20) / 20;
  const rows = BUDGET_ORDER.map((b) => data.budgets[b].rows);
  const x = (i: number) => lin(Math.log10(rows[0]), Math.log10(rows[2]), m.l + 30, W - m.r - 20)(Math.log10(rows[i]));
  const y = lin(yMin, yMax, H - m.b, m.t);
  const yTicks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t += 0.05) yTicks.push(Number(t.toFixed(2)));

  // End labels: keep each next to its line, pushed apart when two lines finish close together.
  const labels = series.map((s) => ({ id: s.id, value: s.values[2], y: y(s.values[2]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 28) labels[i].y = labels[i - 1].y + 28;

  return (
    <svg className="scaling" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Test ROC-AUC against sample size, ${group} features`} onMouseLeave={() => setHover(null)}>
      <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} className="plot-surface" />
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={m.l} y1={y(t)} x2={W - m.r} y2={y(t)} className="grid" />
          <text x={m.l - 12} y={y(t) + 5} textAnchor="end" className="tick">{t.toFixed(2)}</text>
        </g>
      ))}
      {BUDGET_ORDER.map((b, i) => (
        <g key={b}>
          <line x1={x(i)} y1={m.t} x2={x(i)} y2={H - m.b} className={hover === b ? "grid grid-hover" : "grid"} />
          <text x={x(i)} y={H - m.b + 26} textAnchor="middle" className="tick tick-strong">{BUDGET_LABEL[b]}</text>
        </g>
      ))}
      <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="axis-title">Events in the sample (log scale)</text>
      <text transform={`translate(18 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">Test ROC-AUC</text>
      {reference && (
        <g className="reference">
          <line x1={m.l} y1={y(reference.value)} x2={W - m.r} y2={y(reference.value)} />
          <text x={m.l + 8} y={y(reference.value) - 8}>{reference.label}</text>
        </g>
      )}
      {series.map((s, i) => {
        const c = MODEL[s.id].color;
        const delay = 0.25 + i * 0.4;
        return (
          <g key={s.id}>
            <path d={"M" + s.values.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("L")} pathLength={1} className="curve" stroke={c} style={{ animationDelay: `${delay}s` }} />
            {s.values.map((v, k) => (
              <g key={k} className="pt" style={{ animationDelay: `${delay + 0.25 + k * 0.2}s` }}>
                <circle cx={x(k)} cy={y(v)} r={6} fill={c} stroke="var(--bg)" strokeWidth={2} />
                {hover === BUDGET_ORDER[k] && k < 2 && (
                  <text x={x(k) + 10} y={y(v) - 8} className="pt-value">{f4(v)}</text>
                )}
              </g>
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <g key={l.id} className="pt" style={{ animationDelay: `${1.5 + MODEL_ORDER.indexOf(l.id) * 0.4}s` }}>
          <path d={`M${x(2) + 9},${y(l.value)} L${W - m.r + 2},${l.y} H${W - m.r + 14}`} fill="none" stroke={MODEL[l.id].color} strokeWidth={1.5} />
          <text x={W - m.r + 22} y={l.y + 5} className="end-label">{MODEL[l.id].label}</text>
          <text x={W - 4} y={l.y + 5} textAnchor="end" className={`end-value ${l.id === "resnet_mlp" ? "is-gold" : ""}`}>{f4(l.value)}</text>
          {i === 0 && <text x={W - 4} y={l.y - 22} textAnchor="end" className="tick">at 2.5M</text>}
        </g>
      ))}
      {BUDGET_ORDER.map((b, i) => (
        <rect key={b} x={x(i) - 60} y={m.t} width={120} height={H - m.b - m.t} fill="transparent" onMouseEnter={() => setHover(b)} />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------- cost bars */
export function CostBars({ budget }: { budget: BudgetId }) {
  const rows = MODEL_ORDER.map((id) => getRun(budget, id, "all"));
  const max = Math.max(...BUDGET_ORDER.flatMap((b) => MODEL_ORDER.map((id) => getRun(b, id, "all").trainSeconds)));
  return (
    <div className="cost">
      <div className="cost-head">
        <span>Model</span>
        <span>Training time, seconds on one {data.run.gpu} GPU</span>
        <span>ECE</span>
        <span>ROC-AUC</span>
      </div>
      {rows.map((r: { model: ModelId; trainSeconds: number; ece: number; rocAuc: number }) => (
        <div className="cost-row" key={r.model}>
          <span>{MODEL[r.model].label}</span>
          <span className="cost-bar">
            <i style={{ width: `${Math.max(0.4, (r.trainSeconds / max) * 100)}%`, background: MODEL[r.model].color }} />
            <b className="num">{r.trainSeconds.toFixed(1)}</b>
          </span>
          <span className="num">{f4(r.ece)}</span>
          <span className="num">{f4(r.rocAuc)}</span>
        </div>
      ))}
    </div>
  );
}
