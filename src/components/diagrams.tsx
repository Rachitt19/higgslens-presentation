import { useEffect, useState } from "react";
import type { ModelId } from "../lib/data";
import { cfg, data, int } from "../lib/data";

const W = 760;
const H = 440;

interface Column {
  drawn: number; // nodes drawn (a wide layer is abbreviated)
  label: string;
  sub?: string;
}

/** Mini 21 low-level (violet) + 7 high-level (gold) feature vector strip entering each model. */
function FeatureStrip({ x, midY, height = 168 }: { x: number; midY: number; height?: number }) {
  const step = height / 28;
  const top = midY - height / 2;
  return (
    <g aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => {
        const isHigh = i >= 21;
        return (
          <rect
            key={i}
            x={x - 7}
            y={top + i * step}
            width={11}
            height={Math.max(2.6, step - 1.6)}
            rx={1}
            fill={isHigh ? "#F0B95A" : "#A78BFA"}
            fillOpacity={isHigh ? 0.9 : 0.72}
          />
        );
      })}
    </g>
  );
}

/** Fully connected layers rendered in Stellar White, Quantum Violet and Particle Magenta, with animated forward flow. */
function LayerNet({ columns, variant }: { columns: Column[]; variant: "linear" | "shallow" | "deep" }) {
  const x = (i: number) => 76 + (i * (W - 156)) / (columns.length - 1);
  const top = 44;
  const usable = H - 134;
  const ys = (n: number) =>
    Array.from({ length: n }, (_, k) => top + usable / 2 + (k - (n - 1) / 2) * Math.min(30, usable / Math.max(1, n - 1)));

  const nodeColor = (colIdx: number) => {
    if (variant === "linear") return colIdx === 0 ? "#F4F1EB" : "#A1A1AA";
    if (colIdx === 0) return "#F4F1EB";
    if (colIdx === columns.length - 1) return "#D946EF";
    if (variant === "deep") return colIdx % 2 === 1 ? "#A78BFA" : "#D946EF";
    return "#A78BFA";
  };

  const edgeColor = (colIdx: number) => {
    if (variant === "linear") return "#A1A1AA";
    if (colIdx >= columns.length - 2) return "#D946EF";
    return colIdx % 2 === 0 ? "#F4F1EB" : "#A78BFA";
  };

  const flowColor = variant === "linear" ? "#F4F1EB" : "#A78BFA";
  const midY = top + usable / 2;
  const flowTracks = [-66, 0, 66];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="net" role="img">
      <FeatureStrip x={34} midY={midY} height={190} />
      {ys(columns[0].drawn).map((y1, a) => (
        <line key={`f-${a}`} x1={40} y1={midY + (a - (columns[0].drawn - 1) / 2) * 14} x2={x(0)} y2={y1} stroke="#A78BFA" strokeOpacity={0.25} strokeWidth={0.8} />
      ))}
      {columns.slice(0, -1).map((c, i) =>
        ys(c.drawn).flatMap((y1, a) =>
          ys(columns[i + 1].drawn).map((y2, b) => (
            <line
              key={`${i}-${a}-${b}`}
              x1={x(i)}
              y1={y1}
              x2={x(i + 1)}
              y2={y2}
              stroke={edgeColor(i)}
              className="net-edge"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          )),
        ),
      )}

      {/* Animated information pulses flowing sequentially from input to logit */}
      {flowTracks.map((dy, tIdx) => {
        const pts = columns
          .map((c, i) => {
            const yArr = ys(c.drawn);
            const targetY = c.drawn === 1 ? midY : yArr[Math.min(yArr.length - 1, Math.max(0, Math.round(((yArr.length - 1) * (tIdx + 1)) / 4)))];
            return `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${(c.drawn === 1 ? midY : targetY + dy * 0.08).toFixed(1)}`;
          })
          .join(" ");
        const begin = `${tIdx * 0.85}s`;
        return (
          <circle key={tIdx} r={3.2} fill={tIdx === 1 ? "#F0B95A" : flowColor} opacity={0} className="net-flow-dot">
            <animateMotion dur="3.4s" begin={begin} repeatCount="indefinite" path={pts} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="3.4s" begin={begin} repeatCount="indefinite" />
          </circle>
        );
      })}

      {columns.map((c, i) => {
        const fill = nodeColor(i);
        const isInput = i === 0;
        const isOut = i === columns.length - 1;
        return (
          <g key={i} className="net-col" style={{ animationDelay: `${i * 0.25}s` }}>
            {ys(c.drawn).map((y, k) => (
              <g key={k}>
                {isOut && variant !== "linear" && (
                  <circle cx={x(i)} cy={y} r={15} fill="none" stroke="#F4F1EB" strokeOpacity={0.35} strokeWidth={1} />
                )}
                <circle
                  cx={x(i)}
                  cy={y}
                  r={isOut ? 9 : 5.5}
                  fill={isInput ? "var(--bg)" : fill}
                  stroke={isOut ? "#F4F1EB" : fill}
                  strokeWidth={isInput || isOut ? 1.8 : 1.4}
                />
              </g>
            ))}
            <text x={x(i)} y={H - 46} textAnchor="middle" className="net-label">{c.label}</text>
            {c.sub && <text x={x(i)} y={H - 22} textAnchor="middle" className="net-sub">{c.sub}</text>}
          </g>
        );
      })}
      {variant !== "linear" && (
        <text x={380} y={H - 20} textAnchor="middle" className="net-sub">
          each hidden layer: z = Wx + b → BatchNorm → ReLU → Dropout · output: 1 logit → σ(z) ∈ (0, 1)
        </text>
      )}
    </svg>
  );
}

/** Boosted tree ensemble in Energy Gold and Stellar White. */
function Trees() {
  const gold = "#F0B95A";
  const tree = (cx: number, key: number, lean: number) => {
    const levels = [[0], [-32, 32], [-50, -17, 17, 50]];
    const y = (l: number) => 70 + l * 100;
    const leafIdx = (key + lean) % 4;
    const midDx = levels[1][leafIdx < 2 ? 0 : 1];
    const leafDx = levels[2][leafIdx];
    const flowPath = `M${cx},${y(0)} L${cx + midDx},${y(1)} L${cx + leafDx},${y(2)}`;
    return (
      <g key={key} className="net-col" style={{ animationDelay: `${key * 0.22}s` }}>
        {levels.slice(0, -1).flatMap((lv, l) =>
          lv.flatMap((dx, k) =>
            [0, 1].map((c) => (
              <line
                key={`${l}-${k}-${c}`}
                x1={cx + dx}
                y1={y(l)}
                x2={cx + levels[l + 1][k * 2 + c]}
                y2={y(l + 1)}
                stroke={gold}
                strokeOpacity={0.45}
                strokeWidth={1.25}
              />
            )),
          ),
        )}
        <circle r={3} fill="#F4F1EB" opacity={0} className="net-flow-dot">
          <animateMotion dur="2.6s" begin={`${key * 0.5}s`} repeatCount="indefinite" path={flowPath} />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.6s" begin={`${key * 0.5}s`} repeatCount="indefinite" />
        </circle>
        {levels.flatMap((lv, l) =>
          lv.map((dx, k) => {
            const active = l === 2 && (k + lean) % 3 === 0;
            return (
              <circle
                key={`${l}-${k}`}
                cx={cx + dx}
                cy={y(l)}
                r={l === 2 ? 5 : 6}
                fill={active ? gold : "var(--bg)"}
                stroke={active ? "#F4F1EB" : gold}
                strokeWidth={1.5}
              />
            );
          }),
        )}
      </g>
    );
  };
  const xs = [90, 228, 366, 504];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="net" role="img">
      <FeatureStrip x={22} midY={172} height={160} />
      <line x1={28} y1={172} x2={90} y2={70} stroke="#F0B95A" strokeOpacity={0.25} strokeWidth={0.9} />
      {xs.map((x, i) => tree(x, i, i))}
      {xs.slice(0, -1).map((x, i) => (
        <text key={i} x={x + 69} y={182} textAnchor="middle" className="net-op">+</text>
      ))}
      <text x={590} y={182} textAnchor="middle" className="net-op">+ …</text>
      <g className="net-col" style={{ animationDelay: "1s" }}>
        <circle cx={690} cy={172} r={14} fill="none" stroke={gold} strokeOpacity={0.35} strokeWidth={1} />
        <circle cx={690} cy={172} r={9} fill={gold} stroke="#F4F1EB" strokeWidth={1.5} />
        <text x={690} y={H - 44} textAnchor="middle" className="net-label">score</text>
      </g>
      <text x={297} y={H - 44} textAnchor="middle" className="net-label">
        up to {cfg<number>("xgboost", "n_estimators").toLocaleString("en-US")} trees, depth {cfg<number>("xgboost", "max_depth")}
      </text>
      <text x={297} y={H - 22} textAnchor="middle" className="net-sub">each tree corrects the sum of the ones before it</text>
    </svg>
  );
}

/** Residual MLP in Stellar White, Quantum Violet and luminous Particle Magenta skip connections with animated dual-path flow. */
function Residual() {
  const blocks = cfg<number[]>("resnet_mlp", "hidden_sizes");
  const width = blocks[0];
  const bx = (i: number) => 178 + i * 118;
  const mid = 205;
  const white = "#F4F1EB";
  const violet = "#A78BFA";
  const magenta = "#D946EF";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="net" role="img">
      <defs>
        <filter id="skip-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main forward signal spine */}
      <FeatureStrip x={22} midY={mid} height={144} />
      <line x1={28} y1={mid} x2={710} y2={mid} stroke={white} strokeOpacity={0.35} strokeWidth={1.6} />

      {/* Input projection */}
      <g className="net-col">
        {[-60, -36, -12, 12, 36, 60].map((dy) => (
          <circle key={dy} cx={50} cy={mid + dy} r={5} fill="var(--bg)" stroke={white} strokeWidth={1.6} />
        ))}
        <rect x={98} y={mid - 64} width={16} height={128} rx={3} fill={violet} stroke={white} strokeOpacity={0.5} strokeWidth={1} />
        <text x={50} y={H - 46} textAnchor="middle" className="net-label">28 in</text>
        <text x={106} y={mid - 78} textAnchor="middle" className="net-sub">Linear {width}</text>
      </g>

      {/* Residual blocks with prominent Particle Magenta skip arcs and synchronized dual-path pulses */}
      {blocks.map((_, i) => {
        const x0 = bx(i);
        const skipStart = x0 - 22;
        const skipEnd = x0 + 78;
        const arcPeakY = mid - 122;
        const apexX = (skipStart + skipEnd) / 2;
        const skipPath = `M${skipStart},${mid} C${skipStart},${mid - 162} ${skipEnd},${mid - 162} ${skipEnd},${mid - 14}`;
        const blockPath = `M${skipStart},${mid} L${x0 + 18},${mid - 28} L${x0 + 38},${mid + 24} L${skipEnd},${mid}`;
        const phase = `${(i * 0.7).toFixed(2)}s`;
        return (
          <g key={i} className="net-col" style={{ animationDelay: `${0.25 + i * 0.28}s` }}>
            <path d={skipPath} fill="none" stroke={magenta} strokeWidth={2.5} strokeLinecap="round" filter="url(#skip-glow)" />
            <path
              d={`M${apexX - 4},${arcPeakY - 4} L${apexX + 5},${arcPeakY} L${apexX - 4},${arcPeakY + 4}`}
              fill="none"
              stroke={white}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={skipStart} cy={mid} r={3.2} fill={magenta} />

            <rect x={x0} y={mid - 84} width={56} height={168} rx={6} fill="#050609" stroke={violet} strokeOpacity={0.65} strokeWidth={1.2} />
            <rect x={x0 + 12} y={mid - 68} width={12} height={136} rx={2} fill={violet} />
            <rect x={x0 + 32} y={mid - 34} width={12} height={68} rx={2} fill={white} fillOpacity={0.88} />

            <circle r={3.6} fill={white} opacity={0} className="net-flow-dot">
              <animateMotion dur="2.8s" begin={phase} repeatCount="indefinite" path={skipPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.8s" begin={phase} repeatCount="indefinite" />
            </circle>
            <circle r={3.2} fill="#F0B95A" opacity={0} className="net-flow-dot">
              <animateMotion dur="2.8s" begin={phase} repeatCount="indefinite" path={blockPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.8s" begin={phase} repeatCount="indefinite" />
            </circle>

            <circle cx={skipEnd} cy={mid} r={12.5} fill="#050609" stroke={magenta} strokeWidth={2} />
            <text x={skipEnd} y={mid + 5.5} textAnchor="middle" className="net-plus">+</text>
            <text x={x0 + 28} y={mid + 106} textAnchor="middle" className="net-sub">block {i + 1}</text>
          </g>
        );
      })}

      {/* Output logit -> sigmoid */}
      <g className="net-col" style={{ animationDelay: "1.5s" }}>
        <circle cx={710} cy={mid} r={15} fill="none" stroke={magenta} strokeOpacity={0.45} strokeWidth={1.2} />
        <circle cx={710} cy={mid} r={9} fill={magenta} stroke={white} strokeWidth={1.6} />
        <text x={710} y={H - 46} textAnchor="middle" className="net-label">1 logit</text>
      </g>

      <text x={380} y={H - 46} textAnchor="middle" className="net-label">
        block: BN → Linear {width * 2} → ReLU → Linear {width} → Dropout 0.10
      </text>
      <text x={380} y={H - 22} textAnchor="middle" className="net-sub net-sub-magenta">
        y = x + F(x): skip arc carries x straight to + while the block learns residual F(x) · inference σ(z)
      </text>
    </svg>
  );
}

/** Interactive side-by-side comparison of Ordinary Deep MLP vs. Residual MLP using exact repo architectures. */
export function CompareDeepResidual({ flowKey = 0 }: { flowKey?: number }) {
  const deepSizes = cfg<number[]>("deep_mlp", "hidden_sizes");
  const resSizes = cfg<number[]>("resnet_mlp", "hidden_sizes");
  const deepParams = data.configs.deep_mlp.parameterCount ?? 0;
  const resParams = data.configs.resnet_mlp.parameterCount ?? 0;

  const white = "#F4F1EB";
  const violet = "#A78BFA";
  const magenta = "#D946EF";
  const gold = "#F0B95A";

  const deepY = 104;
  const deepCols = [
    { x: 64, n: 6, label: "28 in", fill: "var(--bg)", stroke: white },
    ...deepSizes.map((w, idx) => ({
      x: 172 + idx * 92,
      n: 7,
      label: String(w),
      fill: idx % 2 === 0 ? violet : magenta,
      stroke: idx % 2 === 0 ? violet : magenta,
    })),
    { x: 676, n: 1, label: "1 logit", fill: violet, stroke: white },
  ];
  const deepYs = (n: number) => Array.from({ length: n }, (_, k) => deepY + (k - (n - 1) / 2) * 14);
  const deepFlow = `M64,${deepY} L172,${deepY} L264,${deepY} L356,${deepY} L448,${deepY} L540,${deepY} L676,${deepY}`;

  const resY = 324;
  const resBx = (i: number) => 204 + i * 110;

  return (
    <svg key={flowKey} viewBox={`0 0 ${W} ${H}`} className="net net-compare" role="img" aria-label="Comparison between Ordinary Deep MLP and Residual MLP">
      <defs>
        <filter id="cmp-skip-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text x={24} y={28} className="cmp-title" fill={violet}>
        ORDINARY DEEP MLP · {deepSizes.length} × {deepSizes[0]} ({int(deepParams)} params)
      </text>
      <text x={736} y={28} textAnchor="end" className="cmp-eq">
        y = F₅(…F₁(x)) · sequential rewrite
      </text>

      <FeatureStrip x={26} midY={deepY} height={92} />
      {deepCols.slice(0, -1).map((c, i) =>
        deepYs(c.n).flatMap((y1, a) =>
          deepYs(deepCols[i + 1].n).map((y2, b) => (
            <line key={`d-${i}-${a}-${b}`} x1={c.x} y1={y1} x2={deepCols[i + 1].x} y2={y2} stroke={violet} strokeOpacity={0.14} strokeWidth={0.7} />
          )),
        ),
      )}
      <circle r={4} fill={gold} opacity={0} className="net-flow-dot">
        <animateMotion dur="3.0s" repeatCount="indefinite" path={deepFlow} />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="3.0s" repeatCount="indefinite" />
      </circle>
      <circle r={3.2} fill={white} opacity={0} className="net-flow-dot">
        <animateMotion dur="3.0s" begin="1.5s" repeatCount="indefinite" path={deepFlow} />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="3.0s" begin="1.5s" repeatCount="indefinite" />
      </circle>
      {deepCols.map((c, i) => (
        <g key={`dc-${i}`}>
          {deepYs(c.n).map((y, k) => (
            <circle key={k} cx={c.x} cy={y} r={c.n === 1 ? 7.5 : 3.6} fill={c.fill} stroke={c.stroke} strokeWidth={1.3} />
          ))}
          <text x={c.x} y={deepY + 62} textAnchor="middle" className="cmp-lbl">{c.label}</text>
        </g>
      ))}

      <line x1={24} y1={194} x2={736} y2={194} stroke="var(--graphite)" strokeWidth={1} />

      <text x={24} y={224} className="cmp-title" fill={magenta}>
        RESIDUAL MLP · {resSizes.length} × {resSizes[0]} blocks ({int(resParams)} params)
      </text>
      <text x={736} y={224} textAnchor="end" className="cmp-eq cmp-eq-mag">
        y = x + F(x) · identity skip preserved
      </text>

      <FeatureStrip x={26} midY={resY} height={92} />
      <line x1={32} y1={resY} x2={682} y2={resY} stroke={white} strokeOpacity={0.32} strokeWidth={1.4} />
      {[-34, -17, 0, 17, 34].map((dy) => (
        <circle key={dy} cx={64} cy={resY + dy} r={3.6} fill="var(--bg)" stroke={white} strokeWidth={1.4} />
      ))}
      <text x={64} y={resY + 72} textAnchor="middle" className="cmp-lbl">28 in</text>

      <rect x={118} y={resY - 40} width={14} height={80} rx={3} fill={violet} stroke={white} strokeOpacity={0.45} />
      <text x={125} y={resY + 72} textAnchor="middle" className="cmp-lbl">Lin {resSizes[0]}</text>

      {resSizes.map((w, i) => {
        const x0 = resBx(i);
        const s0 = x0 - 18;
        const s1 = x0 + 68;
        const skipPath = `M${s0},${resY} C${s0},${resY - 94} ${s1},${resY - 94} ${s1},${resY - 11}`;
        const blkPath = `M${s0},${resY} L${x0 + 16},${resY - 18} L${x0 + 34},${resY + 16} L${s1},${resY}`;
        const begin = `${(i * 0.65).toFixed(2)}s`;
        return (
          <g key={`rb-${i}`}>
            <path d={skipPath} fill="none" stroke={magenta} strokeWidth={2.2} filter="url(#cmp-skip-glow)" />
            <circle cx={s0} cy={resY} r={2.6} fill={magenta} />
            <rect x={x0} y={resY - 48} width={48} height={96} rx={5} fill="#050609" stroke={violet} strokeOpacity={0.65} />
            <rect x={x0 + 10} y={resY - 38} width={10} height={76} rx={2} fill={violet} />
            <rect x={x0 + 28} y={resY - 19} width={10} height={38} rx={2} fill={white} fillOpacity={0.88} />

            <circle r={3.4} fill={white} opacity={0} className="net-flow-dot">
              <animateMotion dur="2.6s" begin={begin} repeatCount="indefinite" path={skipPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.6s" begin={begin} repeatCount="indefinite" />
            </circle>
            <circle r={2.8} fill={gold} opacity={0} className="net-flow-dot">
              <animateMotion dur="2.6s" begin={begin} repeatCount="indefinite" path={blkPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.6s" begin={begin} repeatCount="indefinite" />
            </circle>

            <circle cx={s1} cy={resY} r={10.5} fill="#050609" stroke={magenta} strokeWidth={1.8} />
            <text x={s1} y={resY + 4.5} textAnchor="middle" className="net-plus">+</text>
            <text x={x0 + 24} y={resY + 72} textAnchor="middle" className="cmp-lbl">
              {w * 2}→{w}
            </text>
          </g>
        );
      })}

      <circle cx={682} cy={resY} r={12} fill="none" stroke={magenta} strokeOpacity={0.45} />
      <circle cx={682} cy={resY} r={7.5} fill={magenta} stroke={white} strokeWidth={1.4} />
      <text x={682} y={resY + 72} textAnchor="middle" className="cmp-lbl">1 logit</text>
    </svg>
  );
}

const LEARN_STAGES = [
  {
    id: "01",
    short: "Input",
    title: "01 · Standardized mini-batch inputs (x ∈ ℝ²⁸)",
    formula: "x' = (x − μ_train) / σ_train · batch_size = 1,024",
    body: "21 kinematic features and 7 invariant masses enter standardized strictly from training statistics—preventing validation or test leakage.",
  },
  {
    id: "02",
    short: "Hidden",
    title: "02 · Forward pass: linear + BatchNorm + ReLU + Dropout",
    formula: "z^(l) = W^(l) a^(l−1) + b^(l)  →  a^(l) = Dropout(ReLU(BN(z^(l))))",
    body: "Each neuron computes weighted sums plus bias, BatchNorm stabilizes layer distributions, ReLU(z)=max(0,z) introduces nonlinearity, and Dropout (0.10–0.20) regularizes.",
  },
  {
    id: "03",
    short: "Logit",
    title: "03 · Scalar logit & inference probability σ(z)",
    formula: "z = wᵀh + b ∈ ℝ  ·  ŷ = σ(z) = 1 / (1 + e⁻ᶻ) ∈ (0, 1)",
    body: "The final linear head outputs an unbounded logit z; sigmoid maps z to probability ŷ at evaluation without distorting training gradients.",
  },
  {
    id: "04",
    short: "Loss",
    title: "04 · Binary cross-entropy loss on logits",
    formula: "L(z, y) = −[ y log σ(z) + (1 − y) log(1 − σ(z)) ],  y ∈ {0, 1}",
    body: "Compares the model prediction against the simulated signal/background label y across the 1,024-event mini-batch.",
  },
  {
    id: "05",
    short: "Backprop",
    title: "05 · Backpropagation & residual gradient highway",
    formula: "∇_θ L = ∂L/∂θ  ·  ∂(x + F(x))/∂x = I + ∂F/∂x",
    body: "Gradients flow backward from the loss to earlier weights; skip connections provide an identity gradient term I that reduces vanishing gradients.",
  },
  {
    id: "06",
    short: "AdamW",
    title: "06 · AdamW weight update & cosine LR schedule",
    formula: "θ ← θ − η ( m̂_t / √v̂_t + λ θ )  ·  η = 10⁻³, λ = 10⁻⁵ / 10⁻⁴",
    body: "AdamW updates weights using adaptive first/second moments and decoupled weight decay, annealed via cosine schedule on Deep & Residual MLPs.",
  },
  {
    id: "07",
    short: "Epoch",
    title: "07 · Validation check, early stopping & next iteration",
    formula: "patience = 5 (Compact) / 8 (Deep & Residual) · max_epochs = 30 / 60",
    body: "Training proceeds batch by batch; validation performance governs early stopping before scoring the frozen held-out test set once.",
  },
] as const;

/** Interactive 7-stage neural network learning loop (forward pass -> loss -> backprop -> AdamW update -> iterate). */
export function LearningVisualizer({ paused = false, skipped = false }: { paused?: boolean; skipped?: boolean }) {
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || paused || skipped) return;
    const id = window.setInterval(() => {
      setStage((s) => (s + 1) % LEARN_STAGES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [auto, paused, skipped]);

  const cur = LEARN_STAGES[stage];
  const isFwd = stage <= 2;
  const isLoss = stage === 3;
  const isBwd = stage === 4;
  const isOpt = stage === 5;
  const isNext = stage === 6;

  const white = "#F4F1EB";
  const silver = "#A1A1AA";
  const violet = "#A78BFA";
  const magenta = "#D946EF";
  const gold = "#F0B95A";

  const nodesX = [88, 208, 326, 444, 560, 678];
  const midY = 170;

  return (
    <div className="learn-wrap">
      <div className="learn-toolbar">
        <div className="learn-pills" role="tablist" aria-label="Neural network training stages">
          {LEARN_STAGES.map((st, idx) => (
            <button
              key={st.id}
              type="button"
              role="tab"
              aria-selected={stage === idx}
              className={`num ${stage === idx ? "is-on" : ""}`}
              onClick={() => {
                setAuto(false);
                setStage(idx);
              }}
            >
              {st.id} {st.short}
            </button>
          ))}
        </div>
        <div className="learn-ctrls">
          <button type="button" className="num" onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
            {auto ? "Auto: On" : "Auto: Off"}
          </button>
          <button
            type="button"
            className="num"
            onClick={() => {
              setAuto(false);
              setStage((s) => (s + 1) % LEARN_STAGES.length);
            }}
          >
            Next →
          </button>
        </div>
      </div>

      <svg viewBox="0 0 760 326" className="learn-svg" role="img" aria-label={cur.title}>
        <defs>
          <filter id="learn-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Forward spine: Input -> Hidden1 -> Hidden2 -> Logit -> Sigmoid/Loss */}
        <line x1={88} y1={midY} x2={560} y2={midY} stroke={isFwd ? violet : silver} strokeOpacity={isFwd ? 0.65 : 0.25} strokeWidth={isFwd ? 2.2 : 1.4} />
        <line x1={560} y1={midY} x2={678} y2={midY} stroke={isLoss ? gold : silver} strokeOpacity={isLoss ? 0.85 : 0.28} strokeWidth={1.8} />

        {/* Backprop reverse gradient highway (bottom arc: Loss -> Hidden2 -> Hidden1) */}
        <path
          d={`M ${nodesX[5]},${midY + 34} C ${nodesX[5]},278 ${nodesX[1]},278 ${nodesX[1]},${midY + 34}`}
          fill="none"
          stroke={magenta}
          strokeWidth={isBwd ? 2.8 : 1.3}
          strokeOpacity={isBwd ? 0.95 : 0.22}
          strokeDasharray={isBwd ? "none" : "4 5"}
          filter={isBwd ? "url(#learn-glow)" : undefined}
        />
        <text x={384} y={288} textAnchor="middle" className="cmp-lbl" style={{ fill: isBwd ? magenta : silver, opacity: isBwd ? 1 : 0.65 }}>
          ← backprop gradients ∂L / ∂W (magenta)
        </text>

        {/* AdamW & Next-Iteration feedback arc (top arc: Optimizer -> Weights) */}
        <path
          d={`M ${nodesX[4]},${midY - 36} C ${nodesX[4]},52 ${nodesX[1]},52 ${nodesX[1]},${midY - 36}`}
          fill="none"
          stroke={gold}
          strokeWidth={isOpt || isNext ? 2.6 : 1.2}
          strokeOpacity={isOpt || isNext ? 0.95 : 0.2}
          strokeDasharray="5 4"
        />
        <text x={384} y={44} textAnchor="middle" className="cmp-lbl" style={{ fill: isOpt || isNext ? gold : silver, opacity: isOpt || isNext ? 1 : 0.65 }}>
          {isNext ? "next mini-batch (batch_size 1,024) · validation ROC-AUC check →" : "← AdamW update: θ ← θ − η(m̂/√v̂ + λθ)"}
        </text>

        {/* Animated pulses reflecting current learning phase */}
        {(isFwd || isNext) && (
          <circle r={4.2} fill={gold} opacity={0} className="net-flow-dot">
            <animateMotion dur="2.1s" repeatCount="indefinite" path={`M ${nodesX[0]},${midY} L ${nodesX[4]},${midY}`} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.1s" repeatCount="indefinite" />
          </circle>
        )}
        {isBwd && (
          <circle r={4.5} fill={magenta} opacity={0} className="net-flow-dot">
            <animateMotion dur="2.1s" repeatCount="indefinite" path={`M ${nodesX[5]},${midY + 34} C ${nodesX[5]},278 ${nodesX[1]},278 ${nodesX[1]},${midY + 34}`} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.1s" repeatCount="indefinite" />
          </circle>
        )}
        {(isOpt || isNext) && (
          <circle r={4.2} fill={gold} opacity={0} className="net-flow-dot">
            <animateMotion dur="2.2s" repeatCount="indefinite" path={`M ${nodesX[4]},${midY - 36} C ${nodesX[4]},52 ${nodesX[1]},52 ${nodesX[1]},${midY - 36}`} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Stage 1: 28 Inputs */}
        <g transform={`translate(${nodesX[0]}, ${midY})`}>
          <rect x={-36} y={-48} width={72} height={96} rx={7} fill="#050609" stroke={stage === 0 ? gold : silver} strokeWidth={stage === 0 ? 2 : 1.2} />
          <FeatureStrip x={-12} midY={0} height={66} />
          <text x={14} y={-8} textAnchor="middle" className="learn-node-main">ℝ²⁸</text>
          <text x={14} y={12} textAnchor="middle" className="learn-node-sub">21+7</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">Input x</text>
        </g>

        {/* Stage 2A: Hidden Linear + BN + ReLU */}
        <g transform={`translate(${nodesX[1]}, ${midY})`}>
          <rect x={-44} y={-50} width={88} height={100} rx={7} fill="#050609" stroke={stage === 1 || isOpt ? violet : silver} strokeWidth={stage === 1 || isOpt ? 2 : 1.2} />
          <text x={0} y={-14} textAnchor="middle" className="learn-node-main">Wx + b</text>
          <text x={0} y={7} textAnchor="middle" className="learn-node-sub" style={{ fill: violet }}>BN · ReLU</text>
          <text x={0} y={26} textAnchor="middle" className="learn-node-sub">Dropout</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">Layers</text>
        </g>

        {/* Stage 2B: Residual / Depth Block */}
        <g transform={`translate(${nodesX[2]}, ${midY})`}>
          <rect x={-42} y={-46} width={84} height={92} rx={7} fill="#050609" stroke={stage === 1 || isBwd ? magenta : silver} strokeWidth={stage === 1 || isBwd ? 2 : 1.2} />
          <text x={0} y={-8} textAnchor="middle" className="learn-node-main">x + F(x)</text>
          <text x={0} y={14} textAnchor="middle" className="learn-node-sub" style={{ fill: magenta }}>Skip path</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">Blocks</text>
        </g>

        {/* Stage 3: Output Logit & Sigmoid */}
        <g transform={`translate(${nodesX[3]}, ${midY})`}>
          <rect x={-40} y={-44} width={80} height={88} rx={7} fill="#050609" stroke={stage === 2 ? gold : silver} strokeWidth={stage === 2 ? 2 : 1.2} />
          <text x={0} y={-8} textAnchor="middle" className="learn-node-main">z ∈ ℝ</text>
          <text x={0} y={14} textAnchor="middle" className="learn-node-sub" style={{ fill: gold }}>ŷ = σ(z)</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">Logit / σ</text>
        </g>

        {/* Stage 4: BCE Loss */}
        <g transform={`translate(${nodesX[4]}, ${midY})`}>
          <rect x={-42} y={-44} width={84} height={88} rx={7} fill="#050609" stroke={isLoss || isOpt ? gold : silver} strokeWidth={isLoss || isOpt ? 2 : 1.2} />
          <text x={0} y={-8} textAnchor="middle" className="learn-node-main">L(z, y)</text>
          <text x={0} y={14} textAnchor="middle" className="learn-node-sub">BCE Loss</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">Loss vs y</text>
        </g>

        {/* Stage 5: Target Label & Val/Early Stop */}
        <g transform={`translate(${nodesX[5]}, ${midY})`}>
          <rect x={-40} y={-44} width={80} height={88} rx={7} fill="#050609" stroke={isBwd || isNext ? magenta : silver} strokeWidth={isBwd || isNext ? 2 : 1.2} />
          <text x={0} y={-8} textAnchor="middle" className="learn-node-main">y ∈ {"{0,1}"}</text>
          <text x={0} y={14} textAnchor="middle" className="learn-node-sub" style={{ fill: white }}>{isNext ? "Early Stop" : "∇_θ L"}</text>
          <text x={0} y={66} textAnchor="middle" className="cmp-lbl">{isNext ? "Val Check" : "Gradient"}</text>
        </g>
      </svg>

      <div className="learn-explain">
        <div className="learn-explain-top">
          <strong style={{ color: gold }}>{cur.title}</strong>
          <code className="num">{cur.formula}</code>
        </div>
        <p className="body">{cur.body}</p>
      </div>
    </div>
  );
}

export function ModelDiagram({ model }: { model: ModelId }) {
  const inputs: Column = { drawn: 10, label: `${data.features.length} in` };
  const out: Column = { drawn: 1, label: "1 logit" };
  if (model === "xgboost") return <Trees />;
  if (model === "resnet_mlp") return <Residual />;
  if (model === "logreg") {
    return <LayerNet variant="linear" columns={[inputs, { drawn: 1, label: "score", sub: "sigmoid of one weighted sum" }]} />;
  }
  const hidden = cfg<number[]>(model, "hidden_sizes");
  const drawn = (w: number) => (w >= 300 ? 12 : w >= 64 ? 9 : 6);
  return (
    <LayerNet
      variant={model === "deep_mlp" ? "deep" : "shallow"}
      columns={[inputs, ...hidden.map((w) => ({ drawn: drawn(w), label: String(w) })), out]}
    />
  );
}
