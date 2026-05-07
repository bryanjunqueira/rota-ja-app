/**
 * Tela de Perfil — visual profissional, sem emojis
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';

export default function PerfilScreen() {
  const { user, role, motorista, empresa, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const status = role === 'motorista' ? motorista?.status : empresa?.status;
  const statusColors = getStatusColor(status || 'pendente');
  const initials = role === 'motorista'
    ? (motorista?.nome_completo || 'M').charAt(0).toUpperCase()
    : (empresa?.nome_empresa || 'E').charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container}>
      {/* Avatar + Identidade */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, {
          backgroundColor: role === 'motorista' ? COLORS.primaryFaded : COLORS.accentFaded
        }]}>
          <Text style={[styles.avatarText, {
            color: role === 'motorista' ? COLORS.primary : COLORS.accent
          }]}>{initials}</Text>
        </View>
        <Text style={styles.name}>
          {role === 'motorista' ? motorista?.nome_completo : empresa?.nome_empresa || 'Usuário'}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{getStatusLabel(status)}</Text>
          </View>
        )}
      </View>

      {/* Dados Motorista */}
      {role === 'motorista' && motorista && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Dados do Motorista</Text>
          <InfoRow label="Veículo" value={motorista.tipo_veiculo} />
          <InfoRow label="Carroceria" value={motorista.tipo_carroceria} />
          <InfoRow label="Placa" value={motorista.placa_veiculo} />
          <InfoRow label="CNH" value={motorista.cnh} />
          <InfoRow label="Celular" value={motorista.celular} />
          <InfoRow label="Endereço" value={motorista.endereco} />
          <InfoRow label="CEP" value={motorista.cep} isLast />
        </View>
      )}

      {/* Dados Empresa */}
      {role === 'empresa' && empresa && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          <InfoRow label="CNPJ" value={empresa.cnpj} />
          <InfoRow label="Endereço" value={empresa.endereco} />
          <InfoRow label="Cidade" value={`${empresa.cidade}/${empresa.estado}`} />
          <InfoRow label="Telefone" value={empresa.telefone} />
          <InfoRow label="Responsável" value={empresa.nome_responsavel} />
          <InfoRow label="Cargo" value={empresa.cargo} isLast />
        </View>
      )}

      <View style={styles.actions}>
        <Button title="Sair da conta" onPress={handleLogout} variant="danger" size="lg" />
      </View>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.md,
  },
  avatarText: { fontSize: 32, fontWeight: '800' },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  sectionTitle: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoCard: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  actions: { padding: SPACING.lg, marginTop: SPACING.md },
});
