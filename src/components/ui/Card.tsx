import { HTMLAttributes, ReactNode } from 'react';

type CardVariant = 'default' | 'bordered' | 'dashed' | 'elevated';

const variants: Record<CardVariant, string> = {
  default: 'bg-navy-900 border border-white/5 shadow-card',
  bordered: 'bg-navy-900 border border-white/10',
  dashed: 'bg-navy-900 border border-dashed border-white/10',
  elevated: 'bg-navy-850 border border-white/5 shadow-card-hover',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' };

export function Card({ variant = 'default', padding = 'md', interactive, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${
        interactive ? 'transition-all active:scale-[0.98] hover:shadow-card-hover' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-display font-bold text-base text-white truncate">{title}</h3>
        {subtitle && <p className="text-ink-400 text-sm mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sublabel }: { label: string; value: ReactNode; sublabel?: string }) {
  return (
    <Card padding="md" className="text-center">
      <p className="text-ink-500 text-2xs font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-gold-500">{value}</p>
      {sublabel && <p className="text-ink-500 text-xs mt-1">{sublabel}</p>}
    </Card>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display font-bold text-sm text-ink-400 uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}
