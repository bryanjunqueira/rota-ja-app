/**
 * Configuração centralizada de variáveis de ambiente.
 * 
 * No Expo, variáveis com prefixo EXPO_PUBLIC_ são acessíveis
 * em runtime via process.env.EXPO_PUBLIC_*
 */

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente não encontrada: ${name}`);
  }
  return value;
}

export type PaymentsMode = 'sandbox' | 'stripe';

export const ENV = {
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_PROJECT_ID: getEnvVar('EXPO_PUBLIC_SUPABASE_PROJECT_ID'),
  /** sandbox = simulação no app | stripe = Checkout via Edge Function */
  PAYMENTS_MODE: (process.env.EXPO_PUBLIC_PAYMENTS_MODE === 'stripe'
    ? 'stripe'
    : 'sandbox') as PaymentsMode,
} as const;
