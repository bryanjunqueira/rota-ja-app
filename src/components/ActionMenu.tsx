import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '@/config/theme';

export interface ActionOption {
  label: string;
  icon: any;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  options: ActionOption[];
  title?: string;
}

export function ActionMenu({ visible, onClose, options, title }: ActionMenuProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}
          
          <View style={styles.optionsContainer}>
            {options.map((opt, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[
                  styles.option, 
                  idx === options.length - 1 && { borderBottomWidth: 0 }
                ]} 
                onPress={() => {
                  onClose();
                  // Pequeno delay para garantir que o modal fechou antes de abrir o próximo (evita conflitos no iOS)
                  setTimeout(opt.onPress, 300);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconBg, 
                  { backgroundColor: opt.variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(32, 148, 243, 0.1)' }
                ]}>
                  <Ionicons 
                    name={opt.icon} 
                    size={20} 
                    color={opt.variant === 'danger' ? COLORS.error : COLORS.primary} 
                  />
                </View>
                <Text style={[
                  styles.optionText, 
                  opt.variant === 'danger' && { color: COLORS.error }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    paddingBottom: 40
  },
  content: { 
    backgroundColor: '#fff', 
    borderRadius: 30, 
    width: '92%', 
    padding: 20, 
    ...SHADOWS.xl 
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
    alignItems: 'center'
  },
  title: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: COLORS.textTertiary, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  optionsContainer: {
    marginBottom: 10
  },
  option: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9', 
    gap: 14 
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionText: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  cancelBtn: {
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary
  }
});
