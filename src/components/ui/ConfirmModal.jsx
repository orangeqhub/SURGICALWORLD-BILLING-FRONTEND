import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from './Modal';
import Button from './Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  return (
    <Modal visible={visible} onClose={onClose} title={title} width={400} scrollable={false}>
      <View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.actions}>
          <Button title={cancelLabel} variant="ghost" outline onPress={onClose} style={styles.actionBtn} />
          <Button
            title={confirmLabel}
            variant={variant}
            loading={loading}
            onPress={onConfirm}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  message: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.md },
  actionBtn: { flex: 1 },
});
