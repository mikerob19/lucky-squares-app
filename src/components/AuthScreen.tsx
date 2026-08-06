import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo, Button, Input, PasswordInput, ErrorBanner, Checkbox } from './ui';
import { useAuth } from '../lib/auth';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  mode: AuthMode;
  onBack: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export function AuthScreen({ mode, onBack, onSwitchMode }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isSignup = mode === 'signup';

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (isSignup && !username.trim()) errors.username = 'Display name is required';
    if (isSignup && username.trim().length > 40) errors.username = 'Display name must be 40 characters or less';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (isSignup && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (isSignup && !acceptedTerms) errors.terms = 'You must accept the Terms and Privacy Policy to continue';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await signUp(email.trim(), password, username.trim());
        if (signUpError) setError(signUpError);
      } else {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) setError(signInError);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-top">
      <div className="px-5 py-4">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>Back</Button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 max-w-md mx-auto w-full">
        <div className="mb-8">
          <Logo size="lg" />
          <h1 className="font-display font-extrabold text-2xl text-white mt-6 mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-ink-400 text-sm">
            {isSignup ? 'Start creating and joining football squares pools.' : 'Sign in to access your pools.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <Input
              label="Display Name"
              value={username}
              onChange={(v) => { setUsername(v); setFieldErrors(f => ({ ...f, username: '' })); }}
              placeholder="Your name as shown to others"
              error={fieldErrors.username}
              maxLength={40}
              autoComplete="name"
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setFieldErrors(f => ({ ...f, email: '' })); }}
            placeholder="you@example.com"
            error={fieldErrors.email}
            autoComplete="email"
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(v) => { setPassword(v); setFieldErrors(f => ({ ...f, password: '' })); }}
            placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
            error={fieldErrors.password}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
          {isSignup && (
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); setFieldErrors(f => ({ ...f, confirmPassword: '' })); }}
              placeholder="Re-enter your password"
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />
          )}
          {isSignup && (
            <Checkbox
              checked={acceptedTerms}
              onChange={(v) => { setAcceptedTerms(v); setFieldErrors(f => ({ ...f, terms: '' })); }}
              label={<>I accept the <span className="text-gold-500">Terms of Service</span> and <span className="text-gold-500">Privacy Policy</span></>}
              error={fieldErrors.terms}
            />
          )}
          {!isSignup && (
            <div className="text-right">
              <button type="button" className="text-gold-500 text-sm hover:underline">
                Forgot password?
              </button>
            </div>
          )}
          {error && <ErrorBanner message={error} />}
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {isSignup ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-400">
          {isSignup ? (
            <>Already have an account? <button onClick={() => onSwitchMode('login')} className="text-gold-500 font-semibold hover:underline">Sign in</button></>
          ) : (
            <>New here? <button onClick={() => onSwitchMode('signup')} className="text-gold-500 font-semibold hover:underline">Create an account</button></>
          )}
        </div>
      </div>
    </div>
  );
}
