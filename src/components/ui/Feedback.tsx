import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return <Loader2 className={`animate-spin ${dims} text-gold-500`} />;
}

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-navy-950">
      <div className="w-12 h-12 rounded-2xl bg-gold-500/20 flex items-center justify-center">
        <div className="w-6 h-6 rounded-lg bg-gold-500 animate-pulse" />
      </div>
      <p className="text-ink-500 text-sm">{label}</p>
    </div>
  );
}

export function CenterSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      {label && <p className="text-ink-500 text-sm">{label}</p>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function CardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-2 rounded-full bg-navy-800 overflow-hidden">
      <div className="h-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-danger-500/10 border border-danger-500/20 rounded-xl px-4 py-3 text-danger-400 text-sm flex items-center gap-2 animate-fade-in">
      <span className="text-danger-400 flex-shrink-0" aria-hidden>⚠</span>
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-navy-800 border border-white/5 flex items-center justify-center mb-4 text-ink-600">
        {icon}
      </div>
      <h3 className="font-display font-bold text-lg text-white mb-1">{title}</h3>
      <p className="text-ink-500 text-sm max-w-xs mb-6">{subtitle}</p>
      {action}
    </div>
  );
}

export function Disclosure({ children }: { children: ReactNode }) {
  return (
    <div className="bg-navy-800/50 border border-gold-500/10 rounded-xl p-4 text-ink-400 text-xs leading-relaxed">
      {children}
    </div>
  );
}
