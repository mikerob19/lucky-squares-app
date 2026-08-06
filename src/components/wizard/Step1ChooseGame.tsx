import { Calendar, Clock, Lock } from 'lucide-react';
import { Card } from '../ui';
import type { NFLGame } from '../../lib/types';
import { formatKickoff, groupGamesByDate } from '../../lib/nfl';

interface Step1Props {
  games: NFLGame[];
  selectedGameId: string | null;
  onSelect: (gameId: string) => void;
}

export function Step1ChooseGame({ games, selectedGameId, onSelect }: Step1Props) {
  const grouped = groupGamesByDate(games);

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-ink-500">
        <p className="text-sm">No upcoming games available right now.</p>
        <p className="text-xs mt-1">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display font-bold text-xl text-white mb-1">Choose a Game</h2>
      <p className="text-ink-400 text-sm mb-5">Select one upcoming NFL game for your pool.</p>

      {grouped.map(group => (
        <div key={group.date} className="mb-6">
          <h3 className="text-ink-500 text-2xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {group.date}
          </h3>
          <div className="space-y-2">
            {group.games.map(game => (
              <GameCard key={game.id} game={game} selected={game.id === selectedGameId} onSelect={() => onSelect(game.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GameCard({ game, selected, onSelect }: { game: NFLGame; selected: boolean; onSelect: () => void }) {
  const { time, timezone } = formatKickoff(game.kickoff_utc);
  const isUnavailable = game.status !== 'scheduled';

  return (
    <Card
      interactive={!isUnavailable}
      onClick={isUnavailable ? undefined : onSelect}
      className={`text-left ${selected ? 'border-gold-500/40 ring-2 ring-gold-500/20' : ''} ${isUnavailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center">
            <p className="font-display font-bold text-white text-sm">{game.away_abbr}</p>
            <p className="text-ink-500 text-xs truncate max-w-[80px]">{game.away_team}</p>
          </div>
          <span className="text-ink-600 text-2xs font-bold">AT</span>
          <div className="text-center">
            <p className="font-display font-bold text-white text-sm">{game.home_abbr}</p>
            <p className="text-ink-500 text-xs truncate max-w-[80px]">{game.home_team}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-ink-200 text-sm flex items-center gap-1 justify-end">
            <Clock className="w-3.5 h-3.5" /> {time}
          </p>
          <p className="text-ink-600 text-xs">{timezone}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-ink-500 text-xs">Week {game.week}</span>
        {isUnavailable ? (
          <span className="text-ink-500 text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" /> {game.status === 'final' ? 'Final' : game.status === 'canceled' ? 'Canceled' : 'Unavailable'}
          </span>
        ) : selected ? (
          <span className="text-gold-500 text-xs font-semibold flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-gold-500/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-gold-500" />
            </span>
            Selected
          </span>
        ) : (
          <span className="text-ink-600 text-xs">Tap to select</span>
        )}
      </div>
    </Card>
  );
}
