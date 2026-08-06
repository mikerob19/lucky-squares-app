import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const inputBase =
  'w-full bg-navy-800 border rounded-xl px-4 text-white placeholder-ink-600 ' +
  'transition-all focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20 ' +
  'disabled:opacity-50 h-11';

const errorClass = 'border-danger-500/50 focus:border-danger-500/50 focus:ring-danger-500/20';
const normalClass = 'border-white/10';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-ink-200 text-sm font-medium mb-1.5">
      {label}
      {required && <span className="text-gold-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="text-danger-400 text-xs mt-1">{error}</p>;
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-ink-500 text-xs mt-1">{children}</p>;
}

function CharCount({ value, max }: { value: string; max: number }) {
  return <p className="text-ink-600 text-xs mt-1 text-right">{value.length}/{max}</p>;
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
}

export function Input({ label, value, onChange, error, hint, required, maxLength, className = '', ...rest }: InputProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className={`${inputBase} ${error ? errorClass : normalClass} ${className}`}
        {...rest}
      />
      {maxLength && <CharCount value={value} max={maxLength} />}
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      <FieldError error={error} />
    </div>
  );
}

export function PasswordInput({ label, value, onChange, error, required, autoComplete, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  hint?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputBase} pr-12 ${error ? errorClass : normalClass}`}
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      <FieldError error={error} />
    </div>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
}

export function TextArea({ label, value, onChange, error, hint, required, maxLength, className = '', ...rest }: TextAreaProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className={`${inputBase} ${error ? errorClass : normalClass} resize-none ${className}`}
        rows={4}
        {...rest}
      />
      {maxLength && <CharCount value={value} max={maxLength} />}
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      <FieldError error={error} />
    </div>
  );
}

export function PoolCodeInput({ value, onChange, onSubmit, loading }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        maxLength={8}
        className={`${inputBase} text-center font-mono tracking-widest uppercase ${normalClass}`}
        aria-label="Pool code"
      />
      <button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        className={`${inputBase} w-12 flex items-center justify-center bg-gold-500 text-navy-950 border-gold-500 hover:bg-gold-400 disabled:opacity-50`}
        aria-label="Submit code"
      >
        {loading ? '…' : '→'}
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, error }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-white/20 bg-navy-800 text-gold-500 focus:ring-gold-500/20 flex-shrink-0"
        />
        <span className="text-ink-200 text-sm leading-relaxed">{label}</span>
      </label>
      <FieldError error={error} />
    </div>
  );
}

export function Dropdown<T extends string>({ label, value, options, onChange, error, required }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  error?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${inputBase} appearance-none pr-10 ${error ? errorClass : normalClass}`}
          aria-label={label}
        >
          {options.map(opt => <option key={opt.value} value={opt.value} className="bg-navy-800">{opt.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function RadioOption({ selected, onSelect, label, description }: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98] border ${
        selected ? 'border-gold-500/40 bg-navy-900 ring-2 ring-gold-500/20' : 'border-white/5 bg-navy-900 hover:border-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
          selected ? 'border-gold-500 bg-gold-500' : 'border-ink-600'
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-navy-950" />}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{label}</p>
          {description && <p className="text-ink-500 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
    </button>
  );
}
