/**
 * Assinaturas Service — Camada de serviço para assinaturas e planos
 *
 * Centraliza toda a lógica de negócio de assinaturas:
 * - Criação automática de trial
 * - Verificação de status
 * - Processamento de pagamento (sandbox)
 * - Upgrade/downgrade
 * - Cancelamento e expiração
 * - Simulação de cenários para testes
 */
import { supabase } from '@/lib/supabase';
import {
  type PlanTier,
  type UserGroup,
  type SubscriptionStatus,
  type PaymentStatus,
  type PaymentMethod,
  type PlanPermissions,
  TRIAL_DURATION_DAYS,
  getPlan,
  getPermissions,
  TIER_ORDER,
} from '@/config/plans';

// ═══════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════

export interface AssinaturaData {
  id: string;
  user_id: string;
  tipo_usuario: UserGroup;
  tipo_plano: PlanTier;
  status_assinatura: SubscriptionStatus;
  trial_inicio: string | null;
  trial_fim: string | null;
  assinatura_inicio: string | null;
  assinatura_fim: string | null;
  status_pagamento: PaymentStatus;
  metodo_pagamento: PaymentMethod | null;
  renovacao_automatica: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  ultimo_pagamento: string | null;
  proximo_pagamento: string | null;
  historico_planos: Array<{
    plano: PlanTier;
    data: string;
    acao: string;
  }>;
  created_at: string;
  updated_at: string;
}

export type SandboxScenario =
  | 'aprovado'
  | 'recusado'
  | 'cancelado'
  | 'expirado'
  | 'renovado'
  | 'falha_pagamento';

// ═══════════════════════════════════════════════════
// SERVIÇO
// ═══════════════════════════════════════════════════

export const AssinaturasService = {
  /**
   * Cria trial automático de 7 dias para novo usuário.
   * Chamado automaticamente no cadastro de motorista/empresa.
   */
  async criarTrialAutomatico(
    userId: string,
    tipoUsuario: UserGroup
  ): Promise<{ success: boolean; data?: AssinaturaData; error?: string }> {
    try {
      // Verifica se já existe assinatura
      const { data: existing } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return { success: true }; // Já tem assinatura, não cria novamente
      }

      const agora = new Date();
      const fimTrial = new Date(agora);
      fimTrial.setDate(fimTrial.getDate() + TRIAL_DURATION_DAYS);

      const { data, error } = await supabase
        .from('assinaturas')
        .insert({
          user_id: userId,
          tipo_usuario: tipoUsuario,
          tipo_plano: 'gratuito',
          status_assinatura: 'trial',
          trial_inicio: agora.toISOString(),
          trial_fim: fimTrial.toISOString(),
          status_pagamento: 'pendente',
          renovacao_automatica: true,
          historico_planos: [
            {
              plano: 'gratuito',
              data: agora.toISOString(),
              acao: 'trial_criado',
            },
          ],
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Se for violação de chave única (código 23505), significa que outro processo
          // paralelo já inseriu a assinatura nesse meio tempo. Retornamos sucesso com os dados existentes.
          const { data: existingAfterError } = await supabase
            .from('assinaturas')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          return { success: true, data: existingAfterError || undefined };
        }
        console.error('Erro ao criar trial:', error);
        return { success: false, error: 'Erro ao criar período de teste.' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Erro inesperado ao criar trial:', error);
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Busca dados da assinatura do usuário.
   */
  async buscarAssinatura(
    userId: string
  ): Promise<{ data: AssinaturaData | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        return { data: null, error: 'Erro ao buscar assinatura.' };
      }

      return { data };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { data: null, error: 'Erro inesperado.' };
    }
  },

  /**
   * Verifica status da assinatura e atualiza automaticamente se necessário.
   * Retorna status atualizado e se precisa redirecionar para planos.
   */
  async verificarStatus(
    userId: string
  ): Promise<{
    data: AssinaturaData | null;
    needsUpgrade: boolean;
    isTrialExpired: boolean;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return { data: null, needsUpgrade: false, isTrialExpired: false, error: error?.message };
      }

      const agora = new Date();

      // ── Verificar trial expirado ──
      if (
        data.status_assinatura === 'trial' &&
        data.trial_fim &&
        agora > new Date(data.trial_fim)
      ) {
        // Trial expirou — atualizar para expirado
        const { data: updated } = await supabase
          .from('assinaturas')
          .update({
            status_assinatura: 'expirado',
            historico_planos: [
              ...(data.historico_planos || []),
              {
                plano: data.tipo_plano,
                data: agora.toISOString(),
                acao: 'trial_expirado',
              },
            ],
          })
          .eq('user_id', userId)
          .select()
          .single();

        return {
          data: updated || data,
          needsUpgrade: true,
          isTrialExpired: true,
        };
      }

      // ── Verificar assinatura paga expirada ──
      if (
        data.status_assinatura === 'ativo' &&
        data.assinatura_fim &&
        agora > new Date(data.assinatura_fim)
      ) {
        // Assinatura expirou
        const { data: updated } = await supabase
          .from('assinaturas')
          .update({
            status_assinatura: 'expirado',
            tipo_plano: 'gratuito',
            historico_planos: [
              ...(data.historico_planos || []),
              {
                plano: data.tipo_plano,
                data: agora.toISOString(),
                acao: 'assinatura_expirada',
              },
            ],
          })
          .eq('user_id', userId)
          .select()
          .single();

        return {
          data: updated || data,
          needsUpgrade: true,
          isTrialExpired: false,
        };
      }

      // Status normal
      const needsUpgrade =
        data.status_assinatura === 'expirado' ||
        data.status_assinatura === 'cancelado' ||
        data.status_assinatura === 'inadimplente';

      return {
        data,
        needsUpgrade,
        isTrialExpired: false,
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return { data: null, needsUpgrade: false, isTrialExpired: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Processa pagamento (sandbox).
   * Em produção, será substituído por integração Stripe.
   */
  async processarPagamento(
    userId: string,
    novoPlano: PlanTier,
    metodoPagamento: PaymentMethod,
    cenarioSandbox: SandboxScenario = 'aprovado',
    tipoUsuario?: UserGroup
  ): Promise<{ success: boolean; data?: AssinaturaData; error?: string }> {
    try {
      const agora = new Date();

      // Buscar assinatura atual
      const { data: fetched } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let current = fetched;

      if (!current) {
        // Tenta descobrir o tipo de usuário para criar a assinatura automaticamente se ela não existir
        let resolvedUserGroup: UserGroup = tipoUsuario || 'motorista';
        if (!tipoUsuario) {
          const { data: mot } = await supabase
            .from('motoristas')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (mot) {
            resolvedUserGroup = 'motorista';
          } else {
            const { data: emp } = await supabase
              .from('empresas')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();
            if (emp) {
              resolvedUserGroup = 'empresa';
            }
          }
        }

        const fimTrial = new Date(agora);
        fimTrial.setDate(fimTrial.getDate() + TRIAL_DURATION_DAYS);

        // Criar registro inicial automaticamente
        const { data: created, error: createErr } = await supabase
          .from('assinaturas')
          .insert({
            user_id: userId,
            tipo_usuario: resolvedUserGroup,
            tipo_plano: 'gratuito',
            status_assinatura: 'trial',
            trial_inicio: agora.toISOString(),
            trial_fim: fimTrial.toISOString(),
            status_pagamento: 'pendente',
            renovacao_automatica: true,
            historico_planos: [
              {
                plano: 'gratuito',
                data: agora.toISOString(),
                acao: 'auto_criado_no_pagamento',
              },
            ],
          })
          .select()
          .single();

        if (createErr || !created) {
          if (createErr && createErr.code === '23505') {
            // Se for violação de chave única (código 23505), significa que outro processo
            // paralelo já inseriu a assinatura nesse meio tempo.
            const { data: existingAfterErr } = await supabase
              .from('assinaturas')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            if (existingAfterErr) {
              current = existingAfterErr;
            } else {
              return { success: false, error: 'Erro de concorrência ao inicializar assinatura.' };
            }
          } else {
            return {
              success: false,
              error: `Erro ao inicializar registro de assinatura: ${createErr?.message || 'Falha na inserção'}`,
            };
          }
        } else {
          current = created;
        }
      }

      // ── SANDBOX: Simular cenários ──
      switch (cenarioSandbox) {
        case 'aprovado': {
          const fimAssinatura = new Date(agora);
          fimAssinatura.setMonth(fimAssinatura.getMonth() + 1); // +1 mês

          const planoAnterior = current.tipo_plano;
          const acao =
            TIER_ORDER[novoPlano] > TIER_ORDER[planoAnterior as PlanTier]
              ? 'upgrade'
              : TIER_ORDER[novoPlano] < TIER_ORDER[planoAnterior as PlanTier]
              ? 'downgrade'
              : 'ativacao';

          const { data: updated, error } = await supabase
            .from('assinaturas')
            .update({
              tipo_plano: novoPlano,
              tipo_usuario: tipoUsuario || current.tipo_usuario,
              status_assinatura: 'ativo',
              status_pagamento: 'aprovado',
              metodo_pagamento: metodoPagamento,
              assinatura_inicio: agora.toISOString(),
              assinatura_fim: fimAssinatura.toISOString(),
              ultimo_pagamento: agora.toISOString(),
              proximo_pagamento: fimAssinatura.toISOString(),
              historico_planos: [
                ...(current.historico_planos || []),
                {
                  plano: novoPlano,
                  data: agora.toISOString(),
                  acao,
                },
              ],
            })
            .eq('user_id', userId)
            .select()
            .single();

          if (error) {
            return { success: false, error: 'Erro ao processar pagamento.' };
          }

          return { success: true, data: updated };
        }

        case 'recusado':
          await supabase
            .from('assinaturas')
            .update({
              status_pagamento: 'recusado',
              historico_planos: [
                ...(current.historico_planos || []),
                {
                  plano: novoPlano,
                  data: agora.toISOString(),
                  acao: 'pagamento_recusado',
                },
              ],
            })
            .eq('user_id', userId);

          return { success: false, error: 'Pagamento recusado pela operadora.' };

        case 'falha_pagamento':
          await supabase
            .from('assinaturas')
            .update({
              status_assinatura: 'inadimplente',
              status_pagamento: 'recusado',
              historico_planos: [
                ...(current.historico_planos || []),
                {
                  plano: current.tipo_plano,
                  data: agora.toISOString(),
                  acao: 'falha_pagamento',
                },
              ],
            })
            .eq('user_id', userId);

          return { success: false, error: 'Falha no processamento do pagamento.' };

        default:
          return { success: false, error: 'Cenário sandbox inválido.' };
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Atualiza plano do usuário (upgrade/downgrade).
   * Chamado após pagamento aprovado.
   */
  async atualizarPlano(
    userId: string,
    novoPlano: PlanTier
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: current } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!current) {
        return { success: false, error: 'Assinatura não encontrada.' };
      }

      const agora = new Date();
      const fimAssinatura = new Date(agora);
      fimAssinatura.setMonth(fimAssinatura.getMonth() + 1);

      const acao =
        TIER_ORDER[novoPlano] > TIER_ORDER[current.tipo_plano as PlanTier]
          ? 'upgrade'
          : 'downgrade';

      const { error } = await supabase
        .from('assinaturas')
        .update({
          tipo_plano: novoPlano,
          status_assinatura: 'ativo',
          assinatura_inicio: agora.toISOString(),
          assinatura_fim: fimAssinatura.toISOString(),
          historico_planos: [
            ...(current.historico_planos || []),
            {
              plano: novoPlano,
              data: agora.toISOString(),
              acao,
            },
          ],
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: 'Erro ao atualizar plano.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Cancela a assinatura do usuário.
   * Reverte para plano gratuito.
   */
  async cancelarAssinatura(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: current } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!current) {
        return { success: false, error: 'Assinatura não encontrada.' };
      }

      const agora = new Date();

      const { error } = await supabase
        .from('assinaturas')
        .update({
          tipo_plano: 'gratuito',
          status_assinatura: 'cancelado',
          status_pagamento: 'cancelado',
          renovacao_automatica: false,
          historico_planos: [
            ...(current.historico_planos || []),
            {
              plano: current.tipo_plano,
              data: agora.toISOString(),
              acao: 'cancelado',
            },
          ],
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: 'Erro ao cancelar assinatura.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Simula renovação automática (sandbox).
   */
  async renovarAssinatura(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: current } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!current) {
        return { success: false, error: 'Assinatura não encontrada.' };
      }

      if (!current.renovacao_automatica) {
        return { success: false, error: 'Renovação automática desativada.' };
      }

      const agora = new Date();
      const novoFim = new Date(agora);
      novoFim.setMonth(novoFim.getMonth() + 1);

      const { error } = await supabase
        .from('assinaturas')
        .update({
          status_assinatura: 'ativo',
          status_pagamento: 'aprovado',
          assinatura_inicio: agora.toISOString(),
          assinatura_fim: novoFim.toISOString(),
          ultimo_pagamento: agora.toISOString(),
          proximo_pagamento: novoFim.toISOString(),
          historico_planos: [
            ...(current.historico_planos || []),
            {
              plano: current.tipo_plano,
              data: agora.toISOString(),
              acao: 'renovacao',
            },
          ],
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: 'Erro ao renovar.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Simula expiração imediata (sandbox — para testes).
   */
  async simularExpiracao(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: current } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!current) {
        return { success: false, error: 'Assinatura não encontrada.' };
      }

      const agora = new Date();

      const { error } = await supabase
        .from('assinaturas')
        .update({
          tipo_plano: 'gratuito',
          status_assinatura: 'expirado',
          status_pagamento: 'pendente',
          historico_planos: [
            ...(current.historico_planos || []),
            {
              plano: current.tipo_plano,
              data: agora.toISOString(),
              acao: 'expirado_simulado',
            },
          ],
        })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: 'Erro ao simular expiração.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Retorna permissões baseadas no plano e tipo de usuário.
   */
  getPermissionsForPlan(
    tipoUsuario: UserGroup,
    tipoPlano: PlanTier
  ): PlanPermissions {
    return getPermissions(tipoUsuario, tipoPlano);
  },

  /**
   * Calcula dias restantes do trial ou assinatura.
   */
  calcularDiasRestantes(assinatura: AssinaturaData): number {
    if (!assinatura) return 0;

    const agora = new Date();
    let dataFim: Date | null = null;

    if (assinatura.status_assinatura === 'trial' && assinatura.trial_fim) {
      dataFim = new Date(assinatura.trial_fim);
    } else if (assinatura.status_assinatura === 'ativo' && assinatura.assinatura_fim) {
      dataFim = new Date(assinatura.assinatura_fim);
    }

    if (!dataFim) return 0;

    const diff = dataFim.getTime() - agora.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },
};
