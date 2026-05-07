/**
 * Selecionar Perfil — com ícones Ionicons
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function SelecionarPerfilScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add-outline" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Complete seu cadastro</Text>
        <Text style={styles.subtitle}>Selecione o tipo de conta para continuar</Text>
      </View>

      <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/(auth)/cadastro-motorista')} activeOpacity={0.8}>
        <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryFaded }]}>
          <Ionicons name="car-sport-outline" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.optionTitle}>Motorista</Text>
        <Text style={styles.optionDesc}>Encontre cargas e faça fretes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/(auth)/cadastro-empresa')} activeOpacity={0.8}>
        <View style={[styles.optionIcon, { backgroundColor: COLORS.accentFaded }]}>
          <Ionicons name="business-outline" size={28} color={COLORS.accent} />
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
  headerIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
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
