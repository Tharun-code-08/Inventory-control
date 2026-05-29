import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useIsMobileMotion } from '@/hooks/use-is-mobile-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

type MarketingParallaxProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

/** Subtle scroll-linked translate — desktop only, disabled for reduced motion / mobile. */
export function MarketingParallax({ children, className, strength = 20 }: MarketingParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobileMotion();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (mobile || reduced) return;

    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (window.innerHeight / 2 - center) * 0.045;
        const clamped = Math.max(-strength, Math.min(strength, offset));
        el.style.transform = `translate3d(0, ${clamped}px, 0)`;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [mobile, reduced, strength]);

  return (
    <div ref={ref} className={cn('motion-marketing-parallax will-change-transform', className)}>
      {children}
    </div>
  );
}
