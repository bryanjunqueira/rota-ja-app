/**
 * PremiumAvatar — Avatar com anel premium baseado no tier
 *
 * Exibe foto/letra do usuário com borda gradiente metálica:
 * - Gratuito: borda simples cinza
 * - Bronze: borda gradiente bronze com brilho
 * - Prata: borda gradiente prata com shimmer
 * - Ouro: borda gradiente dourada com glow animado
 *
 * Badge de tier posicionado no canto inferior direito.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type PlanTier, getTierVisual } from '@/config/plans';
import { PremiumBadge } from './PremiumBadge';
import { COLORS } from '@/config/theme';

interface PremiumAvatarProps {
  tier: PlanTier;
  imageUrl?: string | null;
  name?: string;
  size?: number;
  showBadge?: boolean;
  style?: any;
}

export function PremiumAvatar({
  tier,
  imageUrl,
  name,
  size = 80,
  showBadge = true,
  style,
}: PremiumAvatarProps) {
  const visual = getTierVisual(tier);
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const borderW = tier === 'gratuito' ? 2 : visual.borderWidth;
  const outerSize = size + borderW * 2 + 4;
  const innerSize = size;
  const letter = name?.charAt(0)?.toUpperCase() || '?';

  // Glow animation for Ouro
  useEffect(() => {
    if (!visual.animated) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visual.animated, glowAnim]);

  const avatarInner = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
      }}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{letter}</Text>
    </View>
  );

  const ringContent = (
    <View style={[styles.container, { width: outerSize, height: outerSize }, style]}>
      {tier === 'gratuito' ? (
        <View
          style={[
            styles.ring,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              borderWidth: 2,
              borderColor: COLORS.border,
            },
          ]}
        >
          {avatarInner}
        </View>
      ) : (
        <LinearGradient
          colors={[...visual.borderColors] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.ring,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              padding: borderW + 2,
              shadowColor: visual.glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 6,
            },
          ]}
        >
          {avatarInner}
        </LinearGradient>
      )}

      {/* Badge no canto inferior direito */}
      {showBadge && tier !== 'gratuito' && (
        <View style={[styles.badgePosition, { bottom: -2, right: -2 }]}>
          <PremiumBadge tier={tier} size="sm" />
        </View>
      )}
    </View>
  );

  if (visual.animated) {
    return (
      <Animated.View style={{ opacity: Animated.add(0.6, Animated.multiply(glowAnim, 0.4)) }}>
        {ringContent}
      </Animated.View>
    );
  }

  return ringContent;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  letter: {
    fontWeight: '800',
    color: '#fff',
  },
  badgePosition: {
    position: 'absolute',
    zIndex: 10,
  },
});
