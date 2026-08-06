import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Save } from 'lucide-react';
import { Button, ErrorBanner, StepIndicator, WizardHeader, CenterSpinner } from './ui';
import { useAuth } from '../lib/auth';
import { getDraft, saveDraft, publishPool } from '../lib/pools';
import { getUpcomingGames, getGameById } from '../lib/nfl';
import { isStepValid, validateStep } from '../lib/validation';
import { defaultWizardData } from '../lib/types';
import type { WizardData, NFLGame, PublishResult } from '../lib/types';
import { Step1ChooseGame } from './wizard/Step1ChooseGame';
import { Step2PoolDetails } from './wizard/Step2PoolDetails';
import { Step3BoardRules } from './wizard/Step3BoardRules';
import { Step4PrizeStructure } from './wizard/Step4PrizeStructure';
import { Step5Review } from './wizard/Step5Review';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface CreatePoolWizardProps {
  onBack: () => void;
  onPublished: (result: PublishResult, poolName: string) => void;
}

export function CreatePoolWizard({ onBack, onPublished }: CreatePoolWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultWizardData);
  const [, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<NFLGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<NFLGame | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [draftResult, gamesResult] = await Promise.allSettled([getDraft(), getUpcomingGames()]);

        if (draftResult.status === 'fulfilled' && draftResult.value) {
          const draft = draftResult.value;
          setDraftId(draft.id);
          draftIdRef.current = draft.id;
          setStep(draft.step);
          setData({ ...defaultWizardData, ...draft.data });
        } else if (draftResult.status === 'rejected') {
          setError('Could not load saved data. You can still create a pool.');
        }

        if (gamesResult.status === 'fulfilled') {
          setGames(gamesResult.value);
        } else {
          console.error('[CreatePoolWizard] Failed to load games:', gamesResult.reason);
        }
      } catch {
        setError('Could not load saved data. You can still create a pool.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (data.gameId) {
      getGameById(data.gameId).then(g => setSelectedGame(g)).catch(() => {});
    } else {
      setSelectedGame(null);
    }
  }, [data.gameId]);

  const doSave = useCallback(async (currentData: WizardData, currentStep: number) => {
    if (!user) return;
    setSaveState('saving');
    try {
      const saved = await saveDraft(draftIdRef.current, currentStep, currentData);
      draftIdRef.current = saved.id;
      setDraftId(saved.id);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('failed');
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (data.gameId || data.poolName || step > 1) {
        doSave(data, step);
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [data, step, loading, doSave]);

  const updateData = (patch: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...patch }));
  };

  const handleNext = () => {
    const err = validateStep(step, data);
    if (err) { setError(err); return; }
    setError(null);
    if (step < 5) {
      setStep(s => s + 1);
      doSave(data, step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(s => s - 1);
      doSave(data, step - 1);
    } else {
      onBack();
    }
  };

  const handlePublish = async () => {
    if (publishing) return;
    const err = validateStep(5, data);
    if (err) { setError(err); return; }
    setPublishing(true);
    setError(null);
    try {
      if (!draftIdRef.current) throw new Error('No draft to publish');
      const result = await publishPool(draftIdRef.current, data);
      onPublished(result, data.poolName.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Publication failed';
      console.error('[publishPool] error:', e);
      if (msg.includes('already')) {
        setError('This pool may have already been published.');
      } else {
        setError('Could not publish your pool. ' + msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleRetrySave = () => doSave(data, step);

  if (loading) return <CenterSpinner label="Loading wizard…" />;

  return (
    <div className="min-h-screen safe-top">
      <WizardHeader
        title="Create a Pool"
        onBack={step > 1 ? handleBack : undefined}
        onClose={step === 1 ? onBack : undefined}
        right={<SaveIndicator state={saveState} onRetry={handleRetrySave} />}
      />
      <div className="max-w-app mx-auto px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <div className="max-w-app mx-auto px-5 py-6 pb-32">
        {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

        {step === 1 && (
          <Step1ChooseGame games={games} selectedGameId={data.gameId} onSelect={(gameId) => updateData({ gameId })} />
        )}
        {step === 2 && (
          <Step2PoolDetails data={data} selectedGame={selectedGame} update={updateData} />
        )}
        {step === 3 && (
          <Step3BoardRules data={data} update={updateData} selectedGame={selectedGame} />
        )}
        {step === 4 && (
          <Step4PrizeStructure data={data} update={updateData} />
        )}
        {step === 5 && (
          <Step5Review data={data} selectedGame={selectedGame} update={updateData} onEditStep={(s) => setStep(s)} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 safe-bottom z-30">
        <div className="max-w-app mx-auto px-5 py-4 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-5 h-5" />} onClick={handleBack}>Back</Button>
          ) : (
            <Button variant="ghost" onClick={onBack}>Cancel</Button>
          )}
          {step < 5 ? (
            <Button variant="primary" disabled={!isStepValid(step, data)} rightIcon={<ArrowRight className="w-5 h-5" />} onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button variant="primary" loading={publishing} disabled={!isStepValid(5, data)} leftIcon={<Check className="w-5 h-5" />} onClick={handlePublish}>
              Publish Pool
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'idle') return null;
  if (state === 'saving') return (
    <span className="flex items-center gap-1.5 text-ink-500 text-xs">
      <Save className="w-3.5 h-3.5 animate-pulse" /> Saving…
    </span>
  );
  if (state === 'saved') return (
    <span className="flex items-center gap-1.5 text-accent-400 text-xs animate-fade-in">
      <Check className="w-3.5 h-3.5" /> Saved
    </span>
  );
  return (
    <button onClick={onRetry} className="flex items-center gap-1.5 text-danger-400 text-xs hover:underline">
      <X className="w-3.5 h-3.5" /> Save failed · Retry
    </button>
  );
}
