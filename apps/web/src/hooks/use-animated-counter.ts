import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

type UseAnimatedCounterOptions = {
  duration?: number;
  decimals?: number;
};

export function useAnimatedCounter(
  target: number,
  { duration = 600, decimals = 0 }: UseAnimatedCounterOptions = {},
): number {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? target : 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(target);
      return;
    }

    fromRef.current = display;
    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(Number(next.toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from latest display toward new target
  }, [target, duration, decimals, reducedMotion]);

  return display;
}
