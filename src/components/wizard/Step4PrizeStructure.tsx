import { Card, Disclosure, Pill } from '../ui';
import { PRIZE_PRESETS } from '../../lib/types';
import type { WizardData } from '../../lib/types';
import { prizeTotal } from '../../lib/validation';

interface Step4Props {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function Step4PrizeStructure({ data, update }: Step4Props) {
  const total = prizeTotal(data);
  const isValid = total === 100;
  const squareValue = data.squareValue ? parseFloat(data.squareValue) : 0;

  const quarters = [
    { key: 'payoutFirst' as const, label: 'First Quarter' },
    { key: 'payoutSecond' as const, label: 'Halftime' },
    { key: 'payoutThird' as const, label: 'Third Quarter' },
    { key: 'payoutFourth' as const, label: 'Final Score' },
  ];

  const applyPreset = (values: number[]) => {
    update({
      payoutFirst: values[0],
      payoutSecond: values[1],
      payoutThird: values[2],
      payoutFourth: values[3],
    });
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-1">Prize Structure</h2>
        <p className="text-ink-400 text-sm">Set the percentage of the total prize pool for each quarter.</p>
      </div>

      <div>
        <label className="block text-ink-200 text-sm font-medium mb-2">Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {PRIZE_PRESETS.map(preset => {
            const isActive = preset.values[0] === data.payoutFirst
              && preset.values[1] === data.payoutSecond
              && preset.values[2] === data.payoutThird
              && preset.values[3] === data.payoutFourth;
            return (
              <Pill key={preset.label} active={isActive} onClick={() => applyPreset(preset.values)}>
                {preset.label}
              </Pill>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {quarters.map(q => (
          <Card key={q.key} padding="md">
            <div className="flex items-center justify-between gap-4">
              <label className="text-white text-sm font-medium flex-1">{q.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={data[q.key]}
                  onChange={(e) => update({ [q.key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  min={0}
                  max={100}
                  className="w-20 text-center bg-navy-800 border border-white/10 rounded-xl px-3 h-11 text-white focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20"
                  aria-label={`${q.label} percentage`}
                />
                <span className="text-ink-500 text-sm">%</span>
              </div>
            </div>
            {squareValue > 0 && (
              <p className="text-ink-500 text-xs mt-2">
                Est. payout: <span className="text-gold-500 font-semibold">${(squareValue * 100 * data[q.key] / 100).toFixed(2)}</span>
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card padding="md" className={`flex items-center justify-between ${isValid ? 'border-accent-500/30' : total > 100 ? 'border-danger-500/30' : 'border-gold-500/20'}`}>
        <span className="text-white text-sm font-semibold">Total</span>
        <div className="flex items-center gap-2">
          <span className={`font-display font-bold text-xl ${isValid ? 'text-accent-400' : total > 100 ? 'text-danger-400' : 'text-gold-500'}`}>
            {total}%
          </span>
          {isValid ? (
            <span className="text-accent-400 text-xs font-semibold">Valid</span>
          ) : total > 100 ? (
            <span className="text-danger-400 text-xs font-semibold">Over by {total - 100}%</span>
          ) : (
            <span className="text-gold-500 text-xs font-semibold">{100 - total}% remaining</span>
          )}
        </div>
      </Card>

      {squareValue > 0 && (
        <Disclosure>
          <p className="mb-2"><strong>Estimated Payout Preview</strong></p>
          <p>Based on 100 filled squares at ${squareValue.toFixed(2)} each, total pool: ${(squareValue * 100).toFixed(2)}</p>
          <ul className="mt-2 space-y-0.5">
            <li>First Quarter (${(squareValue * 100 * data.payoutFirst / 100).toFixed(2)} — {data.payoutFirst}%)</li>
            <li>Halftime (${(squareValue * 100 * data.payoutSecond / 100).toFixed(2)} — {data.payoutSecond}%)</li>
            <li>Third Quarter (${(squareValue * 100 * data.payoutThird / 100).toFixed(2)} — {data.payoutThird}%)</li>
            <li>Final Score (${(squareValue * 100 * data.payoutFourth / 100).toFixed(2)} — {data.payoutFourth}%)</li>
          </ul>
          <p className="mt-2 text-ink-500">This is an estimate only. Lucky Squares does not collect or guarantee payment.</p>
        </Disclosure>
      )}
    </div>
  );
}
