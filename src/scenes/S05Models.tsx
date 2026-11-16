import type { SceneProps } from "../App";
import { MODELS } from "../content";
import { ModelDiagram } from "../components/diagrams";
import { MODEL, MODEL_ORDER, type ModelId } from "../lib/data";

const CATEGORY: Record<ModelId, string> = {
  logreg: "Linear baseline",
  xgboost: "Gradient-boosted trees",
  mlp: "Shallow neural network",
  deep_mlp: "Deep neural network",
  resnet_mlp: "Residual neural network",
};

export default function S05Models({ step, setStep }: SceneProps) {
  const id = MODEL_ORDER[step];
  const m = MODELS[id];
  return (
    <div className="s05">
      <div className="s05-list">
        <span className="tag">Model architectures</span>
        <h2 className="headline">Five models, from a line to a residual network.</h2>
        <ol>
          {MODEL_ORDER.map((mid, i) => (
            <li key={mid}>
              <button type="button" className={i === step ? "is-on" : ""} aria-current={i === step} onClick={() => setStep(i)}>
                <i style={{ background: MODEL[mid].color }} />
                {MODEL[mid].label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="s05-detail" key={id}>
        <span className="s05-cat" style={{ color: MODEL[id].color }}>{CATEGORY[id]}</span>
        <p className="s05-role">{m.role}</p>
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
    </div>
  );
}
