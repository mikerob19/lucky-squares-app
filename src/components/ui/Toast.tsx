import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string }

const ToastContext = createContext<{ showToast: (type: ToastType, message: string) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts(t => t.filter(toast => toast.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 safe-bottom pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-accent-400" />,
  error: <AlertCircle className="w-5 h-5 text-danger-400" />,
  info: <Info className="w-5 h-5 text-gold-500" />,
};

const borders = {
  success: 'border-accent-500/30',
  error: 'border-danger-500/30',
  info: 'border-gold-500/30',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className={`flex items-center gap-3 bg-navy-900 border ${borders[toast.type]} rounded-xl px-4 py-3 shadow-2xl animate-toast-in max-w-sm pointer-events-auto`}>
      {icons[toast.type]}
      <span className="text-ink-100 text-sm flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="text-ink-500 hover:text-white flex-shrink-0" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
