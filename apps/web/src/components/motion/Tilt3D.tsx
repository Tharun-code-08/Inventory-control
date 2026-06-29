import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useIsMobileMotion } from '@/hooks/use-is-mobile-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

type Tilt3DProps = {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees on each axis. */
  max?: number;
  /** Idle resting rotation so the object reads as 3-D before interaction. */
  restX?: number;
  restY?: number;
  /** Pixels the surface lifts toward the viewer on hover. */
  lift?: number;
};

/**
 * Pointer-driven 3-D tilt. The pointer position maps to rotateX / rotateY around
 * the element's centre, with a subtle resting pose so the surface reads as
 * three-dimensional even at rest. Disabled (flat) for touch devices and when the
 * user prefers reduced motion. Uses only transforms for GPU-friendly motion.
 */
export function Tilt3D({
  children,
  className,
  max = 12,
  restX = 6,
  restY = -9,
  lift = 24,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobileMotion();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (mobile || reduced) {
      el.style.transform = 'none';
      return;
    }

    const rest = `perspective(1400px) rotateX(${restX}deg) rotateY(${restY}deg)`;
    el.style.transform = rest;

    let frame = 0;
    const apply = (rx: number, ry: number, tz: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;
      });
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      apply(restX - py * max * 2, restY + px * max * 2, lift);
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = rest;
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, [mobile, reduced, max, restX, restY, lift]);

  return (
    <div className={cn('mk-tilt-3d', className)} ref={ref}>
      {children}
    </div>
  );
}
