import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VeiculosService } from '@/services/veiculos.service';
import { Input } from './Input';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const TIPOS_VEICULOS = {
  pesados: ['Bitrem', 'Carreta', 'Carreta LS', 'Rodotrem', 'Vanderleia'],
  medios: ['Bitruck', 'Truck'],
  leves: ['3x4', 'Fiorino', 'Toco'],
};
const TIPOS_CARROCERIA = {
  fechadas: ['Baú', 'Baú Frigorífico', 'Baú Refrigerado', 'Sider'],
  abertas: ['Caçamba Grade Baixa', 'Graneleiro', 'Plataforma', 'Prancha'],
};

interface Props { motoristaId: string; onVeiculosChange?: (tipos: string[]) => void; }

export function VeiculosManager({ motoristaId, onVeiculosChange }: Props) {
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tipoVeiculo: '', modelo: '', placa: '', tipoCarroceria: '' });

  const load = useCallback(async () => {
    const { data } = await VeiculosService.listarPorMotorista(motoristaId);
    setVeiculos(data);
    setLoading(false);
    if (onVeiculosChange) onVeiculosChange(data.map(v => v.tipo_veiculo));
  }, [motoristaId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ tipoVeiculo: '', modelo: '', placa: '', tipoCarroceria: '' });
    setModalVisible(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setForm({ tipoVeiculo: v.tipo_veiculo, modelo: v.modelo || '', placa: v.placa || '', tipoCarroceria: v.tipo_carroceria || '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.tipoVeiculo) { Alert.alert('Atenção', 'Selecione o tipo do veículo.'); return; }
    if (!form.placa.trim()) { Alert.alert('Atenção', 'Informe a placa do veículo.'); return; }
    setSaving(true);
    if (editingId) {
      const r = await VeiculosService.atualizar(editingId, {
        tipo_veiculo: form.tipoVeiculo, modelo: form.modelo, placa: form.placa, tipo_carroceria: form.tipoCarroceria,
      });
      if (r.success) { Alert.alert('Sucesso', 'Veículo atualizado!'); setModalVisible(false); load(); }
      else Alert.alert('Erro', r.error || 'Erro ao atualizar.');
    } else {
      const r = await VeiculosService.adicionar({
        motoristaId, tipoVeiculo: form.tipoVeiculo, modelo: form.modelo, placa: form.placa, tipoCarroceria: form.tipoCarroceria,
      });
      if (r.success) { Alert.alert('Sucesso', 'Veículo adicionado!'); setModalVisible(false); load(); }
      else Alert.alert('Erro', r.error || 'Erro ao adicionar.');
    }
    setSaving(false);
  };

  const handleRemove = (v: any) => {
    Alert.alert('Remover Veículo', `Deseja remover ${v.tipo_veiculo}${v.placa ? ` (${v.placa})` : ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        const r = await VeiculosService.remover(v.id);
        if (r.success) { load(); } else Alert.alert('Erro', r.error || 'Erro ao remover.');
      }},
    ]);
  };

  if (loading) return <View style={s.loadWrap}><ActivityIndicator color={COLORS.primary} /><Text style={s.loadText}>Carregando veículos...</Text></View>;

  return (
    <View>
      {/* Header da seção */}
      <View style={s.sectionHeader}>
        <View style={[s.iconWrap, { backgroundColor: COLORS.primaryFaded }]}>
          <Ionicons name="car-sport" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Meus Veículos</Text>
          <Text style={s.sectionSub}>{veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={s.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de veículos */}
      {veiculos.length === 0 ? (
        <TouchableOpacity style={s.emptyCard} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={36} color={COLORS.textTertiary} />
          <Text style={s.emptyTitle}>Nenhum veículo cadastrado</Text>
          <Text style={s.emptySub}>Toque para adicionar seu primeiro veículo</Text>
        </TouchableOpacity>
      ) : (
        veiculos.map((v, i) => (
          <View key={v.id} style={[s.veiculoCard, i === veiculos.length - 1 && { marginBottom: 0 }]}>
            <View style={s.veiculoTop}>
              <View style={[s.veiculoIcon, { backgroundColor: COLORS.primaryFaded }]}>
                <Ionicons name={(VEICULO_ICONS[v.tipo_veiculo] || 'car-outline') as any} size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.veiculoTipo}>{v.tipo_veiculo}</Text>
                {v.modelo ? <Text style={s.veiculoModelo}>{v.modelo}</Text> : null}
              </View>
              <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(v)}>
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => handleRemove(v)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <View style={s.veiculoChips}>
              {v.placa ? (
                <View style={[s.chip, s.chipAccent]}><Text style={s.chipLabel}>Placa</Text><Text style={[s.chipVal, { color: COLORS.primary }]}>{v.placa}</Text></View>
              ) : null}
              {v.tipo_carroceria ? (
                <View style={s.chip}><Text style={s.chipLabel}>Carroceria</Text><Text style={s.chipVal}>{v.tipo_carroceria}</Text></View>
              ) : null}
            </View>
          </View>
        ))
      )}

      {/* Modal Adicionar/Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Editar Veículo' : 'Novo Veículo'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {/* Tipo Veículo - seletor categorizado */}
              <Text style={s.fieldLabel}>Tipo do Veículo *</Text>
              {Object.entries(TIPOS_VEICULOS).map(([cat, tipos]) => (
                <View key={cat}>
                  <Text style={s.categoryLabel}>{cat === 'pesados' ? 'Pesados' : cat === 'medios' ? 'Médios' : 'Leves'}</Text>
                  <View style={s.tipoGrid}>
                    {tipos.map(t => (
                      <TouchableOpacity key={t} style={[s.tipoItem, form.tipoVeiculo === t && s.tipoItemActive]} onPress={() => setForm(p => ({ ...p, tipoVeiculo: t }))}>
                        <Text style={[s.tipoText, form.tipoVeiculo === t && s.tipoTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
              }

              <Input label="Modelo (opcional)" value={form.modelo} onChangeText={(v: string) => setForm(p => ({ ...p, modelo: v }))} placeholder="Ex: Mercedes Atego 2430" />
              <Input label="Placa *" value={form.placa} onChangeText={(v: string) => setForm(p => ({ ...p, placa: v }))} placeholder="Ex: ABC1D23" autoCapitalize="characters" />

              <Text style={[s.fieldLabel, { marginTop: 12 }]}>Tipo de Carroceria</Text>
              {Object.entries(TIPOS_CARROCERIA).map(([cat, tipos]) => (
                <View key={cat}>
                  <Text style={s.categoryLabel}>{cat === 'fechadas' ? 'Fechadas' : 'Abertas'}</Text>
                  <View style={s.carroceriaGrid}>
                    {tipos.map(c => (
                      <TouchableOpacity key={c} style={[s.carroceriaItem, form.tipoCarroceria === c && s.carroceriaItemActive]} onPress={() => setForm(p => ({ ...p, tipoCarroceria: c }))}>
                        <Text style={[s.carroceriaText, form.tipoCarroceria === c && s.carroceriaTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
              }

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.saveBtnText}>{editingId ? 'Salvar Alterações' : 'Adicionar Veículo'}</Text></>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  loadWrap: { padding: 20, alignItems: 'center', gap: 8 },
  loadText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  sectionSub: { fontSize: 12, color: COLORS.textTertiary, marginTop: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full },
  addBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  emptyCard: { alignItems: 'center', padding: 30, backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  emptyTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textSecondary, marginTop: 10 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary, marginTop: 4 },
  veiculoCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOWS.md },
  veiculoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  veiculoIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  veiculoTipo: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  veiculoModelo: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceVariant },
  veiculoChips: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  chip: { backgroundColor: COLORS.surfaceVariant, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  chipAccent: { backgroundColor: COLORS.primaryFaded },
  chipLabel: { fontSize: 10, color: COLORS.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  categoryLabel: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textTertiary, marginTop: SPACING.sm, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipoItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceVariant, borderWidth: 1.5, borderColor: COLORS.border },
  tipoItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tipoTextActive: { color: COLORS.white },
  carroceriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  carroceriaItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceVariant, borderWidth: 1.5, borderColor: COLORS.border },
  carroceriaItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  carroceriaText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  carroceriaTextActive: { color: COLORS.white },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.md },
  saveBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
});
