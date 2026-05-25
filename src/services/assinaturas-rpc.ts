/**
 * Chamadas RPC seguras para assinaturas (Supabase).
 * Requer migration_security_plans.sql aplicada no projeto.
 */
import { supabase } from '@/lib/supabase';
import type { AssinaturaData } from './assinaturas.service';

type RpcResult<T> = { success: boolean; data?: T; error?: string };

function mapRpcError(message: string): string {
  if (message.includes('does not exist') || message.includes('Could not find the function')) {
    return 'Execute o script src/config/migration_security_plans.sql no Supabase SQL Editor.';
  }
  return message;
}

function parseAssinaturaRow(raw: unknown): AssinaturaData | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as AssinaturaData;
}

export async function rpcSyncAssinaturaStatus(): Promise<{
  data: AssinaturaData | null;
  needsUpgrade: boolean;
  isTrialExpired: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('sync_assinatura_status');

  if (error) {
    return {
      data: null,
      needsUpgrade: false,
      isTrialExpired: false,
      error: mapRpcError(error.message),
    };
  }

  const payload = data as {
    data: AssinaturaData | null;
    needs_upgrade: boolean;
    is_trial_expired: boolean;
  };

  return {
    data: parseAssinaturaRow(payload?.data),
    needsUpgrade: !!payload?.needs_upgrade,
    isTrialExpired: !!payload?.is_trial_expired,
  };
}

export async function rpcProcessarPagamento(
  novoPlano: string,
  metodoPagamento: string,
  cenario: string
): Promise<RpcResult<AssinaturaData>> {
  const { data, error } = await supabase.rpc('processar_assinatura_pagamento', {
    p_novo_plano: novoPlano,
    p_metodo_pagamento: metodoPagamento,
    p_cenario: cenario,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  const payload = data as { success: boolean; data?: AssinaturaData; error?: string };
  const parsed = parseAssinaturaRow(payload?.data);
  return {
    success: !!payload?.success,
    data: parsed ?? undefined,
    error: payload?.error,
  };
}

export async function rpcCancelarAssinatura(): Promise<RpcResult<AssinaturaData>> {
  const { data, error } = await supabase.rpc('cancelar_minha_assinatura');
  if (error) return { success: false, error: mapRpcError(error.message) };
  const payload = data as { success: boolean; data?: AssinaturaData };
  const parsed = parseAssinaturaRow(payload?.data);
  return { success: !!payload?.success, data: parsed ?? undefined };
}

export async function rpcRenovarAssinatura(): Promise<RpcResult<AssinaturaData>> {
  const { data, error } = await supabase.rpc('renovar_minha_assinatura');
  if (error) return { success: false, error: mapRpcError(error.message) };
  const payload = data as { success: boolean; data?: AssinaturaData; error?: string };
  const parsed = parseAssinaturaRow(payload?.data);
  return {
    success: !!payload?.success,
    data: parsed ?? undefined,
    error: payload?.error,
  };
}

export async function rpcSimularExpiracao(): Promise<RpcResult<AssinaturaData>> {
  const { data, error } = await supabase.rpc('simular_expiracao_assinatura');
  if (error) return { success: false, error: mapRpcError(error.message) };
  const payload = data as { success: boolean; data?: AssinaturaData };
  const parsed = parseAssinaturaRow(payload?.data);
  return { success: !!payload?.success, data: parsed ?? undefined };
}
