import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showLogo?: boolean;
  logoSize?: 'sm' | 'md';
  right?: ReactNode;
}

export function Header({ title, onBack, showLogo, logoSize = 'sm', right }: HeaderProps) {
  return (
    <header className="glass border-b border-white/5 sticky top-0 z-30 safe-top">
      <div className="max-w-app mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} aria-label="Go back">
              <span className="sr-only">Back</span>
            </Button>
          )}
          {showLogo && <Logo size={logoSize} />}
          {title && <h1 className="font-display font-extrabold text-lg text-white truncate">{title}</h1>}
        </div>
        {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-white">{title}</h1>
        {subtitle && <p className="text-ink-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface WizardHeaderProps {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
}

export function WizardHeader({ title, onBack, onClose, right }: WizardHeaderProps) {
  return (
    <header className="glass border-b border-white/5 sticky top-0 z-30 safe-top">
      <div className="max-w-app mx-auto px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {onBack ? (
              <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} aria-label="Go back">
                <span className="sr-only">Back</span>
              </Button>
            ) : onClose ? (
              <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close">
                <span className="sr-only">Close</span>
              </Button>
            ) : null}
            <h1 className="font-display font-extrabold text-lg text-white">{title}</h1>
          </div>
          {right}
        </div>
      </div>
    </header>
  );
}
