/**
 * Tela de Perfil — redesign premium mobile-first
 * Motorista: perfil read-only + gerenciamento de veículos
 * Empresa: dados editáveis da empresa
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { MotoristasService, EmpresasService, UploadService } from '@/services';
import { Button, Input, VeiculosManager } from '@/components';
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
    <PerfilMotorista motorista={motorista} user={user} uploading={uploading} onLogout={handleLogout} onUpload={handleUploadFoto} />
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
// MOTORISTA — Redesign Premium
// ═══════════════════════════════════════
function PerfilMotorista({ motorista, user, uploading, onLogout, onUpload }: any) {
  const insets = useSafeAreaInsets();
  const status = motorista.status || 'pendente';
  const sc = getStatusColor(status);
  const hasPhoto = !!motorista.foto_motorista_url;

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Gradient Header */}
      <LinearGradient colors={['#1565C0', '#1976D2', '#2094F3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.gradientHeader, { paddingTop: insets.top + 24 }]}>
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
        {/* Informações Pessoais — Read Only com cadeado */}
        <View style={st.card}>
          <View style={st.cardTitleWrap}>
            <View style={[st.cardTitleIcon, { backgroundColor: COLORS.primaryFaded }]}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={st.cardTitleText}>Informações Pessoais</Text>
            <View style={st.lockBadge}>
              <Ionicons name="lock-closed" size={11} color={COLORS.textTertiary} />
              <Text style={st.lockText}>Protegido</Text>
            </View>
          </View>
          <InfoRow icon="mail-outline" label="E-mail" value={user?.email} />
          <InfoRow icon="call-outline" label="Celular" value={motorista.celular} />
          <InfoRow icon="location-outline" label="Endereço" value={motorista.endereco} />
          <InfoRow icon="map-outline" label="CEP" value={motorista.cep} last />
        </View>

        {/* Documentação — Read Only */}
        <View style={st.card}>
          <View style={st.cardTitleWrap}>
            <View style={[st.cardTitleIcon, { backgroundColor: COLORS.accentFaded }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={st.cardTitleText}>Documentação</Text>
            <View style={st.lockBadge}>
              <Ionicons name="lock-closed" size={11} color={COLORS.textTertiary} />
              <Text style={st.lockText}>Protegido</Text>
            </View>
          </View>
          <InfoRow icon="id-card-outline" label="CNH" value={motorista.cnh} last />
        </View>

        {/* Meus Veículos — Seção Interativa */}
        <View style={st.card}>
          <VeiculosManager motoristaId={motorista.id} />
        </View>

        {/* Conta */}
        <View style={st.card}>
          <View style={st.cardTitleWrap}>
            <View style={[st.cardTitleIcon, { backgroundColor: COLORS.errorLight }]}>
              <Ionicons name="settings-outline" size={18} color={COLORS.error} />
            </View>
            <Text style={st.cardTitleText}>Conta</Text>
          </View>
          <TouchableOpacity style={st.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={st.logoutText}>Sair da conta</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        <Text style={st.versionText}>RotaJá v1.0.0</Text>
        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// EMPRESA
// ═══════════════════════════════════════
function PerfilEmpresa({ empresa, user, editing, saving, onEdit, onLogout, onSave, onCancel }: any) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    telefone: empresa.telefone || '', endereco: empresa.endereco || '', cep: empresa.cep || '',
    cidade: empresa.cidade || '', estado: empresa.estado || '',
    nome_responsavel: empresa.nome_responsavel || '', cargo: empresa.cargo || '',
  });
  const status = empresa.status || 'pendente';
  const sc = getStatusColor(status);

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#E89D1E', '#F9A825', '#FBC02D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.gradientHeader, { paddingTop: insets.top + 24 }]}>
        <View style={st.avatarWrap}>
          <View style={[st.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={st.avatarLetter}>{empresa.nome_empresa?.charAt(0)?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={st.heroName}>{empresa.nome_empresa}</Text>
        <Text style={st.heroSub}>{empresa.cnpj}</Text>
        <View style={[st.heroBadge, { backgroundColor: sc.bg, borderColor: sc.border, marginTop: 12 }]}>
          <Ionicons name={status === 'aprovado' ? 'checkmark-circle' : 'time-outline'} size={14} color={sc.text} />
          <Text style={[st.heroBadgeText, { color: sc.text }]}>{getStatusLabel(status)}</Text>
        </View>
      </LinearGradient>

      <View style={st.body}>
        {editing ? (
          <View style={st.card}>
            <View style={st.cardTitleWrap}>
              <View style={[st.cardTitleIcon, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="create-outline" size={18} color={COLORS.secondary} />
              </View>
              <Text style={st.cardTitleText}>Editar Perfil</Text>
            </View>
            <Input label="Telefone Comercial" value={form.telefone} onChangeText={(v: string) => setForm(p => ({ ...p, telefone: v }))} keyboardType="phone-pad" />
            <Input label="Endereço" value={form.endereco} onChangeText={(v: string) => setForm(p => ({ ...p, endereco: v }))} />
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <View style={{ flex: 1 }}><Input label="Cidade" value={form.cidade} onChangeText={(v: string) => setForm(p => ({ ...p, cidade: v }))} /></View>
              <View style={{ width: 80 }}><Input label="UF" value={form.estado} onChangeText={(v: string) => setForm(p => ({ ...p, estado: v }))} autoCapitalize="characters" maxLength={2} /></View>
            </View>
            <Input label="Responsável" value={form.nome_responsavel} onChangeText={(v: string) => setForm(p => ({ ...p, nome_responsavel: v }))} />
            <View style={st.editRow}>
              <Button title="Cancelar" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
              <View style={{ width: SPACING.sm }} />
              <Button title={saving ? 'Salvando...' : 'Salvar Dados'} onPress={() => onSave(form)} loading={saving} style={{ flex: 1 }} variant="secondary" />
            </View>
          </View>
        ) : (
          <>
            <View style={st.card}>
              <View style={st.cardTitleWrap}>
                <View style={[st.cardTitleIcon, { backgroundColor: COLORS.secondary + '15' }]}><Ionicons name="business-outline" size={18} color={COLORS.secondary} /></View>
                <Text style={st.cardTitleText}>Dados Corporativos</Text>
              </View>
              <InfoRow icon="mail-outline" label="E-mail de Contato" value={user?.email} />
              <InfoRow icon="call-outline" label="Telefone" value={empresa.telefone} />
              <InfoRow icon="person-outline" label="Responsável" value={empresa.nome_responsavel} last />
            </View>

            <View style={st.card}>
              <View style={st.cardTitleWrap}>
                <View style={[st.cardTitleIcon, { backgroundColor: COLORS.secondary + '15' }]}><Ionicons name="location-outline" size={18} color={COLORS.secondary} /></View>
                <Text style={st.cardTitleText}>Localização</Text>
              </View>
              <InfoRow icon="home-outline" label="Endereço" value={empresa.endereco} />
              <InfoRow icon="navigate-outline" label="Cidade / UF" value={`${empresa.cidade || '—'} / ${empresa.estado || '—'}`} last />
            </View>

            <TouchableOpacity style={st.editBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={st.editBtnText}>Editar Informações</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Conta */}
        <View style={[st.card, { marginTop: 8 }]}>
          <View style={st.cardTitleWrap}>
            <View style={[st.cardTitleIcon, { backgroundColor: COLORS.errorLight }]}><Ionicons name="settings-outline" size={18} color={COLORS.error} /></View>
            <Text style={st.cardTitleText}>Conta</Text>
          </View>
          <TouchableOpacity style={st.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={st.logoutText}>Sair da conta</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
        <Text style={st.versionText}>RotaJá v1.0.0</Text>
        <View style={{ height: SPACING.xxl }} />
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════
function InfoRow({ label, value, icon, last }: { label: string; value?: string | null; icon: string; last?: boolean }) {
  return (
    <View style={[st.row, !last && st.rowBorder]}>
      <View style={st.rowIconWrap}><Ionicons name={icon as any} size={16} color={COLORS.textTertiary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={st.rowValue}>{value || '—'}</Text>
      </View>
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

  gradientHeader: { paddingBottom: 32, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  avatarImg: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 46, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', paddingHorizontal: SPACING.lg },
  heroSub: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SPACING.sm, paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  heroBadgeText: { fontSize: 12, fontWeight: '600' },

  body: { padding: SPACING.lg, marginTop: -16 },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 20, marginBottom: 16, ...SHADOWS.md },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  cardTitleIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitleText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },

  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceVariant, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  lockText: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },

  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface, ...SHADOWS.sm },
  editBtnText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.primary },
  editRow: { flexDirection: 'row', marginTop: SPACING.lg },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  logoutText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.error },
  versionText: { textAlign: 'center', fontSize: 12, color: COLORS.textTertiary, marginTop: 16 },
});
