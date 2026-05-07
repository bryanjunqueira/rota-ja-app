/**
 * CidadeEstadoSelect — Modal com busca de cidade/estado (como no web)
 * Abre uma modal com campo de busca e lista de cidades por estado.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const ESTADOS_CIDADES: Record<string, { nome: string; cidades: string[] }> = {
  AC: { nome: 'Acre', cidades: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'] },
  AL: { nome: 'Alagoas', cidades: ['Maceió', 'Arapiraca', 'Palmeira dos Índios'] },
  AP: { nome: 'Amapá', cidades: ['Macapá', 'Santana', 'Laranjal do Jari'] },
  AM: { nome: 'Amazonas', cidades: ['Manaus', 'Parintins', 'Itacoatiara'] },
  BA: { nome: 'Bahia', cidades: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro'] },
  CE: { nome: 'Ceará', cidades: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'] },
  DF: { nome: 'Distrito Federal', cidades: ['Brasília'] },
  ES: { nome: 'Espírito Santo', cidades: ['Vitória', 'Vila Velha', 'Cariacica', 'Serra', 'Guarapari'] },
  GO: { nome: 'Goiás', cidades: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'] },
  MA: { nome: 'Maranhão', cidades: ['São Luís', 'Imperatriz', 'Timon', 'Caxias', 'Codó'] },
  MT: { nome: 'Mato Grosso', cidades: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra'] },
  MS: { nome: 'Mato Grosso do Sul', cidades: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'] },
  MG: { nome: 'Minas Gerais', cidades: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Guaxupé'] },
  PA: { nome: 'Pará', cidades: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas'] },
  PB: { nome: 'Paraíba', cidades: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux'] },
  PR: { nome: 'Paraná', cidades: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais'] },
  PE: { nome: 'Pernambuco', cidades: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'] },
  PI: { nome: 'Piauí', cidades: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano'] },
  RJ: { nome: 'Rio de Janeiro', cidades: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes'] },
  RN: { nome: 'Rio Grande do Norte', cidades: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante'] },
  RS: { nome: 'Rio Grande do Sul', cidades: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí'] },
  RO: { nome: 'Rondônia', cidades: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'] },
  RR: { nome: 'Roraima', cidades: ['Boa Vista', 'Rorainópolis', 'Caracaraí'] },
  SC: { nome: 'Santa Catarina', cidades: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó'] },
  SP: { nome: 'São Paulo', cidades: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba'] },
  SE: { nome: 'Sergipe', cidades: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana'] },
  TO: { nome: 'Tocantins', cidades: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional'] },
};

// Lista flat de todas as cidades
const TODAS_CIDADES = Object.entries(ESTADOS_CIDADES).flatMap(([sigla, estado]) =>
  estado.cidades.map(cidade => ({
    value: `${cidade}, ${sigla}`,
    cidade,
    estado: estado.nome,
    sigla,
  }))
);

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CidadeEstadoSelect({ value, onChange, placeholder = 'Selecione cidade' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return TODAS_CIDADES;
    const term = search.toLowerCase();
    return TODAS_CIDADES.filter(
      c => c.cidade.toLowerCase().includes(term) || c.estado.toLowerCase().includes(term) || c.sigla.toLowerCase().includes(term)
    );
  }, [search]);

  const selected = TODAS_CIDADES.find(c => c.value === value);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="location-outline" size={16} color={selected ? COLORS.primary : COLORS.textTertiary} />
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]} numberOfLines={1}>
          {selected ? selected.value : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cidade ou estado..."
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Clear selection */}
          {selected && (
            <TouchableOpacity style={styles.clearSelection} onPress={() => { onChange(''); setOpen(false); setSearch(''); }}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.clearText}>Limpar seleção</Text>
            </TouchableOpacity>
          )}

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = value === item.value;
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => { onChange(item.value); setOpen(false); setSearch(''); }}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'location-outline'}
                    size={18}
                    color={isSelected ? COLORS.primary : COLORS.textTertiary}
                  />
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.itemCity, isSelected && { color: COLORS.primary }]}>{item.cidade}</Text>
                    <Text style={styles.itemState}>{item.estado} ({item.sigla})</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyList}>Nenhuma cidade encontrada.</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  triggerText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  triggerPlaceholder: { color: COLORS.textTertiary },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: SPACING.md, paddingHorizontal: SPACING.md, height: 44,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },

  clearSelection: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
  },
  clearText: { fontSize: FONT_SIZES.sm, color: COLORS.error },

  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  itemSelected: { backgroundColor: COLORS.primaryFaded },
  itemCity: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.textPrimary },
  itemState: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  emptyList: { textAlign: 'center', padding: SPACING.xl, color: COLORS.textTertiary, fontSize: FONT_SIZES.sm },
});
