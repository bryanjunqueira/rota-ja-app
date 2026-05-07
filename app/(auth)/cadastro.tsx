/**
 * Tela de Cadastro — escolha de tipo de usuário
 * Redireciona para cadastro-motorista ou cadastro-empresa.
 * Alinhado ao fluxo do web (Link no login → cadastro direto).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function CadastroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🚛</Text>
        </View>
        <Text style={styles.title}>ROTA JÁ</Text>
        <Text style={styles.subtitle}>Crie sua conta</Text>
      </View>

      <Text style={styles.question}>Como deseja usar o Rota Já?</Text>

      {/* Motorista */}
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => router.push('/(auth)/cadastro-motorista')}
        activeOpacity={0.8}
      >
        <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryFaded }]}>
          <Text style={{ fontSize: 32 }}>🚛</Text>
        </View>
        <Text style={styles.optionTitle}>Sou Motorista</Text>
        <Text style={styles.optionDesc}>Encontre cargas disponíveis e faça fretes</Text>
      </TouchableOpacity>

      {/* Empresa */}
      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => router.push('/(auth)/cadastro-empresa')}
        activeOpacity={0.8}
      >
        <View style={[styles.optionIcon, { backgroundColor: COLORS.accentFaded }]}>
          <Text style={{ fontSize: 32 }}>🏢</Text>
        </View>
        <Text style={styles.optionTitle}>Sou Empresa</Text>
        <Text style={styles.optionDesc}>Publique cargas e encontre motoristas</Text>
      </TouchableOpacity>

      {/* Voltar ao login */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Já tem conta? <Text style={styles.backLink}>Faça login</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoContainer: {
    width: 56, height: 56, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.md,
  },
  logoIcon: { fontSize: 30 },
  title: { fontSize: FONT_SIZES.title, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  question: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.lg, textAlign: 'center' },

  optionCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.md,
  },
  optionIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  optionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  optionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

  backBtn: { marginTop: SPACING.lg, alignItems: 'center' },
  backText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  backLink: { color: COLORS.primary, fontWeight: '600' },
});
