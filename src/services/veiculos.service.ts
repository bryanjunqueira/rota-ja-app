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
   * Busca tipos de veículos únicos do motorista (para filtro de cargas)
   */
  async buscarTiposVeiculos(motoristaId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('veiculos_motorista')
        .select('tipo_veiculo')
        .eq('motorista_id', motoristaId);

      if (error || !data) return [];
      return [...new Set(data.map(v => v.tipo_veiculo))];
    } catch {
      return [];
    }
  },
};
