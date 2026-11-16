import type { SceneProps } from "../App";
import { PIPELINE } from "../content";
import { data, int } from "../lib/data";

// Node centres on the 1600 × 900 stage: five along the top run, four returning.
const XS_TOP = [170, 485, 800, 1115, 1430];
const XS_BOTTOM = [1272, 957, 642, 327];
const Y_TOP = 330;
const Y_BOTTOM = 590;
const NODES = [...XS_TOP.map((x) => ({ x, y: Y_TOP })), ...XS_BOTTOM.map((x) => ({ x, y: Y_BOTTOM }))];
const R = (Y_BOTTOM - Y_TOP) / 2;
const PATH = `M${XS_TOP[0]},${Y_TOP} H${XS_TOP[4]} A${R},${R} 0 0 1 ${XS_TOP[4]},${Y_BOTTOM} H${XS_BOTTOM[3]}`;

export default function S04Pipeline(_: SceneProps) {
  const budgets = Object.values(data.budgets).map((b) => int(b.rows));
  return (
    <div className="s04">
      <header className="s04-head">
        <div>
          <span className="tag">Experimental protocol</span>
          <h2 className="headline">One protocol, from the archive to the artifact.</h2>
        </div>
        <p className="body">
          The same nine steps run for every model, at nested budgets of {budgets[0]}, {budgets[1]} and {budgets[2]} events.
        </p>
      </header>
      <svg className="s04-line" viewBox="0 0 1600 900" aria-hidden="true">
        <defs>
          <linearGradient id="pipeline-beam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="55%" stopColor="#D946EF" />
            <stop offset="100%" stopColor="#F0B95A" />
          </linearGradient>
          <filter id="pipeline-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={PATH} className="s04-rail" />
        <path d={PATH} className="s04-beam" stroke="url(#pipeline-beam)" filter="url(#pipeline-glow)" pathLength={1} />
        <circle r="4.5" className="s04-pulse">
          <animateMotion dur="9s" repeatCount="indefinite" path={PATH} />
        </circle>
      </svg>
      <ol className="s04-nodes">
        {PIPELINE.map((stage, i) => (
          <li key={stage.title} style={{ left: NODES[i].x, top: NODES[i].y, animationDelay: `${0.3 + i * 0.32}s` }}>
            <span className="s04-dot num">{i + 1}</span>
            <h3>{stage.title}</h3>
            <p>{stage.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
