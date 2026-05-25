/**
 * Auth Service — Camada de serviço para autenticação
 * 
 * Centraliza toda a lógica de autenticação do Supabase.
 * Adaptado para o ambiente mobile (React Native).
 */
import { supabase } from '@/lib/supabase';
import { APP_URLS } from '@/config/urls';

export interface LoginResult {
  success: boolean;
  userId?: string;
  error?: string;
  isEmailNotConfirmed?: boolean;
}

export interface SignUpResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface EmpresaStatusResult {
  status: string | null;
  error?: string;
}

export interface PerfilStatusResult {
  role: 'motorista' | 'empresa' | null;
  status: string | null;
  error?: string;
}

export const AuthService = {
  /**
   * Login com email e senha
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        let isEmailNotConfirmed = false;

        if (error.message === 'Email not confirmed' || error.message.includes('Email not confirmed')) {
          errorMessage = 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.';
          isEmailNotConfirmed = true;
        } else if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
        }

        return { success: false, error: errorMessage, isEmailNotConfirmed };
      }

      return { success: true, userId: data.user?.id };
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    }
  },

  /**
   * Cadastro de novo usuário
   */
  async signUp(email: string, password: string): Promise<SignUpResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: APP_URLS.AUTH_REDIRECT.LOGIN,
        },
      });

      if (error) {
        let errorMessage = 'Erro ao criar conta. Tente novamente.';

        if (error.message?.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        } else if (error.message?.includes('Password')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message?.includes('Invalid email') || error.message?.includes('email_address_invalid')) {
          errorMessage = 'Email inválido. Verifique se o email está correto e tente novamente.';
        }

        return { success: false, error: errorMessage };
      }

      if (!data.user) {
        return { success: false, error: 'Não foi possível criar a conta. Tente novamente.' };
      }

      return { success: true, userId: data.user.id };
    } catch (error) {
      console.error('Erro inesperado no signup:', error);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    }
  },

  /**
   * Logout
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: 'Ocorreu um erro ao fazer logout. Tente novamente.' };
    }
  },

  /**
   * Reenviar email de confirmação
   */
  async resendConfirmation(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: APP_URLS.AUTH_REDIRECT.LOGIN,
        },
      });

      if (error) {
        return { success: false, error: 'Erro ao reenviar email. Tente novamente.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro inesperado ao reenviar:', error);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    }
  },

  /**
   * Confirma o email pelo codigo OTP enviado no cadastro.
   */
  async verifySignupOtp(email: string, token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        return { success: false, error: 'Codigo invalido ou expirado. Confira o email e tente novamente.' };
      }

      return { success: true, userId: data.user?.id };
    } catch (error) {
      console.error('Erro inesperado ao confirmar codigo:', error);
      return { success: false, error: 'Erro inesperado ao confirmar email.' };
    }
  },

  /**
   * Apos confirmar email, avisa o dono do app para aprovar/rejeitar o perfil.
   */
  async solicitarAprovacaoCadastro(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-approval-email');
      if (error) {
        return { success: false, error: error.message };
      }

      const payload = data as { success?: boolean; error?: string } | null;
      if (payload?.error) {
        return { success: false, error: payload.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao solicitar aprovacao:', error);
      return { success: false, error: 'Nao foi possivel enviar o cadastro para analise.' };
    }
  },

  /**
   * Enviar email de recuperação de senha
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: APP_URLS.AUTH_REDIRECT.REDEFINIR_SENHA,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      return { success: false, error: error.message || 'Erro ao enviar email de recuperação.' };
    }
  },

  /**
   * Atualizar senha do usuário (após reset)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      return { success: false, error: error.message || 'Erro ao redefinir senha.' };
    }
  },

  /**
   * Obtém o usuário autenticado atual
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Obtém a sessão atual
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  /**
   * Listener de mudanças de estado de autenticação
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Verifica status de aprovação da empresa para o user logado
   */
  async verificarStatusEmpresa(userId: string): Promise<EmpresaStatusResult> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('status')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erro ao verificar status da empresa:', error);
        return { status: null, error: 'Erro ao verificar dados da empresa. Tente novamente.' };
      }

      return { status: data?.status || null };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { status: null, error: 'Erro inesperado ao verificar status.' };
    }
  },

  /**
   * Verifica o status real do perfil, independente do tipo selecionado na tela.
   */
  async verificarStatusPerfil(userId: string): Promise<PerfilStatusResult> {
    try {
      const { data: motorista, error: motError } = await supabase
        .from('motoristas')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (motError) {
        return { role: null, status: null, error: 'Erro ao verificar perfil.' };
      }

      if (motorista) {
        return { role: 'motorista', status: motorista.status || 'pendente' };
      }

      const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (empError) {
        return { role: null, status: null, error: 'Erro ao verificar perfil.' };
      }

      if (empresa) {
        return { role: 'empresa', status: empresa.status || 'pendente' };
      }

      return { role: null, status: null, error: 'Perfil nao encontrado.' };
    } catch (error) {
      console.error('Erro inesperado ao verificar perfil:', error);
      return { role: null, status: null, error: 'Erro inesperado ao verificar perfil.' };
    }
  },
};
