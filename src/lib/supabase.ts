/**
 * Supabase Client — Configuração para React Native / Expo
 * 
 * Usa expo-secure-store para persistência de sessão no mobile.
 * SecureStore funciona no Expo Go (sem necessidade de build nativo)
 * e é mais seguro que AsyncStorage pois criptografa os dados.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ENV } from '@/config/env';

/**
 * Storage adapter usando expo-secure-store.
 * Compatível com a interface que o Supabase Auth espera.
 * 
 * Nota: SecureStore tem limite de 2KB por item no iOS,
 * mas tokens JWT do Supabase cabem tranquilamente.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
