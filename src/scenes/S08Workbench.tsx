import type { SceneProps } from "../App";
import { WORKBENCH } from "../content";

export default function S08Workbench({ step, setStep }: SceneProps) {
  const view = WORKBENCH.views[step];
  return (
    <div className="s08">
      <div className="s08-text">
        <span className="tag">Run inspection</span>
        <h2 className="headline">{WORKBENCH.headline}</h2>
        <p className="body">{WORKBENCH.body}</p>
        <ol>
          {WORKBENCH.views.map((v, i) => (
            <li key={v.name}>
              <button type="button" className={i === step ? "is-on" : ""} aria-current={i === step} onClick={() => setStep(i)}>
                <strong>{v.name}</strong>
                <span>{v.body}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="note num">streamlit run streamlit_app.py</p>
      </div>
      <figure className="s08-shot">
        <div className="s08-bar"><i /><i /><i /><span className="num">HiggsLens dashboard, {view.name.toLowerCase()}</span></div>
        <div className="s08-frame">
          {WORKBENCH.views.map((v, i) => (
            <img key={v.file} src={`./dashboard/${v.file}`} alt={`Screenshot of the HiggsLens Streamlit dashboard: ${v.name}`} className={i === step ? "is-on" : ""} />
          ))}
        </div>
      </figure>
    </div>
  );
}
