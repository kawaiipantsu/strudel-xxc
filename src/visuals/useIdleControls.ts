import { useCallback, useEffect, useRef, useState } from "react";

/** Pointer idleness hides decoration; controls stay in the keyboard tab order. */
export function useIdleControls(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setHidden(enabled);
  }, [enabled]);
  const reveal = useCallback(() => {
    clearTimeout(timer.current);
    setHidden(false);
    if (enabled) timer.current = window.setTimeout(() => setHidden(true), 2500);
  }, [enabled]);
  useEffect(() => {
    reveal();
    return () => clearTimeout(timer.current);
  }, [reveal]);
  return {
    hidden: enabled && hidden,
    hide,
    handlers: {
      onPointerMove: reveal,
      onPointerDown: reveal,
      onPointerLeave: hide,
      onFocusCapture: reveal,
      onKeyDownCapture: reveal,
    },
  };
}
