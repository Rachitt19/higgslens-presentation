import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "../lib/useDeck";

/** Counts up to a value read from the artifacts. The final frame is exact. */
export function CountUp({ value, decimals = 4, duration = 1400, delay = 0 }: { value: number; decimals?: number; duration?: number; delay?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setShown(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, delay, reduced]);
  return <span className="num">{shown.toFixed(decimals)}</span>;
}

/** Segmented control. Buttons are real buttons, so they are keyboard reachable. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={o.id === value ? "is-on" : ""} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Step tabs inside a scene: show where the speaker is, and allow a click. */
export function StepTabs({ views, step, onSelect }: { views: string[]; step: number; onSelect: (i: number) => void }) {
  return (
    <div className="step-tabs" role="tablist">
      {views.map((v, i) => (
        <button key={v} type="button" role="tab" aria-selected={i === step} className={i === step ? "is-on" : ""} onClick={() => onSelect(i)}>
          {v}
        </button>
      ))}
    </div>
  );
}

export interface EventObjects {
  lepton: number; // azimuth in degrees
  met: number;
  jets: { phi: number; b: boolean; len: number }[];
}

/**
 * Schematic transverse view of one event: a lepton, missing energy and four
 * jets. It illustrates the final state; the angles are not event data.
 */
export function EventDisplay({
  objects,
  size = 320,
  showLabels = true,
  variant = "neutral",
}: {
  objects: EventObjects;
  size?: number;
  showLabels?: boolean;
  variant?: "signal" | "background" | "neutral";
}) {
  const pt = (deg: number, r: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, -Math.sin(a) * r];
  };
  const wedge = (phi: number, len: number) => {
    const [x1, y1] = pt(phi - 7.5, len);
    const [x2, y2] = pt(phi + 7.5, len);
    return `M0,0 L${x1.toFixed(1)},${y1.toFixed(1)} A${len},${len} 0 0 0 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
  };
  const label = (deg: number, r: number, text: ReactNode, cls = "ev-label") => {
    const [x, y] = pt(deg, r);
    return (
      <text x={x} y={y} className={cls} textAnchor="middle" dominantBaseline="middle">
        {text}
      </text>
    );
  };
  const [lx, ly] = pt(objects.lepton, 96);
  const [mx, my] = pt(objects.met, 78);

  return (
    <svg
      className={`event-display event-display--${variant}`}
      width={size}
      height={size}
      viewBox="-132 -132 264 264"
      role="img"
      aria-label="Schematic event: one lepton, missing energy and four jets, two b-tagged"
    >
      <circle r={116} className="ev-chamber" />
      <line x1={-108} y1={0} x2={108} y2={0} className="ev-axis" />
      <line x1={0} y1={-108} x2={0} y2={108} className="ev-axis" />
      {[36, 70, 104].map((r) => (
        <circle key={r} r={r} className="ev-ring" />
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const [x1, y1] = pt(i * 15, 104);
        const [x2, y2] = pt(i * 15, 110);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="ev-tick" />;
      })}
      {objects.jets.map((j, i) => (
        <g key={i}>
          <path d={wedge(j.phi, j.len)} className={j.b ? "ev-jet ev-jet-b" : "ev-jet"} />
          {showLabels && label(j.phi, j.len + 13, j.b ? "b" : "j", j.b ? "ev-label ev-label-b" : "ev-label")}
        </g>
      ))}
      <line x1={0} y1={0} x2={lx} y2={ly} className="ev-lepton" />
      <circle cx={lx} cy={ly} r={2.4} className="ev-lepton-tip" />
      {showLabels && label(objects.lepton, 112, "ℓ", "ev-label ev-label-lepton")}
      <line x1={0} y1={0} x2={mx} y2={my} className="ev-met" />
      {showLabels && label(objects.met, 94, "miss")}
      <circle r={3.2} className="ev-vertex" />
    </svg>
  );
}

export const SIGNAL_EVENT: EventObjects = {
  lepton: 62,
  met: 118,
  jets: [
    { phi: 196, b: true, len: 88 },
    { phi: 232, b: true, len: 74 },
    { phi: 318, b: false, len: 66 },
    { phi: 8, b: false, len: 52 },
  ],
};
export const BACKGROUND_EVENT: EventObjects = {
  lepton: 34,
  met: 152,
  jets: [
    { phi: 212, b: true, len: 80 },
    { phi: 300, b: true, len: 70 },
    { phi: 262, b: false, len: 58 },
    { phi: 96, b: false, len: 60 },
  ],
};
