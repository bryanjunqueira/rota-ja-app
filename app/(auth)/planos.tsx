import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const { width } = Dimensions.get('window');

const PLANOS = {
  motorista: [
    {
      id: 'mot_basico',
      name: 'Básico',
      price: 'Grátis',
      desc: 'Ideal para quem está começando na plataforma.',
      benefits: ['Acesso a fretes padrão', 'Suporte em horário comercial', 'Perfil verificado'],
      limitations: ['Sem prioridade nas notificações', 'Taxa padrão por frete'],
      isPremium: false,
    },
    {
      id: 'mot_pro',
      name: 'Pro',
      price: 'R$ 29,90/mês',
      desc: 'Para motoristas que vivem da estrada.',
      benefits: ['Prioridade nas notificações de frete', 'Suporte VIP 24/7', 'Taxas reduzidas', 'Destaque no perfil para empresas'],
      limitations: [],
      isPremium: true,
    }
  ],
  empresa: [
    {
      id: 'emp_standard',
      name: 'Standard',
      price: 'R$ 99,90/mês',
      desc: 'Para pequenas empresas e transportadoras.',
      benefits: ['Até 10 publicações de carga/mês', 'Acesso ao painel de gestão', 'Suporte padrão'],
      limitations: ['Sem destaque nas buscas', 'Relatórios básicos'],
      isPremium: false,
    },
    {
      id: 'emp_enterprise',
      name: 'Enterprise',
      price: 'R$ 299,90/mês',
      desc: 'Para grandes operações logísticas.',
      benefits: ['Publicações ilimitadas', 'Cargas em destaque (Topo)', 'Relatórios avançados e API', 'Suporte dedicado via WhatsApp'],
      limitations: [],
      isPremium: true,
    }
  ]
};

export default function PlanosScreen() {
  const router = useRouter();
  const { session } = useAuth(); // Pega a sessão para saber se está logado
  const [tab, setTab] = useState<'motorista' | 'empresa'>('motorista');

  const handleSelectPlan = (planId: string, category: 'motorista' | 'empresa') => {
    if (session) {
      // Usuário já está logado (veio do dashboard), vai direto pro pagamento
      router.push(`/(auth)/checkout?plan=${planId}&category=${category}`);
    } else {
      // Usuário não logado (veio da landing page pública), vai pro cadastro
      if (category === 'motorista') {
        router.push(`/(auth)/cadastro-motorista?plano=${planId}`);
      } else {
        router.push(`/(auth)/cadastro-empresa?plano=${planId}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos RotaJá</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.mainTitle}>Escolha o plano ideal para você</Text>
        <Text style={styles.subtitle}>Desbloqueie ferramentas exclusivas e acelere seus resultados.</Text>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, tab === 'motorista' && styles.tabActive]} 
            onPress={() => setTab('motorista')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'motorista' && styles.tabTextActive]}>Para Motoristas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, tab === 'empresa' && styles.tabActive]} 
            onPress={() => setTab('empresa')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'empresa' && styles.tabTextActive]}>Para Empresas</Text>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <View style={styles.cardsWrapper}>
          {PLANOS[tab].map((plano) => (
            <View key={plano.id} style={[styles.card, plano.isPremium && styles.cardPremium]}>
              {plano.isPremium && (
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Recomendado</Text>
                </LinearGradient>
              )}
              
              <Text style={styles.planName}>{plano.name}</Text>
              <Text style={styles.planPrice}>{plano.price}</Text>
              <Text style={styles.planDesc}>{plano.desc}</Text>

              <View style={styles.benefitsList}>
                {plano.benefits.map((b, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.benefitText}>{b}</Text>
                  </View>
                ))}
                {plano.limitations.map((l, i) => (
                  <View key={`lim-${i}`} style={styles.benefitRow}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} opacity={0.5} />
                    <Text style={[styles.benefitText, { color: COLORS.textSecondary, textDecorationLine: 'line-through' }]}>{l}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.selectBtn, plano.isPremium && styles.selectBtnPremium]}
                activeOpacity={0.8}
                onPress={() => handleSelectPlan(plano.id, tab)}
              >
                <Text style={[styles.selectBtnText, plano.isPremium && styles.selectBtnTextPremium]}>
                  Selecionar {plano.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff', ...SHADOWS.sm
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  
  mainTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, marginBottom: 30, paddingHorizontal: 20 },

  tabsContainer: { 
    flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: BORDER_RADIUS.lg,
    padding: 4, marginBottom: 30
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },

  cardsWrapper: { gap: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
    position: 'relative',
  },
  cardPremium: {
    borderColor: '#FFD700', borderWidth: 2, ...SHADOWS.lg,
  },
  premiumBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  premiumBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  
  planName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  planPrice: { fontSize: 32, fontWeight: '900', color: COLORS.primary, marginBottom: 12 },
  planDesc: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 22 },
  
  benefitsList: { gap: 12, marginBottom: 30 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 15, color: COLORS.textPrimary, flex: 1 },

  selectBtn: {
    backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  selectBtnPremium: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  selectBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  selectBtnTextPremium: { color: '#fff' },
});
