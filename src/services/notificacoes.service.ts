/**
 * Notificações Service (Mobile)
 */
import { supabase } from '@/lib/supabase';

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  frete_id?: string | null;
  conversa_id?: string | null;
}

export const NotificacoesService = {
  async carregar(userId: string, limite: number = 20) {
    try {
      const { data, error } = await supabase
        .from('notificacoes').select('*').eq('usuario_id', userId)
        .order('created_at', { ascending: false }).limit(limite);
      if (error) return { data: [] as Notificacao[], error: 'Erro ao carregar notificações.' };
      return { data: (data || []) as Notificacao[] };
    } catch { return { data: [] as Notificacao[], error: 'Erro inesperado.' }; }
  },

  async marcarComoLida(notificacaoId: string) {
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', notificacaoId);
      if (error) return { success: false, error: 'Erro ao marcar notificação.' };
      return { success: true };
    } catch { return { success: false, error: 'Erro inesperado.' }; }
  },

  async marcarTodasComoLidas(userId: string) {
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('usuario_id', userId).eq('lida', false);
      if (error) return { success: false, error: 'Erro ao marcar notificações.' };
      return { success: true };
    } catch { return { success: false, error: 'Erro inesperado.' }; }
  },

  subscribeToNew(onNew: (n: Notificacao) => void) {
    const channel = supabase.channel('notificacoes-mobile')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => { onNew(payload.new as Notificacao); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};
