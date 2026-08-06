import { ReactNode } from 'react';
import { Check, AlertCircle, Info, Lock, Radio, Pause } from 'lucide-react';

type BadgeStatus = 'draft' | 'open' | 'full' | 'locked' | 'live' | 'final' | 'canceled' | 'postponed';

const config: Record<BadgeStatus, { bg: string; text: string; border: string; label: string; icon: ReactNode }> = {
  draft:     { bg: 'bg-ink-500/15', text: 'text-ink-300', border: 'border-ink-500/20', label: 'Draft',     icon: <Info className="w-3 h-3" /> },
  open:      { bg: 'bg-accent-500/15', text: 'text-accent-400', border: 'border-accent-500/25', label: 'Open',      icon: <Check className="w-3 h-3" /> },
  full:      { bg: 'bg-gold-500/15', text: 'text-gold-500', border: 'border-gold-500/25', label: 'Full',      icon: <Check className="w-3 h-3" /> },
  locked:    { bg: 'bg-navy-600', text: 'text-ink-300', border: 'border-white/10', label: 'Locked',    icon: <Lock className="w-3 h-3" /> },
  live:      { bg: 'bg-danger-500/15', text: 'text-danger-400', border: 'border-danger-500/25', label: 'Live',      icon: <Radio className="w-3 h-3 animate-pulse" /> },
  final:     { bg: 'bg-navy-600', text: 'text-ink-300', border: 'border-white/10', label: 'Final',     icon: <Check className="w-3 h-3" /> },
  canceled:  { bg: 'bg-danger-500/15', text: 'text-danger-400', border: 'border-danger-500/25', label: 'Canceled',  icon: <AlertCircle className="w-3 h-3" /> },
  postponed: { bg: 'bg-warning-500/15', text: 'text-warning-400', border: 'border-warning-500/25', label: 'Postponed', icon: <Pause className="w-3 h-3" /> },
};

const statusMap: Record<string, BadgeStatus> = {
  draft: 'draft', open: 'open', full: 'full', locked: 'locked',
  in_progress: 'live', final: 'final', completed: 'final',
  canceled: 'canceled', postponed: 'postponed',
};

export function StatusBadge({ status }: { status: string }) {
  const key = statusMap[status] ?? 'draft';
  const c = config[key];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: 'host' | 'player' }) {
  const isHost = role === 'host';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold border ${
      isHost ? 'bg-gold-500/15 text-gold-500 border-gold-500/25' : 'bg-navy-700 text-ink-400 border-white/10'
    }`}>
      {isHost ? 'Host' : 'Player'}
    </span>
  );
}

export function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-9 rounded-lg text-xs font-semibold transition-all active:scale-95 border ${
        active ? 'bg-gold-500 text-navy-950 border-gold-500' : 'bg-navy-800 text-ink-400 border-white/10 hover:border-white/20'
      }`}
    >
      {children}
    </button>
  );
}
