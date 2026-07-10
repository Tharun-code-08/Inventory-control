import { useRef } from 'react';

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  hasError?: boolean;
  autoFocus?: boolean;
};

export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  hasError = false,
  autoFocus = false,
}: OtpCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const values = value
    .split('')
    .concat(Array(length).fill(''))
    .slice(0, length);

  const updateAt = (index: number, nextValue: string) => {
    const next = [...values];
    next[index] = nextValue;
    onChange(next.join('').slice(0, length));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {values.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/\D/g, '').slice(-1);
            updateAt(index, nextValue);
            if (nextValue && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !values[index] && index > 0) {
              updateAt(index - 1, '');
              refs.current[index - 1]?.focus();
            }
            if (event.key === 'ArrowLeft' && index > 0) {
              refs.current[index - 1]?.focus();
            }
            if (event.key === 'ArrowRight' && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData
              .getData('text')
              .replace(/\D/g, '')
              .slice(0, length);
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          inputMode="numeric"
          className={`h-14 w-11 rounded-xl border-2 bg-card text-center text-xl font-bold text-foreground outline-none transition sm:w-12 ${
            hasError
              ? 'border-red-500'
              : digit
                ? 'border-slate-800 bg-muted'
                : 'border-border focus:border-primary'
          }`}
        />
      ))}
    </div>
  );
}

export default OtpCodeInput;
