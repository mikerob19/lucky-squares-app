import { Edit3 } from 'lucide-react';
import { Card, Checkbox, Disclosure } from '../ui';
import type { WizardData, NFLGame } from '../../lib/types';
import { formatKickoff } from '../../lib/nfl';
import { prizeTotal } from '../../lib/validation';

interface Step5Props {
  data: WizardData;
  selectedGame: NFLGame | null;
  update: (patch: Partial<WizardData>) => void;
  onEditStep: (step: number) => void;
}

export function Step5Review({ data, selectedGame, update, onEditStep }: Step5Props) {
  const total = prizeTotal(data);
  const squareValue = data.squareValue ? parseFloat(data.squareValue) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-1">Review and Publish</h2>
        <p className="text-ink-400 text-sm">Check everything below, then publish your pool.</p>
      </div>

      <ReviewSection title="Selected Game" onEdit={() => onEditStep(1)}>
        {selectedGame ? (
          <>
            <p className="text-white font-medium">{selectedGame.away_team} @ {selectedGame.home_team}</p>
            <p className="text-ink-400 text-sm mt-1">
              {formatKickoff(selectedGame.kickoff_utc).date} at {formatKickoff(selectedGame.kickoff_utc).time} {formatKickoff(selectedGame.kickoff_utc).timezone}
            </p>
            <p className="text-ink-500 text-xs mt-1">Week {selectedGame.week}</p>
          </>
        ) : <p className="text-danger-400 text-sm">No game selected</p>}
      </ReviewSection>

      <ReviewSection title="Pool Details" onEdit={() => onEditStep(2)}>
        <p className="text-white font-medium">{data.poolName || 'Untitled pool'}</p>
        {data.hostMessage && <p className="text-ink-400 text-sm mt-1">{data.hostMessage}</p>}
        {squareValue > 0 && <p className="text-ink-400 text-sm mt-1">Square value: ${squareValue.toFixed(2)} (informational only)</p>}
      </ReviewSection>

      <ReviewSection title="Board Rules" onEdit={() => onEditStep(3)}>
        <ul className="text-ink-400 text-sm space-y-1">
          <li>Selection: {data.selectionMode === 'pick' ? 'Pick Your Own' : data.selectionMode === 'random' ? 'Random Assignment' : 'Host Assignment'}</li>
          <li>Max {data.maxSquaresPerUser} squares per participant</li>
          <li>Lock: {data.lockMode === 'full' ? 'When board is full' : data.lockMode === 'scheduled' ? 'At scheduled time' : 'Full or scheduled'}</li>
          {data.lockAt && <li>Lock time: {new Date(data.lockAt).toLocaleString()}</li>}
          <li>Unclaimed: {data.unclaimedBehavior === 'open' ? 'Left open' : data.unclaimedBehavior === 'host_assigns' ? 'Host assigns' : 'Board voided'}</li>
        </ul>
      </ReviewSection>

      <ReviewSection title="Prize Structure" onEdit={() => onEditStep(4)}>
        <div className="space-y-1.5 text-sm">
          <PrizeRow label="First Quarter" pct={data.payoutFirst} value={squareValue} />
          <PrizeRow label="Halftime" pct={data.payoutSecond} value={squareValue} />
          <PrizeRow label="Third Quarter" pct={data.payoutThird} value={squareValue} />
          <PrizeRow label="Final Score" pct={data.payoutFourth} value={squareValue} />
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
            <span className="text-white font-semibold">Total</span>
            <span className={total === 100 ? 'text-accent-400 font-bold' : 'text-danger-400 font-bold'}>{total}%</span>
          </div>
        </div>
      </ReviewSection>

      <div>
        <h3 className="font-display font-bold text-sm text-white mb-3">Important Disclosures</h3>
        <Disclosure>
          Lucky Squares does not collect or distribute money. Any square value is informational and arrangements are handled outside the platform.
        </Disclosure>
      </div>

      <div className="space-y-3 pt-2">
        <Checkbox
          checked={data.confirmRules}
          onChange={(v) => update({ confirmRules: v })}
          label="I reviewed the pool rules and understand they will be shown to participants."
        />
        <Checkbox
          checked={data.confirmNoMoney}
          onChange={(v) => update({ confirmNoMoney: v })}
          label="I understand Lucky Squares does not collect or distribute money for this pool."
        />
      </div>
    </div>
  );
}

function ReviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-sm text-white">{title}</h3>
        <button onClick={onEdit} className="text-gold-500 text-xs font-semibold flex items-center gap-1 hover:underline">
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      {children}
    </Card>
  );
}

function PrizeRow({ label, pct, value }: { label: string; pct: number; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <div className="flex items-center gap-3">
        {value > 0 && <span className="text-ink-500 text-xs">${(value * 100 * pct / 100).toFixed(2)}</span>}
        <span className="text-white font-medium">{pct}%</span>
      </div>
    </div>
  );
}
