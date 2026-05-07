/**
 * Input de formulário — Design system alinhado ao web
 * 
 * Replica o estilo do Input do shadcn/ui usado no web:
 * - Borda cinza sutil (--input / --border)
 * - Focus com ring azul (--ring)
 * - Label acima do campo
 * - Mensagem de erro abaixo
 */
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '@/config/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  required?: boolean;
}

export function Input({ label, error, icon, isPassword, required, style, ...props }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}{required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  required: { color: COLORS.error },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.input,       // --input do web
    borderRadius: BORDER_RADIUS.sm,  // --radius do web (0.5rem ≈ 8px)
    backgroundColor: COLORS.white,
  },
  inputFocused: {
    borderColor: COLORS.primary,     // --ring do web
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.error,       // --destructive do web
    borderWidth: 2,
  },
  icon: { paddingLeft: SPACING.md },
  input: {
    flex: 1,
    height: 44,                      // Altura padrão do input no web
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,       // --foreground do web
  },
  inputWithIcon: { paddingLeft: SPACING.sm },
  eyeBtn: { paddingRight: SPACING.md, padding: SPACING.sm },
  eyeText: { fontSize: 18 },
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
  },
});
