import type { SceneProps } from "../App";
import { PROBLEM } from "../content";
import { BACKGROUND_EVENT, EventDisplay, SIGNAL_EVENT } from "../components/common";

export default function S02Problem(_: SceneProps) {
  return (
    <div className="s02">
      <div className="s02-text">
        <h2 className="headline">{PROBLEM.headline}</h2>
        <p className="lede">{PROBLEM.finalState}</p>
        <p className="body">{PROBLEM.why}</p>
        <blockquote className="s02-question">
          <span className="tag">Research question</span>
          {PROBLEM.question}
        </blockquote>
      </div>
      <div className="s02-events">
        <figure>
          <EventDisplay objects={SIGNAL_EVENT} size={300} />
          <figcaption>
            <strong>{PROBLEM.signal.name}</strong>
            {PROBLEM.signal.body}
          </figcaption>
        </figure>
        <figure>
          <EventDisplay objects={BACKGROUND_EVENT} size={300} />
          <figcaption>
            <strong>{PROBLEM.background.name}</strong>
            {PROBLEM.background.body}
          </figcaption>
        </figure>
        <p className="note s02-note">Schematic transverse views of the shared final state. Both classes in the dataset are simulated.</p>
      </div>
    </div>
  );
}
