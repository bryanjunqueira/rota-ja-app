/**
 * Tela Selecionar Perfil — redirecionada quando user logado não tem role
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function SelecionarPerfilScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{ fontSize: 48 }}>👤</Text>
        <Text style={styles.title}>Complete seu cadastro</Text>
        <Text style={styles.subtitle}>Selecione o tipo de conta para continuar</Text>
      </View>

      <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/(auth)/cadastro-motorista')} activeOpacity={0.8}>
        <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryFaded }]}>
          <Text style={{ fontSize: 32 }}>🚛</Text>
        </View>
        <Text style={styles.optionTitle}>Motorista</Text>
        <Text style={styles.optionDesc}>Encontre cargas e faça fretes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/(auth)/cadastro-empresa')} activeOpacity={0.8}>
        <View style={[styles.optionIcon, { backgroundColor: COLORS.accentFaded }]}>
          <Text style={{ fontSize: 32 }}>🏢</Text>
        </View>
        <Text style={styles.optionTitle}>Empresa</Text>
        <Text style={styles.optionDesc}>Publique cargas e encontre motoristas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.md },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: 4 },
  optionCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.md,
  },
  optionIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  optionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  optionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
});
