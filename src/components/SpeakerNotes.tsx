import { useEffect } from "react";
import { getNoteMeta } from "../lib/notes";

interface Props {
  open: boolean;
  scene: number;
  totalScenes: number;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Optional presenter speaker-notes drawer toggled with the N key.
 * Hidden during normal presentation mode.
 */
export default function SpeakerNotes({ open, scene, totalScenes, onClose }: Props) {
  const { title, note } = getNoteMeta(scene);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !note) return null;

  return (
    <aside
      className="notes-drawer"
      role="dialog"
      aria-label={`Speaker notes for scene ${scene + 1}: ${title}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <header className="notes-head">
        <div>
          <span className="notes-kicker num">
            SPEAKER NOTES · {pad(scene + 1)} / {pad(totalScenes)} · {note.duration}
          </span>
          <h2 className="notes-title">{title}</h2>
        </div>
        <button type="button" className="notes-close" onClick={onClose} aria-label="Close speaker notes (N or Esc)" title="Close (N)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="notes-body">
        <section className="notes-block">
          <h3>Speaking script</h3>
          <p className="notes-script">{note.script}</p>
        </section>

        <section className="notes-block">
          <h3>Key points</h3>
          <ul className="notes-points">
            {note.keyPoints.map((pt, i) => (
              <li key={i}>
                <span className="num">0{i + 1}</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="notes-block notes-viva">
          <h3>Likely viva question</h3>
          <p className="notes-q">{note.viva.question}</p>
          <p className="notes-a">{note.viva.answer}</p>
        </section>

        <section className="notes-block notes-next">
          <h3>Transition</h3>
          <p>{note.transition}</p>
        </section>
      </div>

      <footer className="notes-foot num">
        <span>N toggle · Esc close · ←/→ navigate slides</span>
      </footer>
    </aside>
  );
}
