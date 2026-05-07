/**
 * Tela de Perfil — visualização + edição + upload de foto
 * Motorista: editar dados pessoais + foto
 * Empresa: editar dados da empresa
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { MotoristasService, EmpresasService, UploadService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';

export default function PerfilScreen() {
  const { user, role, motorista, empresa, logout, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const handleUploadFoto = async () => {
    if (role !== 'motorista' || !motorista || !user) return;
    Alert.alert('Foto do perfil', 'Escolha a origem da foto', [
      { text: 'Galeria', onPress: async () => {
        setUploading(true);
        const result = await UploadService.pickAndUpload(
          'motoristas', `${user.id}/foto_perfil.jpg`
        );
        if (result.url) {
          await MotoristasService.atualizarPerfil(motorista.id, { foto_motorista_url: result.url });
          await refreshProfile();
          Alert.alert('Foto atualizada!');
        } else if (result.error) {
          Alert.alert('Erro', result.error);
        }
        setUploading(false);
      }},
      { text: 'Câmera', onPress: async () => {
        setUploading(true);
        const uri = await UploadService.takePhoto();
        if (uri) {
          const result = await UploadService.uploadToSupabase(uri, 'motoristas', `${user.id}/foto_perfil.jpg`);
          if (result.url) {
            await MotoristasService.atualizarPerfil(motorista.id, { foto_motorista_url: result.url });
            await refreshProfile();
            Alert.alert('Foto atualizada!');
          }
        }
        setUploading(false);
      }},
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (role === 'motorista' && motorista) return (
    <PerfilMotorista
      motorista={motorista} user={user} editing={editing} saving={saving} uploading={uploading}
      onEdit={() => setEditing(true)} onLogout={handleLogout} onUpload={handleUploadFoto}
      onSave={async (dados: Record<string, string>) => {
        setSaving(true);
        const result = await MotoristasService.atualizarPerfil(motorista.id, dados);
        setSaving(false);
        if (result.success) { await refreshProfile(); setEditing(false); Alert.alert('Perfil atualizado!'); }
        else Alert.alert('Erro', result.error || 'Erro ao salvar.');
      }}
      onCancel={() => setEditing(false)}
    />
  );

  if (role === 'empresa' && empresa) return (
    <PerfilEmpresa
      empresa={empresa} user={user} editing={editing} saving={saving}
      onEdit={() => setEditing(true)} onLogout={handleLogout}
      onSave={async (dados: Record<string, string>) => {
        setSaving(true);
        const result = await EmpresasService.atualizarPerfil(empresa.id, dados);
        setSaving(false);
        if (result.success) { await refreshProfile(); setEditing(false); Alert.alert('Dados atualizados!'); }
        else Alert.alert('Erro', result.error || 'Erro ao salvar.');
      }}
      onCancel={() => setEditing(false)}
    />
  );

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Sem perfil</Text>
      <Text style={styles.emptyText}>Complete seu cadastro para ver seus dados aqui.</Text>
      <Button title="Sair" onPress={handleLogout} variant="danger" style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

// ── PERFIL MOTORISTA ──

function PerfilMotorista({ motorista, user, editing, saving, uploading, onEdit, onLogout, onUpload, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    celular: motorista.celular || '',
    endereco: motorista.endereco || '',
    cep: motorista.cep || '',
    placa_veiculo: motorista.placa_veiculo || '',
  });

  const status = motorista.status || 'pendente';
  const statusColors = getStatusColor(status);
  const hasPhoto = !!motorista.foto_motorista_url;

  return (
    <ScrollView style={styles.container}>
      {/* Avatar com upload */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={onUpload} activeOpacity={0.7} style={styles.avatarTouchable}>
          {hasPhoto ? (
            <Image source={{ uri: motorista.foto_motorista_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.primaryFaded }]}>
              <Text style={[styles.avatarText, { color: COLORS.primary }]}>
                {motorista.nome_completo.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {uploading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : (
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{motorista.nome_completo}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>{getStatusLabel(status)}</Text>
        </View>
      </View>

      {/* Dados */}
      <View style={styles.infoCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionTitle}>Dados do Motorista</Text>
          {!editing && (
            <TouchableOpacity onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <Input label="Celular" value={form.celular} onChangeText={v => setForm(p => ({ ...p, celular: v }))} keyboardType="phone-pad" />
            <Input label="Endereço" value={form.endereco} onChangeText={v => setForm(p => ({ ...p, endereco: v }))} />
            <Input label="CEP" value={form.cep} onChangeText={v => setForm(p => ({ ...p, cep: v }))} keyboardType="numeric" />
            <Input label="Placa" value={form.placa_veiculo} onChangeText={v => setForm(p => ({ ...p, placa_veiculo: v }))} autoCapitalize="characters" />
            <View style={styles.editActions}>
              <Button title="Cancelar" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
              <View style={{ width: SPACING.sm }} />
              <Button title={saving ? 'Salvando...' : 'Salvar'} onPress={() => onSave(form)} loading={saving} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <InfoRow label="Veículo" value={motorista.tipo_veiculo} />
            <InfoRow label="Carroceria" value={motorista.tipo_carroceria} />
            <InfoRow label="Placa" value={motorista.placa_veiculo} />
            <InfoRow label="CNH" value={motorista.cnh} />
            <InfoRow label="Celular" value={motorista.celular} />
            <InfoRow label="Endereço" value={motorista.endereco} />
            <InfoRow label="CEP" value={motorista.cep} isLast />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Sair da conta" onPress={onLogout} variant="danger" size="lg" />
      </View>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

// ── PERFIL EMPRESA ──

function PerfilEmpresa({ empresa, user, editing, saving, onEdit, onLogout, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    telefone: empresa.telefone || '',
    endereco: empresa.endereco || '',
    cep: empresa.cep || '',
    cidade: empresa.cidade || '',
    estado: empresa.estado || '',
    nome_responsavel: empresa.nome_responsavel || '',
    cargo: empresa.cargo || '',
  });

  const status = empresa.status || 'pendente';
  const statusColors = getStatusColor(status);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: COLORS.accentFaded }]}>
          <Text style={[styles.avatarText, { color: COLORS.accent }]}>
            {empresa.nome_empresa.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{empresa.nome_empresa}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>{getStatusLabel(status)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          {!editing && (
            <TouchableOpacity onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <Input label="Telefone" value={form.telefone} onChangeText={v => setForm(p => ({ ...p, telefone: v }))} keyboardType="phone-pad" />
            <Input label="Endereço" value={form.endereco} onChangeText={v => setForm(p => ({ ...p, endereco: v }))} />
            <Input label="CEP" value={form.cep} onChangeText={v => setForm(p => ({ ...p, cep: v }))} keyboardType="numeric" />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 2 }}>
                <Input label="Cidade" value={form.cidade} onChangeText={v => setForm(p => ({ ...p, cidade: v }))} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Input label="UF" value={form.estado} onChangeText={v => setForm(p => ({ ...p, estado: v }))} autoCapitalize="characters" />
              </View>
            </View>
            <Input label="Responsável" value={form.nome_responsavel} onChangeText={v => setForm(p => ({ ...p, nome_responsavel: v }))} />
            <Input label="Cargo" value={form.cargo} onChangeText={v => setForm(p => ({ ...p, cargo: v }))} />
            <View style={styles.editActions}>
              <Button title="Cancelar" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
              <View style={{ width: SPACING.sm }} />
              <Button title={saving ? 'Salvando...' : 'Salvar'} onPress={() => onSave(form)} loading={saving} style={{ flex: 1 }} variant="secondary" />
            </View>
          </>
        ) : (
          <>
            <InfoRow label="CNPJ" value={empresa.cnpj} />
            <InfoRow label="Endereço" value={empresa.endereco} />
            <InfoRow label="Cidade" value={`${empresa.cidade}/${empresa.estado}`} />
            <InfoRow label="Telefone" value={empresa.telefone} />
            <InfoRow label="Responsável" value={empresa.nome_responsavel} />
            <InfoRow label="Cargo" value={empresa.cargo} isLast />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Sair da conta" onPress={onLogout} variant="danger" size="lg" />
      </View>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

// ── SHARED ──

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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  // Header
  profileHeader: { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg },
  avatarTouchable: { position: 'relative' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.md,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '800' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Info card
  infoCard: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary,
    paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, flex: 1,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  // Edit actions
  editActions: { flexDirection: 'row', marginTop: SPACING.lg },

  // Actions
  actions: { padding: SPACING.lg, marginTop: SPACING.md },
});
