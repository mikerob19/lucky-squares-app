import { Input, TextArea, Disclosure } from '../ui';
import type { WizardData, NFLGame } from '../../lib/types';

interface Step2Props {
  data: WizardData;
  selectedGame: NFLGame | null;
  update: (patch: Partial<WizardData>) => void;
}

export function Step2PoolDetails({ data, selectedGame, update }: Step2Props) {
  const suggestedName = selectedGame
    ? `${selectedGame.away_abbr} @ ${selectedGame.home_abbr} Pool`
    : '';

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-1">Pool Details</h2>
        <p className="text-ink-400 text-sm">Name your pool and add an optional message for participants.</p>
      </div>

      <div className="relative">
        <Input
          label="Pool Name"
          value={data.poolName}
          onChange={(v) => update({ poolName: v })}
          placeholder={suggestedName || 'e.g., Week 1 Bills Pool'}
          maxLength={80}
          error={data.poolName.trim() ? (/[<>]/.test(data.poolName) ? 'No < or > characters allowed' : null) : null}
        />
        {suggestedName && !data.poolName && (
          <button
            onClick={() => update({ poolName: suggestedName })}
            className="text-gold-500 text-xs mt-1 hover:underline"
          >
            Use suggested: {suggestedName}
          </button>
        )}
      </div>

      <TextArea
        label="Host Message (optional)"
        value={data.hostMessage}
        onChange={(v) => update({ hostMessage: v })}
        placeholder="Add a welcome message or payment instructions for your group…"
        maxLength={500}
      />

      <div>
        <label className="block text-ink-200 text-sm font-medium mb-1.5">Square Value (optional)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500">$</span>
          <input
            type="number"
            value={data.squareValue}
            onChange={(e) => update({ squareValue: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-navy-800 border border-white/10 rounded-xl pl-8 pr-4 h-11 text-white placeholder-ink-600 transition-all focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20"
            aria-label="Square value in dollars"
          />
        </div>
        <p className="text-ink-500 text-xs mt-1">Leave blank for free or informal pools. Displayed for information only.</p>
      </div>

      <Disclosure>
        Lucky Squares does not collect or distribute money. Any square value is informational and arrangements are handled outside the platform.
      </Disclosure>
    </div>
  );
}
