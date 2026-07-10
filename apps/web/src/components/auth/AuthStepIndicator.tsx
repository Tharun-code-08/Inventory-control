type AuthStepIndicatorProps = {
  steps: Array<{ id: string; label: string }>;
  current: string;
};

export function AuthStepIndicator({ steps, current }: AuthStepIndicatorProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === current),
  );

  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                completed
                  ? 'bg-slate-900 text-white'
                  : active
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-muted-foreground'
              }`}
            >
              {completed ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-2 h-0.5 w-8 transition ${
                  completed ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default AuthStepIndicator;
