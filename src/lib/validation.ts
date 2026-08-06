import type { WizardData } from './types';

export function validateStep1(data: WizardData): string | null {
  if (!data.gameId) return 'Select a game to continue';
  return null;
}

export function validateStep2(data: WizardData): string | null {
  const name = data.poolName.trim();
  if (!name) return 'Pool name is required';
  if (name.length > 80) return 'Pool name must be 80 characters or less';
  // Block markup — only allow plain text characters
  if (/[<>]/.test(name)) return 'Pool name cannot contain < or > characters';
  if (data.hostMessage.length > 500) return 'Host message must be 500 characters or less';
  if (data.squareValue) {
    const val = parseFloat(data.squareValue);
    if (isNaN(val) || val < 0) return 'Square value must be a positive number';
  }
  return null;
}

export function validateStep3(data: WizardData): string | null {
  if (data.maxSquaresPerUser < 1 || data.maxSquaresPerUser > 100) {
    return 'Max squares must be between 1 and 100';
  }
  if (data.lockMode !== 'full' && !data.lockAt) {
    return 'A lock time is required for scheduled lock mode';
  }
  return null;
}

export function validateStep4(data: WizardData): string | null {
  const total = data.payoutFirst + data.payoutSecond + data.payoutThird + data.payoutFourth;
  if (total !== 100) return `Prize percentages must total 100% (currently ${total}%)`;
  if ([data.payoutFirst, data.payoutSecond, data.payoutThird, data.payoutFourth].some(v => v < 0 || v > 100)) {
    return 'Each prize percentage must be between 0 and 100';
  }
  return null;
}

export function validateStep5(data: WizardData): string | null {
  if (!data.confirmRules) return 'Please confirm you reviewed the pool rules';
  if (!data.confirmNoMoney) return 'Please confirm you understand Lucky Squares does not handle money';
  const step2Err = validateStep2(data);
  if (step2Err) return step2Err;
  const step3Err = validateStep3(data);
  if (step3Err) return step3Err;
  const step4Err = validateStep4(data);
  if (step4Err) return step4Err;
  return null;
}

export function isStepValid(step: number, data: WizardData): boolean {
  switch (step) {
    case 1: return validateStep1(data) === null;
    case 2: return validateStep2(data) === null;
    case 3: return validateStep3(data) === null;
    case 4: return validateStep4(data) === null;
    case 5: return validateStep5(data) === null;
    default: return false;
  }
}

export function validateStep(step: number, data: WizardData): string | null {
  switch (step) {
    case 1: return validateStep1(data);
    case 2: return validateStep2(data);
    case 3: return validateStep3(data);
    case 4: return validateStep4(data);
    case 5: return validateStep5(data);
    default: return 'Unknown step';
  }
}

export function prizeTotal(data: WizardData): number {
  return data.payoutFirst + data.payoutSecond + data.payoutThird + data.payoutFourth;
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}
