function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-emerald-600'];
const textColors = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-blue-500', 'text-green-600', 'text-emerald-600'];

export function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordStrength(password);
  const width = password ? `${(score / 6) * 100}%` : '0%';

  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${colors[score]}`} style={{ width }} />
      </div>
      {password ? (
        <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${textColors[score]}`}>
          {labels[score]}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordStrengthBar;
