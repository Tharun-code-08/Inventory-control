import { useAnimatedCounter } from '@/hooks/use-animated-counter';

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  decimals?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  format,
  duration = 600,
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const animated = useAnimatedCounter(value, { duration, decimals });
  const text = format ? format(animated) : animated.toLocaleString(undefined, { maximumFractionDigits: decimals });

  return (
    <span className={className} aria-live="polite">
      {text}
    </span>
  );
}
