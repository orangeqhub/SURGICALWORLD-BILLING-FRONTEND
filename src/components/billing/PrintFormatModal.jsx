import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

const FORMATS = [
  {
    key: 'INVOICE',
    label: 'Invoice',
    description: 'Detailed GST invoice for official records.',
    icon: 'document-text-outline',
  },
  {
    key: 'BILL',
    label: 'Bill',
    description: 'Simple customer receipt for quick billing.',
    icon: 'receipt-outline',
  },
];

export default function PrintFormatModal({ visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} onClose={onClose} title="Select Print Format" width={440} scrollable={false}>
      <View style={styles.grid}>
        {FORMATS.map((format) => (
          <Pressable
            key={format.key}
            style={({ hovered }) => [styles.card, hovered && styles.cardHovered]}
            onPress={() => onSelect && onSelect(format.key)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={format.icon} size={26} color={COLORS.brandRed} />
            </View>
            <Text style={styles.cardTitle}>{format.label}</Text>
            <Text style={styles.cardDescription}>{format.description}</Text>
          </Pressable>
        ))}
      </View>
      <Button title="Cancel" variant="secondary" outline onPress={onClose} style={{ marginTop: SPACING.md }} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: SPACING.md },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardHovered: { borderColor: COLORS.brandRed, backgroundColor: COLORS.dangerSoft },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxs,
  },
  cardTitle: { ...TYPOGRAPHY.bodyStrong, fontSize: 15 },
  cardDescription: { ...TYPOGRAPHY.small, textAlign: 'center' },
});
