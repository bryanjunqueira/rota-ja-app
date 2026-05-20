/**
 * PremiumBadge — Badge/medalha premium por tier
 *
 * Exibe selo visual de acordo com o plano do usuário:
 * - Gratuito: nada
 * - Bronze: escudo metálico bronze, "Verificado"
 * - Prata: estrela metálica prata, "Profissional"
 * - Ouro: troféu dourado com glow animado, "Premium"
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type PlanTier, getTierVisual } from '@/config/plans';

interface PremiumBadgeProps {
  tier: PlanTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  style?: any;
}

const SIZES = {
  sm: { badge: 20, icon: 10, fontSize: 8, padding: 4 },
  md: { badge: 28, icon: 14, fontSize: 10, padding: 6 },
  lg: { badge: 36, icon: 18, fontSize: 12, padding: 8 },
};

export function PremiumBadge({ tier, size = 'md', showLabel = false, style }: PremiumBadgeProps) {
  const visual = getTierVisual(tier);
  const s = SIZES[size];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animação pulse para Ouro
  useEffect(() => {
    if (!visual.animated) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visual.animated, pulseAnim]);

  if (tier === 'gratuito') return null;

  const badgeContent = (
    <LinearGradient
      colors={[...visual.badgeColors] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        {
          width: showLabel ? undefined : s.badge,
          height: s.badge,
          borderRadius: showLabel ? s.badge / 2 : s.badge / 2,
          paddingHorizontal: showLabel ? s.padding + 6 : 0,
          shadowColor: visual.glowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 4,
        },
        style,
      ]}
    >
      <Ionicons name={visual.iconName as any} size={s.icon} color={visual.textColor} />
      {showLabel && (
        <Text style={[styles.label, { fontSize: s.fontSize, color: visual.textColor }]}>
          {visual.label}
        </Text>
      )}
    </LinearGradient>
  );

  if (visual.animated) {
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        {badgeContent}
      </Animated.View>
    );
  }

  return badgeContent;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
