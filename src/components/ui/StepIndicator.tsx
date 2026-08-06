import { Check } from 'lucide-react';

export function StepIndicator({ current, total = 5 }: { current: number; total?: number }) {
  const steps = ['Game', 'Details', 'Rules', 'Prizes', 'Review'];
  return (
    <div className="flex items-center justify-between gap-1">
      {steps.slice(0, total).map((label, i) => {
        const stepNum = i + 1;
        const isCurrent = stepNum === current;
        const isCompleted = stepNum < current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isCurrent ? 'bg-gold-500 text-navy-950' :
                isCompleted ? 'bg-accent-500/20 text-accent-400' :
                'bg-navy-800 text-ink-600'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-2xs font-semibold ${isCurrent ? 'text-gold-500' : isCompleted ? 'text-accent-400' : 'text-ink-600'}`}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${isCompleted ? 'bg-accent-500/40' : 'bg-navy-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
