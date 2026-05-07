/**
 * Layout do grupo de autenticação (login, cadastro, etc.)
 * Sem header, tela cheia.
 */
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
