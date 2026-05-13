import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';
import { Button } from './Button';

interface CancelModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customMessage: string) => void;
  title: string;
  subtitle: string;
  reasons: string[];
  loading?: boolean;
}

export function CancelModal({ visible, onClose, onConfirm, title, subtitle, reasons, loading }: CancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason, customMessage);
  };

  // Reseta o estado quando o modal fecha/abre
  React.useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setCustomMessage('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            ref={scrollRef}
            style={styles.scroll} 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.reasonsList}>
              {reasons.map((reason) => (
                <TouchableOpacity 
                  key={reason}
                  style={[styles.reasonItem, selectedReason === reason && styles.reasonItemActive]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, selectedReason === reason && styles.radioActive]}>
                    {selectedReason === reason && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextActive]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Informações adicionais</Text>
            <TextInput
              style={styles.input}
              placeholder="Descreva brevemente o motivo..."
              multiline
              numberOfLines={3}
              value={customMessage}
              onChangeText={setCustomMessage}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
              placeholderTextColor={COLORS.textTertiary}
            />

            <View style={styles.footer}>
              <Button title="Voltar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <View style={{ width: SPACING.md }} />
              <Button 
                title={loading ? "Enviando..." : "Confirmar"} 
                onPress={handleConfirm} 
                disabled={!selectedReason || loading}
                loading={loading}
                variant="danger"
                style={{ flex: 2 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  content: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '85%',
    ...SHADOWS.lg 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    marginTop: 4 
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    marginBottom: Platform.OS === 'ios' ? 20 : 0
  },
  reasonsList: { 
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 8
  },
  reasonItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12 
  },
  reasonItemActive: { 
    backgroundColor: '#fff',
    ...SHADOWS.sm
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioActive: {
    borderColor: COLORS.error
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error
  },
  reasonText: { 
    fontSize: 15, 
    color: COLORS.textPrimary,
    fontWeight: '500'
  },
  reasonTextActive: { 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  label: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginBottom: 10,
    marginLeft: 4
  },
  input: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 15, 
    textAlignVertical: 'top',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    minHeight: 100, 
    marginBottom: 32,
    color: COLORS.textPrimary
  },
  footer: { 
    flexDirection: 'row',
    paddingBottom: 10
  },
});
