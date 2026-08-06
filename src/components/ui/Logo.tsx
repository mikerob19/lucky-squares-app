type LogoSize = 'sm' | 'md' | 'lg';

const dims: Record<LogoSize, string> = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
const texts: Record<LogoSize, string> = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };

export function Logo({ size = 'md' }: { size?: LogoSize }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`${dims[size]} rounded-xl bg-gold-500 flex items-center justify-center shadow-card`}>
        <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="#080D1A" />
          <rect x="14" y="3" width="7" height="7" rx="1" fill="#080D1A" opacity="0.5" />
          <rect x="3" y="14" width="7" height="7" rx="1" fill="#080D1A" opacity="0.5" />
          <rect x="14" y="14" width="7" height="7" rx="1" fill="#080D1A" />
        </svg>
      </div>
      <span className={`font-display font-extrabold ${texts[size]} text-white tracking-tight`}>
        Lucky<span className="text-gold-500">Squares</span>
      </span>
    </div>
  );
}
