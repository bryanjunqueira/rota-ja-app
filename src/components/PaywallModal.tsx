/**
 * PaywallModal — Modal de bloqueio para recursos premium
 *
 * Exibido quando:
 * - Trial expirou
 * - Tentou acessar recurso premium sem plano adequado
 * - Assinatura cancelada/expirada
 *
 * Mostra o recurso tentado, plano mínimo necessário, e CTA para planos.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '@/config/theme';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPlan?: string;
  title?: string;
  message?: string;
}

export function PaywallModal({
  visible,
  onClose,
  featureName,
  requiredPlan,
  title,
  message,
}: PaywallModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/(auth)/planos');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Ícone premium */}
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.iconCircle}
          >
            <Ionicons name="lock-closed" size={32} color="#fff" />
          </LinearGradient>

          {/* Título */}
          <Text style={styles.title}>
            {title || 'Recurso Premium'}
          </Text>

          {/* Mensagem */}
          <Text style={styles.message}>
            {message ||
              (featureName
                ? `"${featureName}" é um recurso exclusivo para assinantes${
                    requiredPlan ? ` do plano ${requiredPlan} ou superior` : ''
                  }.`
                : 'Faça upgrade do seu plano para desbloquear todos os recursos premium do RotaJá.')}
          </Text>

          {/* Benefícios rápidos */}
          <View style={styles.benefits}>
            {[
              'Fretes ilimitados',
              'Prioridade nas candidaturas',
              'Dashboard avançado',
              'Suporte VIP',
            ].map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#FFB300" />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Botões */}
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBtnGradient}
            >
              <Ionicons name="rocket" size={18} color="#fff" />
              <Text style={styles.upgradeBtnText}>Ver Planos</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  benefits: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  upgradeBtn: {
    alignSelf: 'stretch',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  upgradeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  closeBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
