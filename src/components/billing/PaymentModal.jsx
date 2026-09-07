import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const METHODS = [
  { key: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { key: 'UPI', label: 'UPI', icon: 'qr-code-outline' },
  { key: 'CARD', label: 'Card', icon: 'card-outline' },
  { key: 'CREDIT', label: 'Credit', icon: 'time-outline' },
];

export default function PaymentModal({ visible, onClose, grandTotal = 0, allowCredit = true, onConfirm }) {
  const [mode, setMode] = useState('single');
  const [method, setMethod] = useState('CASH');
  const [splits, setSplits] = useState({ CASH: '', UPI: '', CARD: '', CREDIT: '' });

  const availableMethods = allowCredit ? METHODS : METHODS.filter((m) => m.key !== 'CREDIT');

  const mixedTotal = useMemo(
    () => Object.values(splits).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [splits]
  );
  const balance = grandTotal - mixedTotal;

  const handleConfirm = () => {
    if (mode === 'single') {
      onConfirm && onConfirm({ mode: 'single', payments: [{ method, amount: grandTotal }] });
    } else {
      const payments = Object.entries(splits)
        .filter(([, v]) => Number(v) > 0)
        .map(([m, v]) => ({ method: m, amount: Number(v) }));
      onConfirm && onConfirm({ mode: 'mixed', payments });
    }
  };

  const canConfirm = mode === 'single' ? true : Math.abs(balance) < 0.5;

  return (
    <Modal visible={visible} onClose={onClose} title="Payment" width={460}>
      <Text style={styles.total}>{formatCurrency(grandTotal)}</Text>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleBtn, mode === 'single' && styles.toggleBtnActive]} onPress={() => setMode('single')}>
          <Text style={[styles.toggleText, mode === 'single' && styles.toggleTextActive]}>Single Method</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, mode === 'mixed' && styles.toggleBtnActive]} onPress={() => setMode('mixed')}>
          <Text style={[styles.toggleText, mode === 'mixed' && styles.toggleTextActive]}>Mixed Payment</Text>
        </Pressable>
      </View>

      {mode === 'single' ? (
        <View style={styles.methodGrid}>
          {availableMethods.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.methodCard, method === m.key && styles.methodCardActive]}
              onPress={() => setMethod(m.key)}
            >
              <Ionicons name={m.icon} size={22} color={method === m.key ? COLORS.brandRed : COLORS.textSecondary} />
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View>
          {availableMethods.map((m) => (
            <Input
              key={m.key}
              label={m.label}
              value={splits[m.key]}
              onChangeText={(v) => setSplits((s) => ({ ...s, [m.key]: v.replace(/[^0-9.]/g, '') }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          ))}
          <Text style={[styles.balanceText, { color: Math.abs(balance) < 0.5 ? COLORS.success : COLORS.danger }]}>
            {Math.abs(balance) < 0.5 ? 'Fully allocated' : `Balance remaining: ${formatCurrency(balance)}`}
          </Text>
        </View>
      )}

      <Button title="Confirm Payment" onPress={handleConfirm} disabled={!canConfirm} style={{ marginTop: SPACING.md }} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 28, fontWeight: '800', color: COLORS.brandRed, textAlign: 'center', marginBottom: SPACING.md },
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: COLORS.surface },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.brandRed },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  methodCard: {
    width: '47%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  methodCardActive: { borderColor: COLORS.brandRed, backgroundColor: COLORS.dangerSoft },
  methodLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  methodLabelActive: { color: COLORS.brandRed },
  balanceText: { ...TYPOGRAPHY.caption, fontWeight: '700', textAlign: 'right' },
});
