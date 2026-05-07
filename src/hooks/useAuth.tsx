/**
 * Hook de autenticação — gerencia estado do usuário e sessão.
 * Provê contexto global de auth para todo o app.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/auth.service';
import { MotoristasService, MotoristaData } from '@/services/motoristas.service';
import { EmpresasService, EmpresaData } from '@/services/empresas.service';

type UserRole = 'motorista' | 'empresa' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  motorista: MotoristaData | null;
  empresa: EmpresaData | null;
  login: (email: string, password: string) => ReturnType<typeof AuthService.login>;
  signUp: (email: string, password: string) => ReturnType<typeof AuthService.signUp>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [motorista, setMotorista] = useState<MotoristaData | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);

  const detectRole = useCallback(async (userId: string) => {
    const { data: motData } = await MotoristasService.buscarPorUserId(userId);
    if (motData) {
      setRole('motorista');
      setMotorista(motData);
      setEmpresa(null);
      return;
    }
    const { data: empData } = await EmpresasService.buscarPorUserId(userId);
    if (empData) {
      setRole('empresa');
      setEmpresa(empData);
      setMotorista(null);
      return;
    }
    setRole(null);
    setMotorista(null);
    setEmpresa(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await detectRole(user.id);
  }, [user, detectRole]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) detectRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) detectRole(s.user.id);
      else {
        setRole(null);
        setMotorista(null);
        setEmpresa(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [detectRole]);

  const login = useCallback(async (email: string, password: string) => {
    return AuthService.login(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return AuthService.signUp(email, password);
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setSession(null);
    setRole(null);
    setMotorista(null);
    setEmpresa(null);
  }, []);

  return React.createElement(AuthContext.Provider, {
    value: { user, session, loading, role, motorista, empresa, login, signUp, logout, refreshProfile },
    children,
  });
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
