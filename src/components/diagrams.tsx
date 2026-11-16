import type { ModelId } from "../lib/data";
import { cfg, data, int } from "../lib/data";

const W = 760;
const H = 440;

interface Column {
  drawn: number; // nodes drawn (a wide layer is abbreviated)
  label: string;
  sub?: string;
}

/** Fully connected layers rendered in Stellar White, Quantum Violet and Particle Magenta, with animated forward flow. */
function LayerNet({ columns, variant }: { columns: Column[]; variant: "linear" | "shallow" | "deep" }) {
  const x = (i: number) => 70 + (i * (W - 140)) / (columns.length - 1);
  const top = 46;
  const usable = H - 130;
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

      {/* Animated information pulses flowing sequentially from input to score */}
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
            <text x={x(i)} y={H - 44} textAnchor="middle" className="net-label">{c.label}</text>
            {c.sub && <text x={x(i)} y={H - 22} textAnchor="middle" className="net-sub">{c.sub}</text>}
          </g>
        );
      })}
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
      <line x1={50} y1={mid} x2={710} y2={mid} stroke={white} strokeOpacity={0.35} strokeWidth={1.6} />

      {/* Input projection */}
      <g className="net-col">
        {[-60, -36, -12, 12, 36, 60].map((dy) => (
          <circle key={dy} cx={50} cy={mid + dy} r={5} fill="var(--bg)" stroke={white} strokeWidth={1.6} />
        ))}
        <rect x={98} y={mid - 64} width={16} height={128} rx={3} fill={violet} stroke={white} strokeOpacity={0.5} strokeWidth={1} />
        <text x={50} y={H - 44} textAnchor="middle" className="net-label">28 in</text>
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
            {/* Prominent luminous residual skip arc */}
            <path d={skipPath} fill="none" stroke={magenta} strokeWidth={2.5} strokeLinecap="round" filter="url(#skip-glow)" />
            {/* Directional chevron at skip apex */}
            <path
              d={`M${apexX - 4},${arcPeakY - 4} L${apexX + 5},${arcPeakY} L${apexX - 4},${arcPeakY + 4}`}
              fill="none"
              stroke={white}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={skipStart} cy={mid} r={3.2} fill={magenta} />

            {/* Residual block container */}
            <rect x={x0} y={mid - 84} width={56} height={168} rx={6} fill="#050609" stroke={violet} strokeOpacity={0.65} strokeWidth={1.2} />
            <rect x={x0 + 12} y={mid - 68} width={12} height={136} rx={2} fill={violet} />
            <rect x={x0 + 32} y={mid - 34} width={12} height={68} rx={2} fill={white} fillOpacity={0.88} />

            {/* Animated dual-path information flow: x over skip + F(x) through block */}
            <circle r={3.6} fill={white} opacity={0} className="net-flow-dot">
              <animateMotion dur="2.8s" begin={phase} repeatCount="indefinite" path={skipPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.8s" begin={phase} repeatCount="indefinite" />
            </circle>
            <circle r={3.2} fill="#F0B95A" opacity={0} className="net-flow-dot">
              <animateMotion dur="2.8s" begin={phase} repeatCount="indefinite" path={blockPath} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.8s" begin={phase} repeatCount="indefinite" />
            </circle>

            {/* Summation junction */}
            <circle cx={skipEnd} cy={mid} r={12.5} fill="#050609" stroke={magenta} strokeWidth={2} />
            <text x={skipEnd} y={mid + 5.5} textAnchor="middle" className="net-plus">+</text>
            <text x={x0 + 28} y={mid + 106} textAnchor="middle" className="net-sub">block {i + 1}</text>
          </g>
        );
      })}

      {/* Output score */}
      <g className="net-col" style={{ animationDelay: "1.5s" }}>
        <circle cx={710} cy={mid} r={15} fill="none" stroke={magenta} strokeOpacity={0.45} strokeWidth={1.2} />
        <circle cx={710} cy={mid} r={9} fill={magenta} stroke={white} strokeWidth={1.6} />
        <text x={710} y={H - 44} textAnchor="middle" className="net-label">score</text>
      </g>

      <text x={380} y={H - 44} textAnchor="middle" className="net-label">
        block: Linear {width * 2} (violet) → Linear {width} (white)
      </text>
      <text x={380} y={H - 22} textAnchor="middle" className="net-sub net-sub-magenta">
        y = x + F(x): skip arc carries x straight to + while the block learns residual F(x)
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

  // Top lane: Deep MLP (y = 104)
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
    { x: 676, n: 1, label: "score", fill: violet, stroke: white },
  ];
  const deepYs = (n: number) => Array.from({ length: n }, (_, k) => deepY + (k - (n - 1) / 2) * 14);
  const deepFlow = `M64,${deepY} L172,${deepY} L264,${deepY} L356,${deepY} L448,${deepY} L540,${deepY} L676,${deepY}`;

  // Bottom lane: Residual MLP (y = 318)
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

      {/* ---- Top lane: Ordinary Deep MLP ---- */}
      <text x={24} y={28} className="cmp-title" fill={violet}>
        ORDINARY DEEP MLP · {deepSizes.length} × {deepSizes[0]} ({int(deepParams)} params)
      </text>
      <text x={736} y={28} textAnchor="end" className="cmp-eq">
        y = F₅(…F₁(x)) · sequential rewrite
      </text>

      {deepCols.slice(0, -1).map((c, i) =>
        deepYs(c.n).flatMap((y1, a) =>
          deepYs(deepCols[i + 1].n).map((y2, b) => (
            <line key={`d-${i}-${a}-${b}`} x1={c.x} y1={y1} x2={deepCols[i + 1].x} y2={y2} stroke={violet} strokeOpacity={0.14} strokeWidth={0.7} />
          )),
        ),
      )}
      {/* Sequential animated signal */}
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

      {/* Divider */}
      <line x1={24} y1={194} x2={736} y2={194} stroke="var(--graphite)" strokeWidth={1} />

      {/* ---- Bottom lane: Residual MLP ---- */}
      <text x={24} y={224} className="cmp-title" fill={magenta}>
        RESIDUAL MLP · {resSizes.length} × {resSizes[0]} blocks ({int(resParams)} params)
      </text>
      <text x={736} y={224} textAnchor="end" className="cmp-eq cmp-eq-mag">
        y = x + F(x) · identity skip preserved
      </text>

      <line x1={64} y1={resY} x2={682} y2={resY} stroke={white} strokeOpacity={0.32} strokeWidth={1.4} />
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
      <text x={682} y={resY + 72} textAnchor="middle" className="cmp-lbl">score</text>
    </svg>
  );
}

export function ModelDiagram({ model }: { model: ModelId }) {
  const inputs: Column = { drawn: 10, label: `${data.features.length} in` };
  const out: Column = { drawn: 1, label: "score" };
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
