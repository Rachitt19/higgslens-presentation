import { useState } from "react";
import type { SceneProps } from "../App";
import { MODELS } from "../content";
import { CompareDeepResidual, LearningVisualizer, ModelDiagram } from "../components/diagrams";
import { Segmented } from "../components/common";
import { MODEL, MODEL_ORDER, type ModelId } from "../lib/data";

const CATEGORY: Record<ModelId, string> = {
  logreg: "Linear baseline",
  xgboost: "Gradient-boosted trees",
  mlp: "Shallow neural network",
  deep_mlp: "Deep neural network",
  resnet_mlp: "Residual neural network",
};

type ViewMode = "single" | "compare" | "learn";

export default function S05Models({ step, setStep, paused, skipped }: SceneProps) {
  const [mode, setMode] = useState<ViewMode>("single");
  const id = MODEL_ORDER[step];
  const m = MODELS[id];

  return (
    <div className="s05">
      <div className="s05-list">
        <span className="tag">Model architectures &amp; training</span>
        <h2 className="headline">Five models, from a line to a residual network.</h2>
        <ol>
          {MODEL_ORDER.map((mid, i) => (
            <li key={mid}>
              <button
                type="button"
                className={mode === "single" && i === step ? "is-on" : ""}
                aria-current={mode === "single" && i === step}
                onClick={() => {
                  setMode("single");
                  setStep(i);
                }}
              >
                <i style={{ background: MODEL[mid].color }} />
                {MODEL[mid].label}
              </button>
            </li>
          ))}
        </ol>
        <div className="s05-compare-cta">
          <button
            type="button"
            className={`s05-compare-btn ${mode === "compare" ? "is-on" : ""}`}
            aria-pressed={mode === "compare"}
            onClick={() => setMode((v) => (v === "compare" ? "single" : "compare"))}
          >
            <span className="num">vs</span>
            <span>Compare Deep MLP &amp; Residual MLP</span>
          </button>
          <button
            type="button"
            className={`s05-compare-btn s05-learn-btn ${mode === "learn" ? "is-on" : ""}`}
            aria-pressed={mode === "learn"}
            onClick={() => setMode((v) => (v === "learn" ? "single" : "learn"))}
          >
            <span className="num">∇L</span>
            <span>How Our Network Learns</span>
          </button>
        </div>
      </div>

      {mode === "compare" && (
        <div className="s05-detail" key="compare">
          <div className="s05-detail-head">
            <div>
              <span className="s05-cat" style={{ color: MODEL.resnet_mlp.color }}>
                Architecture comparison
              </span>
              <p className="s05-role">Sequential depth vs. residual refinement</p>
            </div>
            <Segmented
              label="Diagram view"
              value={mode}
              onChange={setMode}
              options={[
                { id: "single", label: "Selected" },
                { id: "compare", label: "Deep vs Residual" },
                { id: "learn", label: "How It Learns" },
              ]}
            />
          </div>
          <div className="s05-diagram">
            <CompareDeepResidual />
          </div>
          <div className="s05-notes s05-notes-compare">
            <div className="s05-cmp-note">
              <strong style={{ color: MODEL.deep_mlp.color }}>Ordinary Deep MLP (5 × 300)</strong>
              <p className="body">
                Passes activations strictly layer by layer (y = F(x)). Each block of 300 units must preserve and transform the signal without an identity bypass.
              </p>
            </div>
            <div className="s05-cmp-note">
              <strong style={{ color: MODEL.resnet_mlp.color }}>Residual addition (y = x + F(x))</strong>
              <p className="body">
                Each 256-wide block carries its unaltered input x along the magenta skip path and adds a learned 512 → 256 refinement F(x) at the + node.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === "learn" && (
        <div className="s05-detail" key="learn">
          <div className="s05-detail-head">
            <div>
              <span className="s05-cat" style={{ color: "#F0B95A" }}>
                Forward pass · Loss · Backprop · AdamW
              </span>
              <p className="s05-role">How our neural networks learn</p>
            </div>
            <Segmented
              label="Diagram view"
              value={mode}
              onChange={setMode}
              options={[
                { id: "single", label: "Selected" },
                { id: "compare", label: "Deep vs Residual" },
                { id: "learn", label: "How It Learns" },
              ]}
            />
          </div>
          <div className="s05-diagram s05-diagram--learn">
            <LearningVisualizer paused={paused} skipped={skipped} />
          </div>
        </div>
      )}

      {mode === "single" && (
        <div className="s05-detail" key={id}>
          <div className="s05-detail-head">
            <div>
              <span className="s05-cat" style={{ color: MODEL[id].color }}>
                {CATEGORY[id]}
              </span>
              <p className="s05-role">{m.role}</p>
            </div>
            <Segmented
              label="Diagram view"
              value={mode}
              onChange={setMode}
              options={[
                { id: "single", label: "Selected" },
                { id: "compare", label: "Deep vs Residual" },
                { id: "learn", label: "How It Learns" },
              ]}
            />
          </div>
          <div className="s05-diagram">
            <ModelDiagram model={id} />
          </div>
          <div className="s05-notes">
            <p className="body">{m.why}</p>
            <ul>
              {m.specs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
