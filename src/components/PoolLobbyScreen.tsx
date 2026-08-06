import { useEffect, useState } from 'react';
import { Share2, Calendar, Grid3x3, Users, Lock } from 'lucide-react';
import { Button, Card, Header, StatusBadge, RoleBadge, CenterSpinner, ProgressBar, CopyButton, useToast } from './ui';
import { getPool, getPoolInvite, getSquaresFilled, joinPool } from '../lib/pools';
import { getGameById } from '../lib/nfl';
import { useAuth } from '../lib/auth';
import type { Pool, PoolInvite, NFLGame } from '../lib/types';

interface PoolLobbyProps {
  poolId: string;
  onBack: () => void;
  onViewBoard: () => void;
}

export function PoolLobbyScreen({ poolId, onBack, onViewBoard }: PoolLobbyProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [pool, setPool] = useState<Pool | null>(null);
  const [invite, setInvite] = useState<PoolInvite | null>(null);
  const [game, setGame] = useState<NFLGame | null>(null);
  const [squaresFilled, setSquaresFilled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const isHost = pool?.creator_id === user?.id;

  useEffect(() => {
    (async () => {
      try {
        const p = await getPool(poolId);
        if (!p) { setError('Pool not found'); setLoading(false); return; }
        setPool(p);
        if (p.game_id) {
          const g = await getGameById(p.game_id);
          setGame(g);
        }
        const filled = await getSquaresFilled(poolId);
        setSquaresFilled(filled);
        if (p.creator_id === user?.id) {
          const inv = await getPoolInvite(poolId);
          setInvite(inv);
        }
      } catch {
        setError('Could not load this pool.');
      } finally {
        setLoading(false);
      }
    })();
  }, [poolId, user?.id]);

  const handleShare = async () => {
    if (!invite) return;
    const link = `${window.location.origin}/?invite=${invite.secret}`;
    if (navigator.share) {
      await navigator.share({
        title: `Join ${pool?.name} on Lucky Squares`,
        text: `You're invited to join ${pool?.name}! Use code ${invite.code}.`,
        url: link,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link);
      showToast('success', 'Link copied to clipboard');
    }
  };

  const handleJoin = async () => {
    if (!pool || joining) return;
    setJoining(true);
    try {
      await joinPool(pool.id);
      showToast('success', 'Joined pool');
    } catch {
      setError('Could not join this pool.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <CenterSpinner label="Loading pool…" />;

  if (error || !pool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-ink-400 text-sm">{error || 'Pool not found'}</p>
        <Button variant="secondary" onClick={onBack}>Back to Dashboard</Button>
      </div>
    );
  }

  const matchup = `${pool.team_away} @ ${pool.team_home}`;

  return (
    <div className="min-h-screen safe-top">
      <Header showLogo onBack={onBack} />

      <div className="max-w-app mx-auto px-5 py-6">
        <Card padding="lg" variant="elevated" className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="font-display font-extrabold text-xl text-white mb-1">{pool.name}</h1>
              <p className="text-gold-500 font-semibold text-sm">{matchup}</p>
            </div>
            <StatusBadge status={pool.status} />
          </div>
          {game && (
            <p className="text-ink-400 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(game.kickoff_utc).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <RoleBadge role={isHost ? 'host' : 'player'} />
            <span className="text-ink-500 text-xs">Hosted by {profile?.username ?? 'Unknown'}</span>
          </div>
        </Card>

        <Card padding="lg" className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 text-gold-500" />
              <h3 className="font-semibold text-white text-sm">Squares</h3>
            </div>
            <span className="text-ink-400 text-sm font-medium">{squaresFilled}/100</span>
          </div>
          <ProgressBar value={squaresFilled} />
        </Card>

        <Card padding="lg" className="mb-4">
          <h3 className="font-semibold text-white text-sm mb-3">Pool Rules</h3>
          <ul className="space-y-2 text-ink-400 text-sm">
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-600" />
              {pool.selection_mode === 'pick' ? 'Pick Your Own squares' : pool.selection_mode === 'random' ? 'Random assignment' : 'Host assigns squares'}
            </li>
            <li className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-ink-600" />
              Max {pool.max_squares_per_user} squares per participant
            </li>
            <li className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-ink-600" />
              {pool.lock_mode === 'full' ? 'Locks when board is full' : pool.lock_mode === 'scheduled' ? 'Locks at scheduled time' : 'Locks when full or at scheduled time'}
            </li>
          </ul>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Q1', pct: pool.payout_first_pct },
              { label: 'HT', pct: pool.payout_second_pct },
              { label: 'Q3', pct: pool.payout_third_pct },
              { label: 'Final', pct: pool.payout_fourth_pct },
            ].map(q => (
              <div key={q.label} className="text-center bg-navy-800 rounded-lg py-2">
                <p className="text-ink-500 text-xs">{q.label}</p>
                <p className="text-gold-500 font-bold text-sm">{q.pct}%</p>
              </div>
            ))}
          </div>
        </Card>

        {isHost && invite && (
          <Card padding="lg" className="mb-4">
            <h3 className="font-semibold text-white text-sm mb-3">Invite Friends</h3>
            <div className="flex items-center justify-between bg-navy-800 rounded-xl p-3 mb-3">
              <div>
                <p className="text-ink-500 text-xs">Pool Code</p>
                <p className="text-white text-lg font-mono font-bold tracking-widest">{invite.code}</p>
              </div>
              <CopyButton text={invite.code} />
            </div>
            <Button variant="primary" fullWidth leftIcon={<Share2 className="w-5 h-5" />} onClick={handleShare}>
              Share Invite Link
            </Button>
          </Card>
        )}

        {!isHost && (
          <Button variant="primary" fullWidth loading={joining} onClick={handleJoin} className="mb-4">
            Join Pool
          </Button>
        )}

        <Button variant="secondary" fullWidth leftIcon={<Grid3x3 className="w-5 h-5" />} onClick={onViewBoard}>
          View Board
        </Button>
        <p className="text-ink-600 text-xs text-center mt-3">
          Board functionality is a placeholder for this pass. Full board interaction coming soon.
        </p>
      </div>
    </div>
  );
}
