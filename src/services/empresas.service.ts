/**
 * Empresas Service — Camada de serviço para empresas
 * 
 * Centraliza todas as operações de dados de empresas.
 * Adaptado para o ambiente mobile (React Native).
 */
import { supabase } from '@/lib/supabase';

export interface CadastroEmpresaData {
  userId: string;
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
  email: string;
  telefone: string;
  nomeResponsavel: string;
  cargo: string;
}

export interface EmpresaData {
  id: string;
  user_id: string | null;
  nome_empresa: string;
  cnpj: string;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
  email: string;
  telefone: string;
  nome_responsavel: string;
  cargo: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const EmpresasService = {
  /**
   * Busca dados da empresa pelo user_id
   */
  async buscarPorUserId(userId: string): Promise<{ data: EmpresaData | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { data: null };
      }

      return { data };
    } catch (error) {
      return { data: null };
    }
  },

  /**
   * Busca apenas o ID da empresa pelo user_id
   */
  async buscarIdPorUserId(userId: string): Promise<{ empresaId: string | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.error('Erro ao buscar empresa:', error);
        return { empresaId: null, error: 'Não foi possível encontrar os dados da empresa.' };
      }

      return { empresaId: data.id };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { empresaId: null, error: 'Erro inesperado ao buscar empresa.' };
    }
  },

  /**
   * Cadastra uma nova empresa
   */
  async cadastrar(dados: CadastroEmpresaData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('empresas')
        .insert({
          user_id: dados.userId,
          nome_empresa: dados.nomeEmpresa,
          cnpj: dados.cnpj,
          endereco: dados.endereco,
          cep: dados.cep,
          cidade: dados.cidade,
          estado: dados.estado,
          email: dados.email,
          telefone: dados.telefone,
          nome_responsavel: dados.nomeResponsavel,
          cargo: dados.cargo,
        });

      if (error) {
        console.error('Erro ao salvar empresa:', error);
        return { success: false, error: 'Erro ao salvar dados da empresa.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { success: false, error: 'Erro inesperado ao cadastrar empresa.' };
    }
  },

  /**
   * Verifica status de aprovação da empresa
   */
  async verificarStatus(userId: string): Promise<{ status: string | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('status')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erro ao verificar status:', error);
        return { status: null, error: 'Erro ao verificar status da empresa.' };
      }

      return { status: data?.status || null };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { status: null, error: 'Erro inesperado.' };
    }
  },
};
