import { useCallback, useEffect, useRef, useState } from 'react';

const PULSE_MS = 700;

/** Brief success ring pulse for create forms and list cards. */
export function useSuccessPulse() {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerPulse = useCallback(() => {
    clearTimer();
    setActive(true);
    timerRef.current = window.setTimeout(() => {
      setActive(false);
      timerRef.current = null;
    }, PULSE_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    pulseActive: active,
    triggerPulse,
    pulseClass: active ? 'motion-success-pulse' : undefined,
  };
}
