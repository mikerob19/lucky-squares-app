import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div
          className="bg-navy-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-pop sm:w-full sm:max-w-md safe-bottom"
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="font-display font-bold text-lg text-white">{title}</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-navy-800 flex items-center justify-center active:scale-90 transition-transform" aria-label="Close dialog">
                <X className="w-5 h-5 text-ink-300" />
              </button>
            </div>
          )}
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="px-5 py-4 border-t border-white/5">{footer}</div>}
        </div>
      </div>
    </>
  );
}
