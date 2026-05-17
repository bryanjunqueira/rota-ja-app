/**
 * Onboarding — Primeira experiência do usuário na RotaJá
 *
 * Exibido APENAS uma vez (persistido via AsyncStorage).
 * Apresentação altamente profissional, formal e corporativa.
 * Sem emojis, usando ícones sofisticados e gradients harmoniosos.
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const LOGO_IMG = require('../../src/logo/WhatsApp_Image_2026-05-13_at_16.08.56_Nero_AI_Image_Upscaler_Photo_Face-removebg-preview.png');

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@rotaja_onboarding_seen';

/* ────────────────── DADOS DOS SLIDES ────────────────── */

interface SlideData {
  id: string;
  bg: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  highlight?: string;
  body: string;
  extras?: 'steps' | 'benefits' | 'roles';
}

const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    bg: ['#0B1528', '#16243C'],
    icon: 'cube-outline',
    title: 'Plataforma Integrada',
    highlight: 'RotaJá',
    body: 'Conectando o setor de transporte rodoviário a soluções inteligentes de logística, unindo empresas e motoristas com máxima agilidade.',
  },
  {
    id: 'about',
    bg: ['#0B1528', '#14294A'],
    icon: 'earth-outline',
    title: 'Distribuição Inteligente em',
    highlight: 'Escala Nacional',
    body: 'A ponte tecnológica ideal para a contratação, distribuição e rastreamento de cargas de ponta a ponta em todo o Brasil.',
  },
  {
    id: 'how',
    bg: ['#0B1528', '#112C59'],
    icon: 'git-network-outline',
    title: 'Fluxo Operacional',
    highlight: 'Simplificado',
    body: 'Otimização estruturada em etapas rápidas para contratação e execução de transporte:',
    extras: 'steps',
  },
  {
    id: 'benefits',
    bg: ['#0B1528', '#0F2C61'],
    icon: 'shield-checkmark-outline',
    title: 'Vantagens',
    highlight: 'Corporativas',
    body: 'Segurança, controle financeiro transparente e comunicação ágil em tempo real.',
    extras: 'benefits',
  },
  {
    id: 'roles',
    bg: ['#0B1528', '#1A2F50'],
    icon: 'people-outline',
    title: 'Perfis de Trabalho',
    highlight: 'Dedicados',
    body: 'Ferramentas exclusivas desenhadas especificamente para as particularidades de cada operação comercial.',
    extras: 'roles',
  },
  {
    id: 'final',
    bg: ['#0B1528', '#16243C'],
    icon: 'rocket-outline',
    title: 'Pronto para',
    highlight: 'Iniciar?',
    body: 'Faça login ou registre-se para acessar seu painel corporativo e começar a otimizar sua logística hoje mesmo.',
  },
];

const STEPS = [
  { num: '01', text: 'Publicação da carga pela empresa', icon: 'create' as const, color: COLORS.accent },
  { num: '02', text: 'Localização imediata pelo motorista', icon: 'search' as const, color: '#38BDF8' },
  { num: '03', text: 'Aceite digital e início do transporte', icon: 'navigate' as const, color: '#34D399' },
  { num: '04', text: 'Confirmação e entrega realizada', icon: 'checkmark-done-circle' as const, color: '#A78BFA' },
];

const BENEFITS = [
  { icon: 'speedometer' as const, text: 'Alta Performance', sub: 'Fretes contratados em instantes' },
  { icon: 'shield-checkmark' as const, text: 'Segurança Estrita', sub: 'Perfis e veículos certificados' },
  { icon: 'notifications' as const, text: 'Alertas em Tempo Real', sub: 'Notificações de status imediatas' },
  { icon: 'card' as const, text: 'Liquidez Garantida', sub: 'Pagamentos claros e objetivos' },
];

/* ────────────────── COMPONENT ────────────────── */

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [idx, setIdx] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideUp.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start();
  }, [idx]);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/landing');
  };

  const go = (i: number) => {
    if (i >= 0 && i < SLIDES.length) {
      flatListRef.current?.scrollToIndex({ index: i, animated: true });
    }
  };

  const next = () => (idx < SLIDES.length - 1 ? go(idx + 1) : finish());
  const back = () => idx > 0 && go(idx - 1);

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]) setIdx(viewableItems[0].index ?? 0);
  }).current;
  const viewCfg = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const isLast = idx === SLIDES.length - 1;
  const isFirst = idx === 0;

  /* ─── RENDER SLIDE ─── */
  const renderSlide = ({ item }: { item: SlideData }) => (
    <LinearGradient colors={item.bg} style={[styles.slide, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 190 }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>

        {/* Logo na primeira e última tela */}
        {(item.id === 'welcome' || item.id === 'final') && (
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Image source={LOGO_IMG} style={styles.logoImg} resizeMode="contain" />
            </View>
          </View>
        )}

        {/* Ícone vetorizado premium */}
        {item.id !== 'welcome' && item.id !== 'final' && (
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={32} color={COLORS.accent} />
            </View>
            <View style={styles.iconRing} />
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>
          {item.title}
          {item.highlight ? (
            <Text style={styles.highlight}> {item.highlight}</Text>
          ) : null}
        </Text>

        {/* Body */}
        <Text style={styles.body}>{item.body}</Text>

        {/* ── Extras: Steps ── */}
        {item.extras === 'steps' && (
          <View style={styles.stepsWrap}>
            {STEPS.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: s.color + '15' }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepLabel}>Etapa {s.num}</Text>
                  <Text style={styles.stepText}>{s.text}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Extras: Benefits ── */}
        {item.extras === 'benefits' && (
          <View style={styles.benefitsGrid}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={b.icon} size={20} color={COLORS.accent} />
                </View>
                <Text style={styles.benefitTitle}>{b.text}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Extras: Roles ── */}
        {item.extras === 'roles' && (
          <View style={styles.rolesWrap}>
            <View style={styles.roleCard}>
              <View style={[styles.roleIcon, { backgroundColor: '#38BDF8' + '15' }]}>
                <Ionicons name="car-sport" size={24} color="#38BDF8" />
              </View>
              <Text style={styles.roleLabel}>Motorista</Text>
              <Text style={styles.roleDesc}>Acesso a cargas homologadas, controle completo de fretes aceitos e histórico de operações.</Text>
            </View>
            <View style={styles.roleCard}>
              <View style={[styles.roleIcon, { backgroundColor: COLORS.accent + '15' }]}>
                <Ionicons name="business" size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.roleLabel}>Empresa</Text>
              <Text style={styles.roleDesc}>Publicação ágil de ofertas, seleção de profissionais certificados e acompanhamento em tempo real.</Text>
            </View>
          </View>
        )}

      </Animated.View>
    </LinearGradient>
  );

  /* ─── UI ─── */
  return (
    <View style={styles.container}>

      {/* ── Top bar: Skip ── */}
      <View style={[styles.topBar, { top: insets.top + 15 }]}>
        <View />
        {!isLast ? (
          <TouchableOpacity onPress={finish} activeOpacity={0.7} style={styles.skipBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={styles.skipText}>Pular</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        ) : <View />}
      </View>

      {/* ── Slides ── */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onViewableItemsChanged={onViewRef}
        viewabilityConfig={viewCfg}
        scrollEventThrottle={16}
        renderItem={renderSlide}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      {/* ── Bottom: dots + buttons ── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const input = [(i - 1) * width, i * width, (i + 1) * width];
            const w = scrollX.interpolate({ inputRange: input, outputRange: [6, 20, 6], extrapolate: 'clamp' });
            const op = scrollX.interpolate({ inputRange: input, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
            return <Animated.View key={i} style={[styles.dot, { width: w, opacity: op }]} />;
          })}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {!isFirst ? (
            <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 90 }} />}

          <TouchableOpacity onPress={next} activeOpacity={0.85} style={styles.nextBtn}>
            <LinearGradient
              colors={isLast ? [COLORS.success, '#059669'] : [COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextGrad}
            >
              <Text style={styles.nextText}>{isLast ? 'Começar' : 'Avançar'}</Text>
              <Ionicons name={isLast ? 'checkmark-circle' : 'chevron-forward'} size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ────────────────── STYLES ────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1528' },

  /* Top */
  topBar: {
    position: 'absolute', left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4 },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },

  /* Slide */
  slide: { width, paddingHorizontal: 24 },
  inner: { flex: 1, justifyContent: 'center' },

  /* Logo */
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 110, height: 110, borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.lg,
  },
  logoImg: { width: 80, height: 80 },

  /* Premium Icon Wrapper */
  iconContainer: { marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,178,36,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,178,36,0.25)',
  },
  iconRing: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1, borderColor: 'rgba(255,178,36,0.06)',
  },

  /* Title */
  title: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 34 },
  highlight: { color: COLORS.accent },

  /* Body */
  body: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 22,
    marginTop: 12, textAlign: 'center', fontWeight: '400',
    paddingHorizontal: 16,
  },

  /* Steps */
  stepsWrap: { marginTop: 24, gap: 2, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepNum: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  stepTextWrap: { marginLeft: 12, flex: 1 },
  stepLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8 },
  stepText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  stepLine: {
    position: 'absolute', left: 17, top: 44, width: 2, height: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  /* Benefits */
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  benefitCard: {
    width: (width - 48 - 10) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,178,36,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  benefitTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  benefitSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 15 },

  /* Roles */
  rolesWrap: { flexDirection: 'row', marginTop: 24, gap: 10 },
  roleCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  roleIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  roleLabel: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 6 },
  roleDesc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 16, textAlign: 'center' },

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 12,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginBottom: 16 },
  dot: { height: 4, borderRadius: 2, backgroundColor: '#fff' },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  nextBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  nextGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: BORDER_RADIUS.full,
  },
  nextText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
