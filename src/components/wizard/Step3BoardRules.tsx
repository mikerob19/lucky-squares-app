import { Input, RadioOption, Card } from '../ui';
import type { WizardData, NFLGame, SelectionMode, LockMode, UnclaimedBehavior } from '../../lib/types';
import { formatKickoff } from '../../lib/nfl';

interface Step3Props {
  data: WizardData;
  selectedGame: NFLGame | null;
  update: (patch: Partial<WizardData>) => void;
}

export function Step3BoardRules({ data, selectedGame, update }: Step3Props) {
  const showLockTime = data.lockMode === 'scheduled' || data.lockMode === 'either';

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-1">Board Rules</h2>
        <p className="text-ink-400 text-sm">The board is a fixed 10×10 grid (100 squares). Configure how squares are claimed.</p>
      </div>

      <Card padding="md" className="flex items-center justify-around text-center">
        <div>
          <p className="font-display font-bold text-2xl text-gold-500">10×10</p>
          <p className="text-ink-500 text-xs">Grid size</p>
        </div>
        <div className="w-px h-10 bg-white/5" />
        <div>
          <p className="font-display font-bold text-2xl text-gold-500">100</p>
          <p className="text-ink-500 text-xs">Total squares</p>
        </div>
      </Card>

      <div>
        <label className="block text-ink-200 text-sm font-medium mb-2">Square Selection Method</label>
        <div className="space-y-2">
          {([
            { value: 'pick', label: 'Pick Your Own', desc: 'Participants select available cells themselves' },
            { value: 'random', label: 'Random Assignment', desc: 'Participants choose a quantity; the server assigns random squares' },
            { value: 'host', label: 'Host Assignment', desc: 'Only you assign squares. Participants view but cannot claim' },
          ] as { value: SelectionMode; label: string; desc: string }[]).map(opt => (
            <RadioOption
              key={opt.value}
              selected={data.selectionMode === opt.value}
              onSelect={() => update({ selectionMode: opt.value })}
              label={opt.label}
              description={opt.desc}
            />
          ))}
        </div>
      </div>

      <Input
        label="Maximum Squares Per Participant"
        type="number"
        value={String(data.maxSquaresPerUser)}
        onChange={(v) => update({ maxSquaresPerUser: parseInt(v) || 1 })}
        min={1}
        max={100}
      />
      <p className="text-ink-500 text-xs -mt-3">Applies to all assignment methods. Cannot be bypassed through host controls.</p>

      <div>
        <label className="block text-ink-200 text-sm font-medium mb-2">Lock Behavior</label>
        <div className="space-y-2">
          {([
            { value: 'full', label: 'Lock when board is full' },
            { value: 'scheduled', label: 'Lock at a scheduled time' },
            { value: 'either', label: 'Whichever comes first (full or scheduled)' },
          ] as { value: LockMode; label: string }[]).map(opt => (
            <RadioOption
              key={opt.value}
              selected={data.lockMode === opt.value}
              onSelect={() => update({ lockMode: opt.value })}
              label={opt.label}
            />
          ))}
        </div>
      </div>

      {showLockTime && (
        <div className="animate-slide-up">
          <label className="block text-ink-200 text-sm font-medium mb-1.5">Scheduled Lock Time</label>
          <input
            type="datetime-local"
            value={data.lockAt}
            onChange={(e) => update({ lockAt: e.target.value })}
            className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 h-11 text-white transition-all focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20"
            aria-label="Scheduled lock date and time"
          />
          {selectedGame && (
            <p className="text-ink-500 text-xs mt-1">
              Must be before kickoff: {formatKickoff(selectedGame.kickoff_utc).date} at {formatKickoff(selectedGame.kickoff_utc).time} {formatKickoff(selectedGame.kickoff_utc).timezone}
            </p>
          )}
          <p className="text-ink-600 text-xs mt-1">Uses trusted server time in final implementation.</p>
        </div>
      )}

      <div>
        <label className="block text-ink-200 text-sm font-medium mb-2">Unclaimed Squares at Lock</label>
        <div className="space-y-2">
          {([
            { value: 'open', label: 'Leave open', desc: 'Unclaimed squares remain empty and cannot win' },
            { value: 'host_assigns', label: 'Host assigns', desc: 'You can assign remaining squares after lock' },
            { value: 'void', label: 'Void the board', desc: 'If the board is not full, the pool is canceled' },
          ] as { value: UnclaimedBehavior; label: string; desc: string }[]).map(opt => (
            <RadioOption
              key={opt.value}
              selected={data.unclaimedBehavior === opt.value}
              onSelect={() => update({ unclaimedBehavior: opt.value })}
              label={opt.label}
              description={opt.desc}
            />
          ))}
        </div>
      </div>

      <Card padding="md" variant="elevated">
        <h3 className="font-semibold text-white text-sm mb-2">Number Randomization</h3>
        <p className="text-ink-400 text-xs leading-relaxed">
          Digits 0–9 are randomized exactly once for each axis (rows and columns) through a trusted server operation. Numbers become immutable after randomization and cannot be regenerated.
        </p>
        <p className="text-gold-500/80 text-xs mt-2 font-medium">
          Pending backend implementation — randomization will run server-side when the board locks.
        </p>
      </Card>

      <Card padding="md" variant="elevated">
        <h3 className="font-semibold text-white text-sm mb-3">Rules Summary</h3>
        <ul className="space-y-1.5 text-ink-400 text-xs">
          <li>• Selection: {data.selectionMode === 'pick' ? 'Pick Your Own' : data.selectionMode === 'random' ? 'Random Assignment' : 'Host Assignment'}</li>
          <li>• Max {data.maxSquaresPerUser} squares per participant</li>
          <li>• Lock: {data.lockMode === 'full' ? 'When board is full' : data.lockMode === 'scheduled' ? `At ${data.lockAt || 'a scheduled time'}` : 'Full or scheduled, whichever first'}</li>
          <li>• Unclaimed: {data.unclaimedBehavior === 'open' ? 'Left open' : data.unclaimedBehavior === 'host_assigns' ? 'Host assigns' : 'Board voided'}</li>
        </ul>
      </Card>
    </div>
  );
}
