/**
 * Motoristas Service — Camada de serviço para motoristas
 * 
 * Centraliza todas as operações de dados de motoristas.
 * Adaptado para o ambiente mobile (React Native).
 */
import { supabase } from '@/lib/supabase';

export interface CadastroMotoristaData {
  userId: string;
  nomeCompleto: string;
  endereco: string;
  cep: string;
  email: string;
  celular: string;
  cnh: string;
  placaVeiculo: string;
  tipoVeiculo: string;
  tipoCarroceria: string;
  fotoCnhUrl?: string | null;
  fotoMotoristaUrl?: string | null;
}

export interface MotoristaData {
  id: string;
  user_id: string | null;
  nome_completo: string;
  endereco: string;
  cep: string;
  email: string;
  celular: string;
  cnh: string;
  placa_veiculo: string;
  tipo_veiculo: string;
  tipo_carroceria: string;
  foto_cnh_url: string | null;
  foto_motorista_url: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const MotoristasService = {
  /**
   * Busca dados do motorista pelo user_id
   */
  async buscarPorUserId(userId: string): Promise<{ data: MotoristaData | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // Silencioso — esperado quando user é empresa
        return { data: null };
      }

      return { data };
    } catch (error) {
      return { data: null };
    }
  },

  /**
   * Cadastra um novo motorista
   */
  async cadastrar(dados: CadastroMotoristaData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('motoristas')
        .insert({
          user_id: dados.userId,
          nome_completo: dados.nomeCompleto,
          endereco: dados.endereco,
          cep: dados.cep,
          email: dados.email,
          celular: dados.celular,
          cnh: dados.cnh,
          placa_veiculo: dados.placaVeiculo,
          tipo_veiculo: dados.tipoVeiculo,
          tipo_carroceria: dados.tipoCarroceria,
          foto_cnh_url: dados.fotoCnhUrl || null,
          foto_motorista_url: dados.fotoMotoristaUrl || null,
        });

      if (error) {
        console.error('Erro ao salvar motorista:', error);
        return { success: false, error: 'Erro ao salvar dados do motorista.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { success: false, error: 'Erro inesperado ao cadastrar motorista.' };
    }
  },

  /**
   * Atualiza status do motorista (admin)
   */
  async atualizarStatus(id: string, novoStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('motoristas')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return { success: false, error: 'Erro ao atualizar status do motorista.' };
    }
  },

  /**
   * Lista todos os motoristas (admin)
   */
  async listarTodos(): Promise<{ data: MotoristaData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [] };
    } catch (error) {
      console.error('Erro ao listar motoristas:', error);
      return { data: [], error: 'Erro ao carregar motoristas.' };
    }
  },

  /**
   * Atualiza dados do perfil do motorista
   */
  async atualizarPerfil(id: string, dados: Partial<{
    nome_completo: string; endereco: string; cep: string;
    celular: string; cnh: string; placa_veiculo: string;
    tipo_veiculo: string; tipo_carroceria: string;
    foto_motorista_url: string; foto_cnh_url: string;
  }>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('motoristas').update(dados).eq('id', id);
      if (error) return { success: false, error: 'Erro ao atualizar perfil.' };
      return { success: true };
    } catch {
      return { success: false, error: 'Erro inesperado.' };
    }
  },
};
