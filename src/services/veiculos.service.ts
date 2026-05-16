/**
 * Veículos Service — Gerenciamento de veículos do motorista
 * 
 * Suporta múltiplos veículos por motorista (relação 1:N).
 * Cada motorista pode cadastrar e gerenciar sua frota pessoal.
 */
import { supabase } from '@/lib/supabase';

export interface VeiculoData {
  id: string;
  motorista_id: string;
  tipo_veiculo: string;
  modelo: string;
  placa: string | null;
  tipo_carroceria: string;
  created_at: string;
}

export interface CriarVeiculoData {
  motoristaId: string;
  tipoVeiculo: string;
  modelo: string;
  placa?: string;
  tipoCarroceria: string;
}

export const VeiculosService = {
  /**
   * Lista todos os veículos do motorista
   */
  async listarPorMotorista(motoristaId: string): Promise<{ data: VeiculoData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('veiculos_motorista')
        .select('*')
        .eq('motorista_id', motoristaId)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: 'Erro ao carregar veículos.' };
      return { data: data || [] };
    } catch {
      return { data: [], error: 'Erro inesperado.' };
    }
  },

  /**
   * Adiciona um novo veículo ao motorista
   */
  async adicionar(dados: CriarVeiculoData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('veiculos_motorista')
        .insert({
          motorista_id: dados.motoristaId,
          tipo_veiculo: dados.tipoVeiculo,
          modelo: dados.modelo,
          placa: dados.placa || null,
          tipo_carroceria: dados.tipoCarroceria,
        });

      if (error) {
        console.error('Erro ao adicionar veículo:', error);
        return { success: false, error: 'Erro ao adicionar veículo.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Atualiza dados de um veículo
   */
  async atualizar(veiculoId: string, dados: Partial<{
    tipo_veiculo: string;
    modelo: string;
    placa: string;
    tipo_carroceria: string;
  }>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('veiculos_motorista')
        .update(dados)
        .eq('id', veiculoId);

      if (error) return { success: false, error: 'Erro ao atualizar veículo.' };
      return { success: true };
    } catch {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Remove um veículo do motorista
   */
  async remover(veiculoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('veiculos_motorista')
        .delete()
        .eq('id', veiculoId);

      if (error) return { success: false, error: 'Erro ao remover veículo.' };
      return { success: true };
    } catch {
      return { success: false, error: 'Erro inesperado.' };
    }
  },

  /**
   * Busca TODOS os tipos de veículos do motorista para filtro de cargas.
   * Combina duas fontes:
   *   1. Tabela veiculos_motorista (multi-veículos novos)
   *   2. Campo legado motoristas.tipo_veiculo (veículo do cadastro inicial)
   * Isso garante que o motorista NUNCA perca compatibilidade.
   */
  async buscarTiposVeiculos(motoristaId: string, legacyTipoVeiculo?: string): Promise<string[]> {
    try {
      const todosSet = new Set<string>();

      // 1. Fonte principal: tabela veiculos_motorista
      const { data, error } = await supabase
        .from('veiculos_motorista')
        .select('tipo_veiculo')
        .eq('motorista_id', motoristaId);

      console.log('[buscarTiposVeiculos] Tabela veiculos_motorista:', { motoristaId, data, error: error?.message });

      if (!error && data) {
        data.forEach(v => {
          if (v.tipo_veiculo) todosSet.add(v.tipo_veiculo.trim());
        });
      }

      // 2. Fonte legado: campo tipo_veiculo da tabela motoristas
      console.log('[buscarTiposVeiculos] Campo legado motoristas.tipo_veiculo:', legacyTipoVeiculo);
      if (legacyTipoVeiculo && legacyTipoVeiculo.trim()) {
        todosSet.add(legacyTipoVeiculo.trim());
      }

      const resultado = Array.from(todosSet);
      console.log('[buscarTiposVeiculos] RESULTADO FINAL:', resultado);
      return resultado;
    } catch (e) {
      console.error('[buscarTiposVeiculos] EXCEÇÃO:', e);
      // Em caso de erro, pelo menos retorna o legado
      if (legacyTipoVeiculo && legacyTipoVeiculo.trim()) {
        return [legacyTipoVeiculo.trim()];
      }
      return [];
    }
  },
};
