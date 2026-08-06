import { Share2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo, Button, Card, CopyButton, useToast } from './ui';
import type { PublishResult } from '../lib/types';

interface PublishSuccessProps {
  result: PublishResult;
  poolName: string;
  matchup: string;
  onOpenPool: () => void;
}

export function PublishSuccessScreen({ result, poolName, matchup, onOpenPool }: PublishSuccessProps) {
  const { showToast } = useToast();
  const inviteLink = `${window.location.origin}/?invite=${result.invite_secret}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${poolName} on Lucky Squares`,
          text: `You're invited to join ${poolName} — ${matchup}. Use code ${result.invite_code} to join!`,
          url: inviteLink,
        });
        showToast('success', 'Invite shared');
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(inviteLink);
      showToast('success', 'Link copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 safe-top">
      <div className="mb-6 animate-pop">
        <div className="w-20 h-20 rounded-3xl bg-accent-500/15 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-accent-400" />
        </div>
      </div>

      <h1 className="font-display font-extrabold text-3xl text-white text-center mb-2 animate-slide-up">
        Your pool is ready.
      </h1>
      <p className="text-ink-400 text-center text-sm mb-1 animate-slide-up">{poolName}</p>
      <p className="text-gold-500 font-semibold text-center text-sm mb-8 animate-slide-up">{matchup}</p>

      <div className="w-full max-w-sm space-y-3 animate-fade-in">
        <Button variant="primary" size="lg" fullWidth leftIcon={<Share2 className="w-5 h-5" />} onClick={handleShare}>
          Share Invite
        </Button>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-ink-500 text-xs">Invite Link</p>
              <p className="text-white text-sm truncate">{inviteLink}</p>
            </div>
            <CopyButton text={inviteLink} className="flex-shrink-0 ml-3" />
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink-500 text-xs">Pool Code</p>
              <p className="text-white text-lg font-mono font-bold tracking-widest">{result.invite_code}</p>
            </div>
            <CopyButton text={result.invite_code} className="flex-shrink-0 ml-3" />
          </div>
        </Card>

        <Button variant="secondary" size="lg" fullWidth rightIcon={<ArrowRight className="w-5 h-5" />} onClick={onOpenPool}>
          Open Pool
        </Button>
      </div>

      <div className="mt-8">
        <Logo size="sm" />
      </div>
    </div>
  );
}
