import type { ModelId } from "../lib/data";
import { MODEL, cfg, data } from "../lib/data";

const W = 760;
const H = 440;

interface Column {
  drawn: number; // nodes drawn (a wide layer is abbreviated)
  label: string;
  sub?: string;
}

/** Fully connected layers, abbreviated to a readable number of nodes. */
function LayerNet({ columns, color }: { columns: Column[]; color: string }) {
  const x = (i: number) => 70 + (i * (W - 140)) / (columns.length - 1);
  const top = 46;
  const usable = H - 130;
  const ys = (n: number) => Array.from({ length: n }, (_, k) => top + usable / 2 + (k - (n - 1) / 2) * Math.min(30, usable / Math.max(1, n - 1)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="net" role="img">
      {columns.slice(0, -1).map((c, i) =>
        ys(c.drawn).flatMap((y1, a) =>
          ys(columns[i + 1].drawn).map((y2, b) => <line key={`${i}-${a}-${b}`} x1={x(i)} y1={y1} x2={x(i + 1)} y2={y2} stroke={color} className="net-edge" style={{ animationDelay: `${i * 0.28}s` }} />),
        ),
      )}
      {columns.map((c, i) => (
        <g key={i} className="net-col" style={{ animationDelay: `${i * 0.28}s` }}>
          {ys(c.drawn).map((y, k) => (
            <circle key={k} cx={x(i)} cy={y} r={c.drawn === 1 ? 9 : 5.5} fill={i === 0 ? "none" : color} stroke={i === 0 ? "var(--ink-2)" : color} strokeWidth={1.5} />
          ))}
          <text x={x(i)} y={H - 44} textAnchor="middle" className="net-label">{c.label}</text>
          {c.sub && <text x={x(i)} y={H - 22} textAnchor="middle" className="net-sub">{c.sub}</text>}
        </g>
      ))}
    </svg>
  );
}

function Trees({ color }: { color: string }) {
  const tree = (cx: number, key: number, lean: number) => {
    const levels = [[0], [-32, 32], [-50, -17, 17, 50]];
    const y = (l: number) => 70 + l * 100;
    return (
      <g key={key} className="net-col" style={{ animationDelay: `${key * 0.22}s` }}>
        {levels.slice(0, -1).flatMap((lv, l) =>
          lv.flatMap((dx, k) => [0, 1].map((c) => <line key={`${l}-${k}-${c}`} x1={cx + dx} y1={y(l)} x2={cx + levels[l + 1][k * 2 + c]} y2={y(l + 1)} stroke={color} strokeOpacity={0.5} strokeWidth={1.2} />)),
        )}
        {levels.flatMap((lv, l) => lv.map((dx, k) => <circle key={`${l}-${k}`} cx={cx + dx} cy={y(l)} r={l === 2 ? 5 : 6} fill={l === 2 && (k + lean) % 3 === 0 ? color : "var(--bg)"} stroke={color} strokeWidth={1.5} />))}
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
        <circle cx={690} cy={172} r={9} fill={color} />
        <text x={690} y={H - 44} textAnchor="middle" className="net-label">score</text>
      </g>
      <text x={297} y={H - 44} textAnchor="middle" className="net-label">
        up to {cfg<number>("xgboost", "n_estimators").toLocaleString("en-US")} trees, depth {cfg<number>("xgboost", "max_depth")}
      </text>
      <text x={297} y={H - 22} textAnchor="middle" className="net-sub">each tree corrects the sum of the ones before it</text>
    </svg>
  );
}

function Residual({ color }: { color: string }) {
  const blocks = cfg<number[]>("resnet_mlp", "hidden_sizes");
  const width = blocks[0];
  const bx = (i: number) => 178 + i * 118;
  const mid = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="net" role="img">
      <line x1={50} y1={mid} x2={710} y2={mid} stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <g className="net-col">
        {[-60, -36, -12, 12, 36, 60].map((dy) => <circle key={dy} cx={50} cy={mid + dy} r={5} fill="none" stroke="var(--ink-2)" strokeWidth={1.5} />)}
        <rect x={98} y={mid - 64} width={16} height={128} rx={3} fill={color} />
        <text x={50} y={H - 44} textAnchor="middle" className="net-label">28 in</text>
        <text x={106} y={mid - 78} textAnchor="middle" className="net-sub">Linear {width}</text>
      </g>
      {blocks.map((_, i) => (
        <g key={i} className="net-col" style={{ animationDelay: `${0.3 + i * 0.3}s` }}>
          <path d={`M${bx(i) - 22},${mid} C${bx(i) - 22},${mid - 150} ${bx(i) + 78},${mid - 150} ${bx(i) + 78},${mid - 12}`} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 5" />
          <rect x={bx(i)} y={mid - 86} width={56} height={172} rx={6} fill="var(--bg)" stroke={color} strokeOpacity={0.6} />
          <rect x={bx(i) + 12} y={mid - 70} width={12} height={140} rx={2} fill={color} />
          <rect x={bx(i) + 32} y={mid - 35} width={12} height={70} rx={2} fill={color} fillOpacity={0.7} />
          <circle cx={bx(i) + 78} cy={mid} r={11} fill="var(--bg)" stroke={color} strokeWidth={1.5} />
          <text x={bx(i) + 78} y={mid + 5.5} textAnchor="middle" className="net-plus">+</text>
          <text x={bx(i) + 28} y={mid + 108} textAnchor="middle" className="net-sub">block {i + 1}</text>
        </g>
      ))}
      <g className="net-col" style={{ animationDelay: "1.6s" }}>
        <circle cx={710} cy={mid} r={9} fill={color} />
        <text x={710} y={H - 44} textAnchor="middle" className="net-label">score</text>
      </g>
      <text x={380} y={H - 44} textAnchor="middle" className="net-label">inside a block: Linear {width * 2}, then Linear {width}</text>
      <text x={380} y={H - 22} textAnchor="middle" className="net-sub">dashed line: the skip connection that adds the block's input to its output</text>
    </svg>
  );
}

export function ModelDiagram({ model }: { model: ModelId }) {
  const color = MODEL[model].color;
  const inputs: Column = { drawn: 10, label: `${data.features.length} in` };
  const out: Column = { drawn: 1, label: "score" };
  if (model === "xgboost") return <Trees color={color} />;
  if (model === "resnet_mlp") return <Residual color={color} />;
  if (model === "logreg") return <LayerNet color={color} columns={[inputs, { drawn: 1, label: "score", sub: "sigmoid of one weighted sum" }]} />;
  const hidden = cfg<number[]>(model, "hidden_sizes");
  const drawn = (w: number) => (w >= 300 ? 12 : w >= 64 ? 9 : 6);
  return <LayerNet color={color} columns={[inputs, ...hidden.map((w) => ({ drawn: drawn(w), label: String(w) })), out]} />;
}
