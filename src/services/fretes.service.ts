/**
 * Fretes Service — Camada de serviço para fretes/cargas (Mobile)
 */
import { supabase } from '@/lib/supabase';

export interface CriarFreteData {
  empresaId: string;
  userId: string;
  origemCidade: string;
  origemEstado: string;
  destinoCidade: string;
  destinoEstado: string;
  enderecoRetirada: string;
  cepRetirada: string;
  numeroRetirada: string;
  complementoRetirada?: string;
  enderecoEntrega: string;
  cepEntrega: string;
  numeroEntrega: string;
  complementoEntrega?: string;
  volume?: string;
  dimensao?: string;
  peso: number;
  dataColeta: string;
  prazoEntrega: string;
  tipoVeiculo: string;
  valorFrete: number;
  pedagogioIncluso: boolean;
}

export interface FreteData {
  id: string;
  empresa_id: string;
  user_id: string;
  origem_cidade: string;
  origem_estado: string;
  destino_cidade: string;
  destino_estado: string;
  valor_frete: number;
  peso: number;
  tipo_veiculo: string;
  data_coleta: string;
  prazo_entrega: string;
  pedagogio_incluso: boolean;
  status: string;
  motorista_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const FretesService = {
  async buscarEstatisticasMotorista(motoristaId: string, tipoVeiculo: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('status, tipo_veiculo, motorista_id')
        .or(`motorista_id.eq.${motoristaId},and(status.eq.disponivel,tipo_veiculo.eq.${tipoVeiculo})`);
      if (error) return { cargasDisponiveis: 0, cargasEmTransporte: 0, cargasTransportadas: 0 };
      return {
        cargasDisponiveis: data?.filter(f => f.status === 'disponivel' && f.tipo_veiculo === tipoVeiculo).length || 0,
        cargasEmTransporte: data?.filter(f => ['aceito', 'em_transporte'].includes(f.status) && f.motorista_id === motoristaId).length || 0,
        cargasTransportadas: data?.filter(f => f.status === 'entregue' && f.motorista_id === motoristaId).length || 0,
      };
    } catch { return { cargasDisponiveis: 0, cargasEmTransporte: 0, cargasTransportadas: 0 }; }
  },

  async buscarCargasAtivas(motoristaId: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('id, origem_cidade, origem_estado, destino_cidade, destino_estado, valor_frete, data_coleta, prazo_entrega, status, peso, tipo_veiculo')
        .eq('motorista_id', motoristaId)
        .in('status', ['aceito', 'em_transporte']);
      if (error) return { data: [], error: 'Não foi possível carregar as cargas ativas.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  async buscarCargasDisponiveis(tipoVeiculo: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('id, origem_cidade, origem_estado, destino_cidade, destino_estado, valor_frete, data_coleta, prazo_entrega, peso, tipo_veiculo, volume, dimensao, pedagogio_incluso')
        .eq('status', 'disponivel')
        .eq('tipo_veiculo', tipoVeiculo)
        .order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Não foi possível carregar cargas disponíveis.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  async aceitarCarga(freteId: string, motoristaId: string) {
    try {
      const { error } = await supabase
        .from('fretes')
        .update({ motorista_id: motoristaId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freteId)
        .eq('status', 'disponivel');
      if (error) return { success: false, error: 'Carga já foi aceita por outro motorista.' };
      return { success: true };
    } catch { return { success: false, error: 'Erro inesperado ao aceitar carga.' }; }
  },

  /**
   * Busca fretes criados pela empresa (mesmo query do web PerfilEmpresa)
   */
  async buscarFretesEmpresa(userId: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select(`
          *,
          motoristas (
            nome_completo,
            celular,
            email
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Não foi possível carregar seus fretes.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  /**
   * Estatísticas da empresa (contagem por status)
   */
  async buscarEstatisticasEmpresa(userId: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('status')
        .eq('user_id', userId);
      if (error || !data) return { total: 0, ativos: 0, andamento: 0, finalizados: 0 };
      return {
        total: data.length,
        ativos: data.filter(f => f.status === 'disponivel').length,
        andamento: data.filter(f => f.status === 'aceito' || f.status === 'em_transporte').length,
        finalizados: data.filter(f => f.status === 'entregue').length,
      };
    } catch { return { total: 0, ativos: 0, andamento: 0, finalizados: 0 }; }
  },
};
