/**
 * Tela de Perfil — redesign premium mobile-first
 * Layout vertical com cards espaçados e header com gradiente
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { MotoristasService, EmpresasService, UploadService } from '@/services';
import { Button, Input } from '@/components';
import {
  COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS,
  getStatusColor, getStatusLabel,
} from '@/config/theme';

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
        const result = await UploadService.pickAndUpload('motoristas', `${user.id}/foto_perfil.jpg`);
        if (result.url) {
          await MotoristasService.atualizarPerfil(motorista.id, { foto_motorista_url: result.url });
          await refreshProfile();
          Alert.alert('Foto atualizada!');
        } else if (result.error) Alert.alert('Erro', result.error);
        setUploading(false);
      }},
      { text: 'Câmera', onPress: async () => {
        setUploading(true);
        const uri = await UploadService.takePhoto();
        if (uri) {
          const r = await UploadService.uploadToSupabase(uri, 'motoristas', `${user.id}/foto_perfil.jpg`);
          if (r.url) {
            await MotoristasService.atualizarPerfil(motorista.id, { foto_motorista_url: r.url });
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
    <View style={st.emptyWrap}>
      <Text style={st.emptyTitle}>Sem perfil</Text>
      <Text style={st.emptyText}>Complete seu cadastro para ver seus dados aqui.</Text>
      <Button title="Sair" onPress={handleLogout} variant="danger" style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

// ═══════════════════════════════════════
// MOTORISTA
// ═══════════════════════════════════════
function PerfilMotorista({ motorista, user, editing, saving, uploading, onEdit, onLogout, onUpload, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    celular: motorista.celular || '',
    endereco: motorista.endereco || '',
    cep: motorista.cep || '',
    placa_veiculo: motorista.placa_veiculo || '',
  });
  const status = motorista.status || 'pendente';
  const sc = getStatusColor(status);
  const hasPhoto = !!motorista.foto_motorista_url;

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Gradient Header */}
      <LinearGradient colors={['#1976D2', '#2094F3', '#4DA9F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.gradientHeader}>
        <TouchableOpacity onPress={onUpload} activeOpacity={0.8} style={st.avatarWrap}>
          {hasPhoto ? (
            <Image source={{ uri: motorista.foto_motorista_url }} style={st.avatarImg} />
          ) : (
            <View style={st.avatarPlaceholder}>
              <Text style={st.avatarLetter}>{motorista.nome_completo?.charAt(0)?.toUpperCase()}</Text>
            </View>
          )}
          {uploading ? (
            <View style={st.avatarLoading}><ActivityIndicator color="#fff" /></View>
          ) : (
            <View style={st.cameraBadge}><Ionicons name="camera" size={13} color="#fff" /></View>
          )}
        </TouchableOpacity>
        <Text style={st.heroName}>{motorista.nome_completo}</Text>
        <Text style={st.heroSub}>{user?.email}</Text>
        <View style={[st.heroBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Ionicons name={status === 'aprovado' ? 'checkmark-circle' : 'time-outline'} size={14} color={sc.text} />
          <Text style={[st.heroBadgeText, { color: sc.text }]}>{getStatusLabel(status)}</Text>
        </View>
      </LinearGradient>

      <View style={st.body}>
        {editing ? (
          <View style={st.card}>
            <CardTitle icon="create-outline" title="Editar Dados" color={COLORS.primary} />
            <Input label="Celular" value={form.celular} onChangeText={(v: string) => setForm(p => ({ ...p, celular: v }))} keyboardType="phone-pad" />
            <Input label="Endereço" value={form.endereco} onChangeText={(v: string) => setForm(p => ({ ...p, endereco: v }))} />
            <Input label="CEP" value={form.cep} onChangeText={(v: string) => setForm(p => ({ ...p, cep: v }))} keyboardType="numeric" />
            <Input label="Placa" value={form.placa_veiculo} onChangeText={(v: string) => setForm(p => ({ ...p, placa_veiculo: v }))} autoCapitalize="characters" />
            <View style={st.editRow}>
              <Button title="Cancelar" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
              <View style={{ width: SPACING.sm }} />
              <Button title={saving ? 'Salvando...' : 'Salvar'} onPress={() => onSave(form)} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <>
            {/* Informações Pessoais */}
            <View style={st.card}>
              <CardTitle icon="person-circle-outline" title="Informações Pessoais" color={COLORS.primary} />
              <Row label="E-mail" value={user?.email} icon="mail-outline" />
              <Row label="Celular" value={motorista.celular} icon="call-outline" />
              <Row label="Endereço" value={motorista.endereco} icon="location-outline" />
              <Row label="CEP" value={motorista.cep} icon="map-outline" last />
            </View>

            {/* Documentação */}
            <View style={st.card}>
              <CardTitle icon="document-text-outline" title="Documentação" color={COLORS.primary} />
              <Row label="CNH" value={motorista.cnh} icon="id-card-outline" />
              <Row label="ANTT (RNTRC)" value="N/A" icon="ribbon-outline" last />
            </View>

            {/* Veículo */}
            <View style={st.card}>
              <CardTitle icon="car-sport-outline" title="Veículo" color={COLORS.primary} />
              <View style={st.chipRow}>
                <Chip label="Placa" value={motorista.placa_veiculo} accent />
                <Chip label="Tipo" value={motorista.tipo_veiculo} />
                <Chip label="Carroceria" value={motorista.tipo_carroceria} />
              </View>
            </View>

            {/* Editar */}
            <TouchableOpacity style={st.editBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={st.editBtnText}>Editar Perfil</Text>
            </TouchableOpacity>
          </>
        )}

        <Button title="Sair da conta" onPress={onLogout} variant="danger" size="lg" style={{ marginTop: SPACING.md }} />
        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// EMPRESA
// ═══════════════════════════════════════
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
  const sc = getStatusColor(status);

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Gradient Header — amber/orange for empresa */}
      <LinearGradient colors={['#E89D1E', '#FFB224', '#FFC55C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.gradientHeader}>
        <View style={st.avatarWrap}>
          <View style={[st.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={st.avatarLetter}>{empresa.nome_empresa?.charAt(0)?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={st.heroName}>{empresa.nome_empresa}</Text>
        <Text style={st.heroSub}>{user?.email}</Text>
        <View style={[st.heroBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Ionicons name={status === 'aprovado' ? 'checkmark-circle' : 'time-outline'} size={14} color={sc.text} />
          <Text style={[st.heroBadgeText, { color: sc.text }]}>{getStatusLabel(status)}</Text>
        </View>
      </LinearGradient>

      <View style={st.body}>
        {editing ? (
          <View style={st.card}>
            <CardTitle icon="create-outline" title="Editar Dados" color={COLORS.accent} />
            <Input label="Telefone" value={form.telefone} onChangeText={(v: string) => setForm(p => ({ ...p, telefone: v }))} keyboardType="phone-pad" />
            <Input label="Endereço" value={form.endereco} onChangeText={(v: string) => setForm(p => ({ ...p, endereco: v }))} />
            <Input label="CEP" value={form.cep} onChangeText={(v: string) => setForm(p => ({ ...p, cep: v }))} keyboardType="numeric" />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 2 }}>
                <Input label="Cidade" value={form.cidade} onChangeText={(v: string) => setForm(p => ({ ...p, cidade: v }))} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Input label="UF" value={form.estado} onChangeText={(v: string) => setForm(p => ({ ...p, estado: v }))} autoCapitalize="characters" />
              </View>
            </View>
            <Input label="Responsável" value={form.nome_responsavel} onChangeText={(v: string) => setForm(p => ({ ...p, nome_responsavel: v }))} />
            <Input label="Cargo" value={form.cargo} onChangeText={(v: string) => setForm(p => ({ ...p, cargo: v }))} />
            <View style={st.editRow}>
              <Button title="Cancelar" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
              <View style={{ width: SPACING.sm }} />
              <Button title={saving ? 'Salvando...' : 'Salvar'} onPress={() => onSave(form)} loading={saving} style={{ flex: 1 }} variant="secondary" />
            </View>
          </View>
        ) : (
          <>
            {/* Dados da Empresa */}
            <View style={st.card}>
              <CardTitle icon="business-outline" title="Dados da Empresa" color={COLORS.accent} />
              <Row label="CNPJ" value={empresa.cnpj} icon="document-outline" />
              <Row label="E-mail" value={user?.email} icon="mail-outline" />
              <Row label="Telefone" value={empresa.telefone} icon="call-outline" last />
            </View>

            {/* Responsável */}
            <View style={st.card}>
              <CardTitle icon="people-outline" title="Responsável" color={COLORS.accent} />
              <Row label="Nome" value={empresa.nome_responsavel} icon="person-outline" />
              <Row label="Cargo" value={empresa.cargo} icon="briefcase-outline" last />
            </View>

            {/* Localização */}
            <View style={st.card}>
              <CardTitle icon="location-outline" title="Localização" color={COLORS.accent} />
              <Row label="Endereço" value={empresa.endereco} icon="home-outline" />
              <Row label="Cidade / UF" value={`${empresa.cidade || '—'} / ${empresa.estado || '—'}`} icon="navigate-outline" />
              <Row label="CEP" value={empresa.cep} icon="map-outline" last />
            </View>

            {/* Editar */}
            <TouchableOpacity style={[st.editBtn, { borderColor: COLORS.accent }]} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={COLORS.accent} />
              <Text style={[st.editBtnText, { color: COLORS.accent }]}>Editar Dados</Text>
            </TouchableOpacity>
          </>
        )}

        <Button title="Sair da conta" onPress={onLogout} variant="danger" size="lg" style={{ marginTop: SPACING.md }} />
        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function CardTitle({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={st.cardTitleWrap}>
      <View style={[st.cardTitleIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={st.cardTitleText}>{title}</Text>
    </View>
  );
}

function Row({ label, value, icon, last }: { label: string; value?: string | null; icon: string; last?: boolean }) {
  return (
    <View style={[st.row, !last && st.rowBorder]}>
      <Ionicons name={icon as any} size={16} color={COLORS.textTertiary} style={{ marginRight: 10, marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={st.rowValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Chip({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  return (
    <View style={[st.chip, accent && st.chipAccent]}>
      <Text style={st.chipLabel}>{label}</Text>
      <Text style={[st.chipValue, accent && st.chipValueAccent]}>{value || '—'}</Text>
    </View>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  // ── Gradient Header ──
  gradientHeader: {
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  avatarImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarLetter: { fontSize: 34, fontWeight: '800', color: '#fff' },
  avatarLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  heroName: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    textAlign: 'center', paddingHorizontal: SPACING.lg,
  },
  heroSub: {
    fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.8)',
    marginTop: 2, textAlign: 'center',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: SPACING.sm,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600' },

  // ── Body ──
  body: { paddingHorizontal: SPACING.lg, marginTop: -12 },

  // ── Card ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  cardTitleWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  cardTitleIcon: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitleText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },

  // ── Row ──
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowLabel: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },

  // ── Chips ──
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 90,
  },
  chipAccent: { backgroundColor: COLORS.primaryFaded },
  chipLabel: { fontSize: 10, color: COLORS.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginTop: 3 },
  chipValueAccent: { color: COLORS.primary },

  // ── Edit button ──
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: SPACING.md, paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.surface, ...SHADOWS.sm,
  },
  editBtnText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.primary },

  // ── Edit actions ──
  editRow: { flexDirection: 'row', marginTop: SPACING.lg },
});
