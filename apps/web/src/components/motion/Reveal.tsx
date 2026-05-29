import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  threshold?: number;
  style?: CSSProperties;
};

export function Reveal({
  children,
  className,
  as: Component = 'div',
  delay = 0,
  threshold = 0.12,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, threshold]);

  return (
    <Component
      ref={ref}
      className={cn('motion-reveal', visible && 'motion-reveal-visible', className)}
      style={{
        ...style,
        ...(delay > 0 ? { ['--motion-reveal-delay' as string]: `${delay}ms` } : undefined),
      }}
    >
      {children}
    </Component>
  );
}
