import { useEffect, useState } from 'react';
import { Plus, Trophy, LogOut, Calendar } from 'lucide-react';
import { Button, Card, Header, PageHeader, StatusBadge, RoleBadge, EmptyState, CardSkeletonList, ErrorBanner, SectionLabel } from './ui';
import { useAuth } from '../lib/auth';
import { getUserPools } from '../lib/pools';
import type { Pool, PoolDraft } from '../lib/types';

interface DashboardScreenProps {
  onCreatePool: () => void;
  onOpenPool: (poolId: string) => void;
  onResumeDraft: () => void;
}

export function DashboardScreen({ onCreatePool, onOpenPool, onResumeDraft }: DashboardScreenProps) {
  const { user, profile, signOut } = useAuth();
  const [hosted, setHosted] = useState<Pool[]>([]);
  const [joined, setJoined] = useState<Pool[]>([]);
  const [drafts, setDrafts] = useState<PoolDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadPools(); }, []);

  const loadPools = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUserPools();
      setHosted(result.hosted);
      setJoined(result.joined);
      setDrafts(result.drafts);
    } catch (err: unknown) {
      console.error('Dashboard loadPools error:', err);
      setError('Could not load your pools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasAny = hosted.length > 0 || joined.length > 0;

  return (
    <div className="min-h-screen safe-top">
      <Header
        showLogo
        right={
          <div className="flex items-center gap-2">
            <span className="text-ink-400 text-sm hidden sm:inline">{profile?.username ?? user?.email}</span>
            <Button variant="ghost" size="sm" leftIcon={<LogOut className="w-4 h-4" />} onClick={signOut} aria-label="Sign out" />
          </div>
        }
      />

      <div className="max-w-app mx-auto px-5 py-6">
        <PageHeader
          title="My Pools"
          subtitle={`Welcome back, ${profile?.username ?? 'there'}`}
          action={
            <Button variant="primary" size="md" leftIcon={<Plus className="w-5 h-5" />} onClick={onCreatePool}>
              Create Pool
            </Button>
          }
        />

        {loading ? (
          <CardSkeletonList count={3} />
        ) : error ? (
          <Card padding="lg" className="text-center">
            <ErrorBanner message={error} />
            <Button variant="secondary" className="mt-4" onClick={loadPools}>Retry</Button>
          </Card>
        ) : !hasAny && drafts.length === 0 ? (
          <EmptyState
            icon={<Trophy className="w-8 h-8" />}
            title="You don't have any pools yet."
            subtitle="Create your first pool and invite friends to start playing football squares."
            action={<Button variant="primary" leftIcon={<Plus className="w-5 h-5" />} onClick={onCreatePool}>Create Your First Pool</Button>}
          />
        ) : (
          <div className="space-y-6">
            {drafts.length > 0 && (
              <div>
                <SectionLabel>Drafts</SectionLabel>
                <div className="space-y-3">
                  {drafts.map(draft => (
                    <DraftCard key={draft.id} draft={draft} onResume={onResumeDraft} />
                  ))}
                </div>
              </div>
            )}
            {hosted.length > 0 && (
              <div>
                <SectionLabel>Pools You Host</SectionLabel>
                <div className="space-y-3">
                  {hosted.map(pool => (
                    <PoolCard key={pool.id} pool={pool} role="host" onOpen={() => onOpenPool(pool.id)} />
                  ))}
                </div>
              </div>
            )}
            {joined.length > 0 && (
              <div>
                <SectionLabel>Pools You Joined</SectionLabel>
                <div className="space-y-3">
                  {joined.map(pool => (
                    <PoolCard key={pool.id} pool={pool} role="player" onOpen={() => onOpenPool(pool.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PoolCard({ pool, role, onOpen }: { pool: Pool; role: 'host' | 'player'; onOpen: () => void }) {
  const matchup = `${pool.team_away} @ ${pool.team_home}`;
  return (
    <Card interactive onClick={onOpen} className="cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-base mb-0.5 truncate">{pool.name}</h3>
          <p className="text-ink-400 text-sm">{matchup}</p>
        </div>
        <StatusBadge status={pool.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <RoleBadge role={role} />
        <span className="text-ink-600 text-xs">
          {pool.selection_mode === 'pick' ? 'Pick Your Own' : pool.selection_mode === 'random' ? 'Random' : 'Host Assignment'}
        </span>
        {pool.published_at && (
          <span className="text-ink-600 text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(pool.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </Card>
  );
}

function DraftCard({ draft, onResume }: { draft: PoolDraft; onResume: () => void }) {
  const data = draft.data;
  const name = data?.poolName || 'Untitled pool';
  const updated = new Date(draft.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <Card variant="dashed" interactive onClick={onResume} className="cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base mb-1">{name}</h3>
          <div className="flex items-center gap-2">
            <StatusBadge status="draft" />
            <span className="text-ink-600 text-xs">Step {draft.step} of 5 · Saved {updated}</span>
          </div>
        </div>
        <span className="text-gold-500 text-sm font-semibold">Resume →</span>
      </div>
    </Card>
  );
}
