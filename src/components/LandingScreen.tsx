import { useState, useRef } from 'react';
import { Plus, ArrowRight, Calendar } from 'lucide-react';
import { Logo, Button, Card, PoolCodeInput, ErrorBanner } from './ui';
import { lookupInviteByCode } from '../lib/pools';
import { useAuth } from '../lib/auth';
import type { InvitePreview } from '../lib/types';

interface LandingScreenProps {
  onCreatePool: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onJoinPool: (poolId: string) => void;
}

export function LandingScreen({ onCreatePool, onLogin, onSignUp, onJoinPool }: LandingScreenProps) {
  const { setIntent } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCreatePool = () => {
    setIntent({ type: 'create_pool' });
    onCreatePool();
  };

  const handleJoinClick = () => {
    codeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter a pool code to join');
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);
    try {
      const result = await lookupInviteByCode(trimmed);
      if (!result) {
        setError('That code is invalid, expired, or unavailable. Double-check and try again.');
      } else {
        setPreview(result);
      }
    } catch {
      setError('Could not look up that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPreview = () => {
    if (preview) {
      setIntent({ type: 'join_pool', poolId: preview.pool_id });
      onJoinPool(preview.pool_id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="safe-top px-5 h-16 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLogin}>Login</Button>
          <Button variant="secondary" size="sm" onClick={onSignUp}>Sign Up</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white leading-tight mb-3">
            Football squares<br />made simple.
          </h1>
          <p className="text-ink-400 text-base leading-relaxed max-w-sm">
            Create a private pool, invite your friends, claim squares, and follow the winners — all in one place.
          </p>
        </div>

        <div className="w-full space-y-3 animate-slide-up">
          <Button variant="primary" size="lg" fullWidth leftIcon={<Plus className="w-5 h-5" />} onClick={handleCreatePool}>
            Create a Pool
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleJoinClick}>
            Join a Pool
          </Button>
        </div>

        <div ref={codeRef} className="w-full mt-8 animate-fade-in">
          <form onSubmit={handleCodeSubmit}>
            <PoolCodeInput value={code} onChange={(v) => { setCode(v); setError(null); setPreview(null); }} onSubmit={() => handleCodeSubmit(new Event('submit') as unknown as React.FormEvent)} loading={loading} />
          </form>
          {error && <div className="mt-3"><ErrorBanner message={error} /></div>}

          {preview && (
            <Card padding="lg" className="mt-4 animate-pop">
              <p className="text-ink-500 text-2xs font-semibold mb-3 uppercase tracking-wide">Pool Preview</p>
              <h3 className="font-display font-bold text-xl text-white mb-1">{preview.pool_name}</h3>
              <p className="text-gold-500 font-semibold text-sm mb-3">{preview.matchup}</p>
              {preview.kickoff && (
                <p className="text-ink-400 text-sm flex items-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(preview.kickoff).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </p>
              )}
              {preview.host_name && (
                <p className="text-ink-500 text-sm">Hosted by {preview.host_name}</p>
              )}
              <Button variant="primary" fullWidth className="mt-4" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={handleJoinPreview}>
                Join Pool
              </Button>
            </Card>
          )}
        </div>
      </div>

      <footer className="px-5 py-4 text-center text-ink-600 text-xs">
        Lucky Squares does not collect or distribute money.
      </footer>
    </div>
  );
}
