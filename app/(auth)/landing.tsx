/**
 * Landing Page — Tela inicial do app adaptada do web
 * Visual premium com gradientes, stats e parceiros
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const LOGO_IMG = require('../../src/logo/WhatsApp_Image_2026-05-13_at_16.08.56_Nero_AI_Image_Upscaler_Photo_Face-removebg-preview.png');

const { width } = Dimensions.get('window');

const STATS = [
  { value: '50K+', label: 'Motoristas', color: COLORS.primary },
  { value: '15K+', label: 'Empresas', color: COLORS.accent },
  { value: '1M+', label: 'Fretes', color: '#10B981' },
];

const PARTNERS = [
  { icon: 'construct-outline' as const, title: 'Borracharia 24h', desc: 'Atendimento em rodovias', color: '#EF4444', bg: '#FEE2E2' },
  { icon: 'cog-outline' as const, title: 'Mecânica Diesel', desc: 'Motores pesados', color: '#3B82F6', bg: '#DBEAFE' },
  { icon: 'car-outline' as const, title: 'Mecânica Leves', desc: 'Veículos utilitários', color: '#10B981', bg: '#D1FAE5' },
  { icon: 'restaurant-outline' as const, title: 'Restaurantes', desc: 'Refeições na estrada', color: '#F59E0B', bg: '#FEF3C7' },
  { icon: 'speedometer-outline' as const, title: 'Postos Parceiros', desc: 'Preços especiais', color: '#8B5CF6', bg: '#EDE9FE' },
];

const FEATURES = [
  { icon: 'navigate-outline' as const, title: 'Mapeamento Inteligente', desc: 'Rotas e fretes próximos à sua localização', color: COLORS.primary },
  { icon: 'shield-checkmark-outline' as const, title: 'Segurança Total', desc: 'Verificação de identidade e avaliações', color: COLORS.accent },
  { icon: 'flash-outline' as const, title: 'Rapidez e Eficiência', desc: 'Conecte-se com motoristas e cargas em tempo real', color: '#10B981' },
];

export default function LandingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(STATS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    statsAnim.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1, duration: 600, delay: 400 + i * 150, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ─── Hero Section ─── */}
        <LinearGradient
          colors={['#1565C0', '#1976D2', '#4DA9F5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Header Superior com Perfil e Planos */}
          <View style={styles.landingHeader}>
            <View style={styles.headerProfile}>
              <View style={styles.profileCircle}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.headerWelcome}>Bem-vindo 👋</Text>
            </View>
            <TouchableOpacity style={styles.crownBtn} activeOpacity={0.7} onPress={() => router.push('/planos')}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.crownCircle}>
                <Ionicons name="ribbon" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.creativeLogoContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.glassContainer}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.glassInnerGlow}>
                  <Image source={LOGO_IMG} style={styles.mainLogo} resizeMode="contain" />
                </View>
              </LinearGradient>
            </View>
            
            <Text style={styles.heroTagline}>Conectando Cargas e Destinos</Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroDesc}>
              A plataforma definitiva para transportes inteligentes no Brasil
            </Text>
          </Animated.View>

          {/* Stats flutuantes */}
          <View style={styles.statsRow}>
            {STATS.map((stat, i) => (
              <Animated.View
                key={stat.label}
                style={[styles.statCard, { opacity: statsAnim[i], transform: [{ scale: statsAnim[i] }] }]}
              >
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* ─── CTAs ─── */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Entrar na minha conta</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => router.push('/(auth)/cadastro')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
            <Text style={styles.ctaSecondaryText}>Criar conta gratuita</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Quick Access Pills ─── */}
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { borderColor: COLORS.primary }]}>  
            <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.pillText, { color: COLORS.primary }]}>Fretes disponíveis</Text>
          </View>
          <View style={[styles.pill, { borderColor: COLORS.error }]}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={[styles.pillText, { color: COLORS.error }]}>Cargas urgentes</Text>
          </View>
        </View>

        {/* ─── Parceiros ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Empresas Parceiras</Text>
          <Text style={styles.sectionSubtitle}>Serviços para motoristas e empresas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partnersScroll}>
            {PARTNERS.map((p) => (
              <View key={p.title} style={styles.partnerCard}>
                <View style={[styles.partnerIcon, { backgroundColor: p.bg }]}>
                  <Ionicons name={p.icon} size={24} color={p.color} />
                </View>
                <Text style={styles.partnerTitle}>{p.title}</Text>
                <Text style={styles.partnerDesc}>{p.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─── Diferenciais ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por que escolher o Rota Já?</Text>
          <Text style={styles.sectionSubtitle}>A solução completa para transporte de cargas</Text>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon} size={26} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <View style={styles.footerLogoBadge}>
              <Text style={styles.footerLogoText}>RJ</Text>
            </View>
            <Text style={styles.footerBrand}>ROTA JÁ</Text>
          </View>
          <Text style={styles.footerCopy}>© 2024 ROTA JÁ. Conectando o Brasil{'\n'}através do transporte inteligente.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 0 },

  // Hero
  hero: {
    paddingTop: 60, paddingBottom: 50, paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  heroContent: { alignItems: 'center', width: '100%' },
  heroTagline: {
    fontSize: 16, fontWeight: '700', color: '#fff',
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 15,
    textAlign: 'center',
  },
  heroDivider: {
    width: 60, height: 4, backgroundColor: COLORS.accent,
    borderRadius: 2, marginVertical: 15, alignSelf: 'center',
  },
  heroDesc: {
    fontSize: 16, color: 'rgba(255,255,255,0.95)', textAlign: 'center',
    lineHeight: 24, paddingHorizontal: 20, fontWeight: '500',
  },

  // Creative Logo (Premium Glassmorphism Card)
  creativeLogoContainer: { 
    width: '100%', alignItems: 'center', justifyContent: 'center', 
    marginBottom: 35, marginTop: 15 
  },
  glassContainer: {
    width: 220, height: 220,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  glassInnerGlow: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', // Brilho interno extra
    borderRadius: 50,
  },
  mainLogo: { 
    width: 170, height: 170, 
  },

  // Landing Header
  landingHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    width: '100%', paddingBottom: 20, marginTop: -10 
  },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm },
  headerWelcome: { color: '#fff', fontSize: 14, fontWeight: '700' },
  crownCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, gap: 10,
  },
  statCard: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', flex: 1, ...SHADOWS.md,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },

  // CTAs
  ctaSection: { paddingHorizontal: SPACING.lg, marginTop: 28, gap: 12 },
  ctaPrimary: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', ...SHADOWS.md },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: BORDER_RADIUS.md,
    borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#fff',
    gap: 10,
  },
  ctaSecondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },

  // Pills
  pillsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    marginTop: 20, gap: 10,
  },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, backgroundColor: '#fff', gap: 6, ...SHADOWS.sm,
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  // Sections
  section: { marginTop: 36, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 4, marginBottom: 20,
  },

  // Partners
  partnersScroll: { paddingRight: SPACING.lg, gap: 12 },
  partnerCard: {
    width: 140, backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg,
    padding: 16, alignItems: 'center', ...SHADOWS.sm,
  },
  partnerIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  partnerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  partnerDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 3 },

  // Features
  featureCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOWS.sm,
  },
  featureIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  featureDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },

  // Footer
  footer: {
    marginTop: 36, paddingVertical: 28, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant, alignItems: 'center',
  },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  footerLogoBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  footerLogoText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  footerBrand: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  footerCopy: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
});
