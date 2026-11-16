import { useCallback, useEffect, useRef, useState } from "react";

export interface DeckState {
  scene: number;
  step: number;
  direction: 1 | -1;
}

// Navigation model: a scene may have several internal steps. "Next" walks the
// steps of the current scene, then moves to the next scene. Up/Down and
// PageUp/PageDown always jump a whole scene.
export function useDeck(stepsPerScene: number[]) {
  const last = stepsPerScene.length - 1;
  const fromHash = () => {
    const n = parseInt(window.location.hash.replace("#", ""), 10);
    return Number.isFinite(n) ? Math.min(last, Math.max(0, n - 1)) : 0;
  };
  const [state, setState] = useState<DeckState>(() => ({ scene: fromHash(), step: 0, direction: 1 }));

  const next = useCallback(() => {
    setState((s) => {
      if (s.step < stepsPerScene[s.scene] - 1) return { ...s, step: s.step + 1, direction: 1 };
      if (s.scene < last) return { scene: s.scene + 1, step: 0, direction: 1 };
      return s;
    });
  }, [stepsPerScene, last]);

  const prev = useCallback(() => {
    setState((s) => {
      if (s.step > 0) return { ...s, step: s.step - 1, direction: -1 };
      if (s.scene > 0) return { scene: s.scene - 1, step: stepsPerScene[s.scene - 1] - 1, direction: -1 };
      return s;
    });
  }, [stepsPerScene]);

  const goTo = useCallback(
    (scene: number, step = 0) => {
      setState((s) => {
        const target = Math.min(last, Math.max(0, scene));
        return { scene: target, step: Math.min(step, stepsPerScene[target] - 1), direction: target >= s.scene ? 1 : -1 };
      });
    },
    [stepsPerScene, last],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const onControl = tag === "BUTTON" || tag === "A";
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case " ":
        case "Enter":
          if (onControl) return; // let focused buttons handle their own activation
          e.preventDefault();
          if (e.shiftKey) prev();
          else next();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          prev();
          break;
        case "ArrowDown":
          e.preventDefault();
          setState((s) => (s.scene < last ? { scene: s.scene + 1, step: 0, direction: 1 } : s));
          break;
        case "ArrowUp":
          e.preventDefault();
          setState((s) => (s.scene > 0 ? { scene: s.scene - 1, step: 0, direction: -1 } : s));
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(last);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        default:
          if (/^[0-9]$/.test(e.key)) goTo(e.key === "0" ? 9 : parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, last, toggleFullscreen]);

  // Scroll and swipe as an alternative to the keyboard. One gesture = one move.
  const lock = useRef(0);
  useEffect(() => {
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now < lock.current) return;
      acc += e.deltaY + e.deltaX;
      if (Math.abs(acc) > 60) {
        if (acc > 0) next();
        else prev();
        acc = 0;
        lock.current = now + 750;
      }
    };
    let startX = 0;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) < 50) return;
      if (d < 0) next();
      else prev();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [next, prev]);

  useEffect(() => {
    const hash = `#${state.scene + 1}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [state.scene]);

  return { ...state, next, prev, goTo, toggleFullscreen };
}

export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
