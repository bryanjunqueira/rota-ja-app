/**
 * Botão estilizado — Design system alinhado ao web
 * 
 * Variantes:
 * - primary: azul principal (equivale ao btn-primary do web)
 * - secondary: laranja/accent (equivale ao bg-accent do web)
 * - outline: borda azul, fundo transparente
 * - danger: vermelho (destructive do web)
 * - ghost: sem borda/fundo, texto azul
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '@/config/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title, onPress, loading, disabled, variant = 'primary',
  size = 'md', style, textStyle, icon
}: Props) {
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { height: 40, paddingHorizontal: SPACING.md, fontSize: FONT_SIZES.sm },
    md: { height: 48, paddingHorizontal: SPACING.lg, fontSize: FONT_SIZES.md },
    lg: { height: 56, paddingHorizontal: SPACING.xl, fontSize: FONT_SIZES.lg },
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: COLORS.primary },
    secondary: { backgroundColor: COLORS.accent },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary },
    danger: { backgroundColor: COLORS.error },
    ghost: { backgroundColor: 'transparent' },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: COLORS.white },
    secondary: { color: COLORS.textPrimary },
    outline: { color: COLORS.primary },
    danger: { color: COLORS.white },
    ghost: { color: COLORS.primary },
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { height: sizeStyles[size].height, paddingHorizontal: sizeStyles[size].paddingHorizontal },
        variantStyles[variant],
        variant !== 'ghost' && variant !== 'outline' && SHADOWS.sm,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textVariantStyles[variant].color}
        />
      ) : (
        <>
          {icon}
          <Text style={[
            styles.text,
            { fontSize: sizeStyles[size].fontSize },
            textVariantStyles[variant],
            icon ? { marginLeft: 8 } : undefined,
            textStyle,
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '600' },
});
