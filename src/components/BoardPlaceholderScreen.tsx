import { Grid3x3 } from 'lucide-react';
import { Card, Header } from './ui';
import type { Pool } from '../lib/types';

interface BoardPlaceholderProps {
  pool: Pool;
  onBack: () => void;
}

export function BoardPlaceholderScreen({ pool, onBack }: BoardPlaceholderProps) {
  return (
    <div className="min-h-screen safe-top">
      <Header showLogo onBack={onBack} />

      <div className="max-w-app mx-auto px-5 py-6">
        <h1 className="font-display font-extrabold text-xl text-white mb-1">{pool.name}</h1>
        <p className="text-gold-500 font-semibold text-sm mb-6">{pool.team_away} @ {pool.team_home}</p>

        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 className="w-5 h-5 text-gold-500" />
            <h2 className="font-semibold text-white text-sm">10×10 Board</h2>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 100 }, (_, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm bg-navy-800 border border-white/5 flex items-center justify-center text-[10px] text-ink-600"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </Card>
        <p className="text-ink-600 text-xs text-center mt-4">
          The interactive board — claiming squares, viewing numbers, and tracking winners — will be implemented in the next pass.
        </p>
      </div>
    </div>
  );
}
