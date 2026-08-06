import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', className = '' }: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast('success', 'Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text, showToast]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 h-9 rounded-xl bg-navy-700 text-white border border-white/10 hover:bg-navy-600 transition-all active:scale-95 ${className}`}
    >
      {copied ? <><Check className="w-4 h-4 text-accent-400" /> {copiedLabel}</> : <><Copy className="w-4 h-4" /> {label}</>}
    </button>
  );
}
