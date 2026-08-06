import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
  'transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ' +
  'disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-gold-500/40';

const variants: Record<Variant, string> = {
  primary: 'bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-btn',
  secondary: 'bg-navy-700 text-white border border-white/10 hover:bg-navy-600',
  ghost: 'text-ink-400 hover:text-white hover:bg-white/5',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-btn',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 h-9',
  md: 'text-sm px-4 h-11',
  lg: 'text-base px-5 h-12',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className = '', children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
);
Button.displayName = 'Button';
