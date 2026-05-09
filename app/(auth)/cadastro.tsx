/**
 * Tela de Cadastro — escolha de tipo de usuário
 * Visual premium com gradiente, consistente com o novo login
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function CadastroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header com gradiente */}
      <LinearGradient
        colors={['#1976D2', '#2094F3', '#4DA9F5']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={styles.logoBadge}>
          <Ionicons name="person-add-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>Escolha como deseja usar o Rota Já</Text>
      </LinearGradient>

      {/* Opções */}
      <View style={styles.content}>
        <Text style={styles.question}>Como deseja usar o Rota Já?</Text>

        {/* Motorista */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(auth)/cadastro-motorista')}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryFaded }]}>
            <Ionicons name="car-sport" size={30} color={COLORS.primary} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Sou Motorista</Text>
            <Text style={styles.optionDesc}>Encontre cargas disponíveis e faça fretes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Empresa */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(auth)/cadastro-empresa')}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIcon, { backgroundColor: COLORS.accentFaded }]}>
            <Ionicons name="business" size={30} color={COLORS.accent} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Sou Empresa</Text>
            <Text style={styles.optionDesc}>Publique cargas e encontre motoristas</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Voltar ao login */}
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginBtn}>
          <Text style={styles.loginText}>Já tem conta? <Text style={styles.loginLink}>Faça login</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    paddingTop: 56, paddingBottom: 36, paddingHorizontal: SPACING.lg,
    alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  backBtn: {
    position: 'absolute', top: 50, left: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Content
  content: { flex: 1, padding: SPACING.lg, justifyContent: 'center' },
  question: {
    fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'center', marginBottom: SPACING.lg,
  },

  // Option cards — horizontal layout
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md,
  },
  optionIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  optionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 3 },

  loginBtn: { marginTop: SPACING.xl, alignItems: 'center' },
  loginText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  loginLink: { color: COLORS.primary, fontWeight: '600' },
});
