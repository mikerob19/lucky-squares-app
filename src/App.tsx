import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { LandingScreen } from './components/LandingScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { CreatePoolWizard } from './components/CreatePoolWizard';
import { PublishSuccessScreen } from './components/PublishSuccessScreen';
import { PoolLobbyScreen } from './components/PoolLobbyScreen';
import { BoardPlaceholderScreen } from './components/BoardPlaceholderScreen';
import { FullScreenLoader, ToastProvider } from './components/ui';
import { getPool } from './lib/pools';
import { getGameById } from './lib/nfl';
import type { PublishResult, Pool } from './lib/types';

type Route =
  | { name: 'landing' }
  | { name: 'auth'; mode: 'login' | 'signup' }
  | { name: 'dashboard' }
  | { name: 'wizard' }
  | { name: 'publish_success'; result: PublishResult; poolName: string; matchup: string }
  | { name: 'lobby'; poolId: string }
  | { name: 'board'; poolId: string };

function AppContent() {
  const { session, loading, intent, consumeIntent } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'landing' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteSecret = params.get('invite');
    if (inviteSecret) {
      // Invite secret lookup will be implemented with the full invite flow
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session && route.name === 'landing') {
      setRoute({ name: 'dashboard' });
    }
    if (!session && (route.name === 'dashboard' || route.name === 'wizard')) {
      setRoute({ name: 'landing' });
    }
  }, [session, loading, route.name]);

  const handleCreatePool = () => {
    if (session) {
      setRoute({ name: 'wizard' });
    } else {
      setRoute({ name: 'auth', mode: 'signup' });
    }
  };

  const handleLogin = () => setRoute({ name: 'auth', mode: 'login' });
  const handleSignUp = () => setRoute({ name: 'auth', mode: 'signup' });

  const handleJoinPool = (poolId: string) => {
    if (session) {
      setRoute({ name: 'lobby', poolId });
    } else {
      setRoute({ name: 'auth', mode: 'signup' });
    }
  };

  useEffect(() => {
    if (session && intent) {
      const consumed = consumeIntent();
      if (consumed?.type === 'create_pool') {
        setRoute({ name: 'wizard' });
      } else if (consumed?.type === 'join_pool') {
        setRoute({ name: 'lobby', poolId: consumed.poolId });
      } else if (consumed?.type === 'open_pool') {
        setRoute({ name: 'lobby', poolId: consumed.poolId });
      } else {
        setRoute({ name: 'dashboard' });
      }
    }
  }, [session, intent, consumeIntent]);

  if (loading) return <FullScreenLoader label="Loading Lucky Squares…" />;

  if (!session) {
    if (route.name === 'auth') {
      return (
        <AuthScreen
          mode={route.mode}
          onBack={() => setRoute({ name: 'landing' })}
          onSwitchMode={(mode) => setRoute({ name: 'auth', mode })}
        />
      );
    }
    return (
      <LandingScreen
        onCreatePool={handleCreatePool}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onJoinPool={handleJoinPool}
      />
    );
  }

  switch (route.name) {
    case 'wizard':
      return (
        <CreatePoolWizard
          onBack={() => setRoute({ name: 'dashboard' })}
          onPublished={(result, poolName) => {
            (async () => {
              try {
                const pool = await getPool(result.pool_id);
                let matchup = 'Matchup TBD';
                if (pool?.game_id) {
                  const game = await getGameById(pool.game_id);
                  if (game) matchup = `${game.away_abbr} @ ${game.home_abbr}`;
                }
                setRoute({ name: 'publish_success', result, poolName, matchup });
              } catch {
                setRoute({ name: 'publish_success', result, poolName, matchup: 'Matchup TBD' });
              }
            })();
          }}
        />
      );
    case 'publish_success':
      return (
        <PublishSuccessScreen
          result={route.result}
          poolName={route.poolName}
          matchup={route.matchup}
          onOpenPool={() => setRoute({ name: 'lobby', poolId: route.result.pool_id })}
        />
      );
    case 'lobby':
      return (
        <PoolLobbyScreen
          poolId={route.poolId}
          onBack={() => setRoute({ name: 'dashboard' })}
          onViewBoard={() => setRoute({ name: 'board', poolId: route.poolId })}
        />
      );
    case 'board':
      return <BoardLoader poolId={route.poolId} onBack={() => setRoute({ name: 'lobby', poolId: route.poolId })} />;
    default:
      return (
        <DashboardScreen
          onCreatePool={() => setRoute({ name: 'wizard' })}
          onOpenPool={(poolId) => setRoute({ name: 'lobby', poolId })}
          onResumeDraft={() => setRoute({ name: 'wizard' })}
        />
      );
  }
}

function BoardLoader({ poolId, onBack }: { poolId: string; onBack: () => void }) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    getPool(poolId).then(p => { if (!p) setErr(true); else setPool(p); }).catch(() => setErr(true));
  }, [poolId]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center text-ink-400 text-sm">
      Pool not found. <button onClick={onBack} className="text-gold-500 ml-2">Go back</button>
    </div>
  );
  if (!pool) return <FullScreenLoader label="Loading board…" />;
  return <BoardPlaceholderScreen pool={pool} onBack={onBack} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
