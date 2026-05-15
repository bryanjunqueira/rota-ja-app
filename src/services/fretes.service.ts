/**
 * Fretes Service — Camada de serviço para fretes/cargas (Mobile)
 * 
 * Queries otimizadas com filtros server-side via Supabase.
 * Garante consistência: apenas fretes disponíveis e não aceitos.
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
  /**
   * Busca estatísticas do motorista (suporta múltiplos veículos)
   */
  async buscarEstatisticasMotorista(motoristaId: string, tiposVeiculo: string | string[]) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('status, tipo_veiculo, motorista_id')
        .or(`motorista_id.eq.${motoristaId},and(status.eq.disponivel,motorista_id.is.null)`);
      if (error) return { cargasDisponiveis: 0, cargasEmTransporte: 0, cargasTransportadas: 0 };

      // Compatibilidade: cada tipo de veículo carrega fretes daquele mesmo tipo
      // O motorista cadastra TODOS os veículos que possui, e vê cargas de cada um
      const hierarquia: Record<string, string[]> = {
        // Pesados
        'Bitrem': ['Bitrem'], 'Carreta': ['Carreta'], 'Carreta LS': ['Carreta LS'],
        'Rodotrem': ['Rodotrem'], 'Vanderleia': ['Vanderleia'],
        // Médios
        'Bitruck': ['Bitruck'], 'Truck': ['Truck'],
        // Leves
        '3x4': ['3x4'], 'Fiorino': ['Fiorino'], 'Toco': ['Toco'],
        // Legado (compatibilidade retroativa)
        'Van': ['Van'], 'Caminhonete': ['Caminhonete'],
      };
      // Combina compatibilidade de TODOS os veículos
      const tipos = Array.isArray(tiposVeiculo) ? tiposVeiculo : [tiposVeiculo];
      const todosCompativeis = new Set<string>();
      tipos.forEach(t => (hierarquia[t] || [t]).forEach(v => todosCompativeis.add(v)));

      return {
        cargasDisponiveis: data?.filter(f =>
          f.status === 'disponivel' &&
          f.motorista_id === null &&
          todosCompativeis.has(f.tipo_veiculo)
        ).length || 0,
        cargasEmTransporte: data?.filter(f =>
          ['aceito', 'em_transporte'].includes(f.status) &&
          f.motorista_id === motoristaId
        ).length || 0,
        cargasTransportadas: data?.filter(f =>
          f.status === 'entregue' &&
          f.motorista_id === motoristaId
        ).length || 0,
      };
    } catch { return { cargasDisponiveis: 0, cargasEmTransporte: 0, cargasTransportadas: 0 }; }
  },

  /**
   * Busca todas as cargas vinculadas ao motorista (histórico completo)
   */
  async buscarHistoricoMotorista(motoristaId: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select(`
          *,
          empresas ( nome_empresa, telefone, email, nome_responsavel )
        `)
        .eq('motorista_id', motoristaId)
        .order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Não foi possível carregar seu histórico.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  /**
   * Atualiza o status de uma carga (ex: iniciar transporte, finalizar entrega)
   */
  async atualizarStatusCarga(freteId: string, status: 'em_transporte' | 'entregue') {
    try {
      const updateData: any = { status };
      if (status === 'em_transporte') updateData.data_inicio_transporte = new Date().toISOString();
      if (status === 'entregue') updateData.data_entrega = new Date().toISOString();

      const { error } = await supabase
        .from('fretes')
        .update(updateData)
        .eq('id', freteId);
      
      if (error) return { success: false, error: 'Erro ao atualizar status.' };
      return { success: true };
    } catch { return { success: false, error: 'Erro inesperado.' }; }
  },

  /**
   * Busca cargas disponíveis para um tipo de veículo específico
   * Garante: status=disponivel AND motorista_id IS NULL
   */
  async buscarCargasDisponiveis(tipoVeiculo: string) {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select('id, user_id, origem_cidade, origem_estado, destino_cidade, destino_estado, valor_frete, data_coleta, prazo_entrega, peso, tipo_veiculo, volume, dimensao, pedagogio_incluso')
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .eq('tipo_veiculo', tipoVeiculo)
        .order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Não foi possível carregar cargas disponíveis.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  /**
   * Busca todos os fretes disponíveis (sem filtro de veículo)
   * com dados da empresa — GARANTE motorista_id IS NULL
   */
  async buscarTodosFretes() {
    try {
      const { data, error } = await supabase
        .from('fretes')
        .select(`
          id, user_id, origem_cidade, origem_estado, destino_cidade, destino_estado,
          valor_frete, peso, tipo_veiculo, data_coleta, prazo_entrega,
          status, volume, dimensao, pedagogio_incluso,
          endereco_retirada, numero_retirada, complemento_retirada, cep_retirada,
          endereco_entrega, numero_entrega, complemento_entrega, cep_entrega,
          data_aceite, data_inicio_transporte, data_entrega,
          empresas ( nome_empresa, telefone, email, nome_responsavel )
        `)
        .eq('status', 'disponivel')
        .is('motorista_id', null)
        .order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Erro ao carregar fretes.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  /**
   * Busca fretes com filtros server-side (para empresa e motorista)
   * Filtros: origem, destino, tipo de veículo
   * Sempre retorna apenas disponíveis e não aceitos
   */
  async buscarFretesComFiltros(filtros: {
    origemCidade?: string;
    origemEstado?: string;
    destinoCidade?: string;
    destinoEstado?: string;
    tipoVeiculo?: string;
  }) {
    try {
      let query = supabase
        .from('fretes')
        .select(`
          id, user_id, origem_cidade, origem_estado, destino_cidade, destino_estado,
          valor_frete, peso, tipo_veiculo, data_coleta, prazo_entrega,
          status, volume, dimensao, pedagogio_incluso,
          endereco_retirada, numero_retirada, complemento_retirada, cep_retirada,
          endereco_entrega, numero_entrega, complemento_entrega, cep_entrega,
          data_aceite, data_inicio_transporte, data_entrega,
          empresas ( nome_empresa, telefone, email, nome_responsavel )
        `)
        .eq('status', 'disponivel')
        .is('motorista_id', null);

      // Filtro por origem (cidade)
      if (filtros.origemCidade) {
        query = query.ilike('origem_cidade', `%${filtros.origemCidade}%`);
      }
      // Filtro por origem (estado)
      if (filtros.origemEstado) {
        query = query.eq('origem_estado', filtros.origemEstado);
      }
      // Filtro por destino (cidade)
      if (filtros.destinoCidade) {
        query = query.ilike('destino_cidade', `%${filtros.destinoCidade}%`);
      }
      // Filtro por destino (estado)
      if (filtros.destinoEstado) {
        query = query.eq('destino_estado', filtros.destinoEstado);
      }
      // Filtro por tipo de veículo
      if (filtros.tipoVeiculo && filtros.tipoVeiculo !== 'Todos') {
        query = query.eq('tipo_veiculo', filtros.tipoVeiculo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return { data: [], error: 'Erro ao buscar fretes.' };
      return { data: data || [] };
    } catch { return { data: [], error: 'Erro inesperado.' }; }
  },

  /**
   * Aceitar carga — Atualiza status atomicamente
   * Garante: só aceita se ainda estiver disponível e sem motorista
   */
  async aceitarCarga(freteId: string, motoristaId: string) {
    try {
      const { error } = await supabase
        .from('fretes')
        .update({ motorista_id: motoristaId, status: 'aceito', data_aceite: new Date().toISOString() })
        .eq('id', freteId)
        .eq('status', 'disponivel')
        .is('motorista_id', null);
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
            email,
            tipo_veiculo,
            placa_veiculo
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

  /**
   * Cria um novo frete (empresa) — mesma lógica do web CadastroFreteForm
   */
  async criarFrete(userId: string, dados: CriarFreteData) {
    try {
      // Buscar empresa_id pelo user_id (como no web)
      const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (empError || !empresa) {
        return { success: false, error: 'Não foi possível encontrar os dados da empresa.' };
      }

      const { error } = await supabase
        .from('fretes')
        .insert({
          empresa_id: empresa.id,
          user_id: userId,
          origem_cidade: dados.origemCidade,
          origem_estado: dados.origemEstado,
          destino_cidade: dados.destinoCidade,
          destino_estado: dados.destinoEstado,
          endereco_retirada: dados.enderecoRetirada,
          cep_retirada: dados.cepRetirada,
          numero_retirada: dados.numeroRetirada,
          complemento_retirada: dados.complementoRetirada || null,
          endereco_entrega: dados.enderecoEntrega,
          cep_entrega: dados.cepEntrega,
          numero_entrega: dados.numeroEntrega,
          complemento_entrega: dados.complementoEntrega || null,
          volume: dados.volume || null,
          dimensao: dados.dimensao || null,
          peso: dados.peso,
          data_coleta: dados.dataColeta,
          prazo_entrega: dados.prazoEntrega,
          tipo_veiculo: dados.tipoVeiculo,
          valor_frete: dados.valorFrete,
          pedagogio_incluso: dados.pedagogioIncluso,
        });

      if (error) {
        return { success: false, error: 'Erro ao cadastrar frete. Tente novamente.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Erro inesperado ao cadastrar frete.' };
    }
  },

  /**
   * Cancelar frete (Empresa)
   * A empresa desiste de realizar o frete.
   */
  async cancelarFrete(freteId: string, motivo: string, mensagem?: string) {
    try {
      const { error } = await supabase
        .from('fretes')
        .update({ 
          status: 'cancelado_empresa', 
          motivo_cancelamento: motivo,
          mensagem_cancelamento: mensagem || null,
          data_cancelamento: new Date().toISOString()
        })
        .eq('id', freteId);
      
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { 
      return { success: false, error: e.message || 'Erro inesperado.' }; 
    }
  },

  /**
   * Devolver frete (Motorista)
   * O motorista desiste de realizar o frete aceito.
   * O frete volta a ficar 'disponivel' para outros motoristas.
   */
  async devolverFrete(freteId: string, motivo: string, mensagem?: string) {
    try {
      const { error } = await supabase
        .from('fretes')
        .update({ 
          status: 'disponivel', 
          motorista_id: null,
          data_aceite: null,
          motivo_devolucao: motivo,
          mensagem_devolucao: mensagem || null,
          data_devolucao: new Date().toISOString()
        })
        .eq('id', freteId);
      
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { 
      return { success: false, error: e.message || 'Erro inesperado.' }; 
    }
  },
};
