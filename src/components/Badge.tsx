/**
 * Badge component — equivalente ao Badge do shadcn/ui no web
 * 
 * Variantes: default, secondary, destructive, outline
 * Usado para status, contadores, tags.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '@/config/theme';

interface Props {
  children: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ children, variant = 'default', style, textStyle }: Props) {
  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    default: {
      container: { backgroundColor: COLORS.primary },
      text: { color: COLORS.white },
    },
    secondary: {
      container: { backgroundColor: COLORS.surfaceVariant },
      text: { color: COLORS.textPrimary },
    },
    destructive: {
      container: { backgroundColor: COLORS.error },
      text: { color: COLORS.white },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
      text: { color: COLORS.textPrimary },
    },
    success: {
      container: { backgroundColor: COLORS.statusAprovadoBg, borderWidth: 1, borderColor: COLORS.statusAprovado },
      text: { color: COLORS.statusAprovado },
    },
    warning: {
      container: { backgroundColor: COLORS.statusPendenteBg, borderWidth: 1, borderColor: COLORS.statusPendente },
      text: { color: COLORS.statusPendente },
    },
  };

  const v = variantStyles[variant];

  return (
    <View style={[styles.container, v.container, style]}>
      <Text style={[styles.text, v.text, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
