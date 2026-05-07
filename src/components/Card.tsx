/**
 * Card component — equivalente ao Card do shadcn/ui no web
 * 
 * Card base com suporte a header, content, e variantes.
 * Replica o estilo do web: borda 0, shadow-xl, background card.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '@/config/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outline';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const variantStyles: Record<string, ViewStyle> = {
    default: { ...SHADOWS.md },
    elevated: { ...SHADOWS.xl },
    outline: { borderWidth: 1, borderColor: COLORS.border },
  };

  return (
    <View style={[styles.card, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ title, description, icon, right, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>
        {icon && <View style={styles.headerIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {description && <Text style={styles.headerDescription}>{description}</Text>}
        </View>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,  // --card do web
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,   // --card-foreground do web
  },
  headerDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,  // --muted-foreground do web
    marginTop: 2,
  },
  content: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
});
