import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Tabs from '../ui/Tabs';
import CustomerSearchPanel from './CustomerSearchPanel';
import { SPACING, TYPOGRAPHY, COLORS } from '../../theme';

/**
 * Asked at bill-generation time (Proceed to Payment). Two modes:
 * - Walk-In: the original fast flow (name/mobile snapshot only, both
 *   optional) - preserved exactly, still the default tab.
 * - Existing Customer: search the real Customer Master (see
 *   docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part I) and reuse their
 *   profile for this bill. Selecting a customer never edits master data.
 */
export default function QuickCustomerModal({ visible, onClose, onSave, branchId }) {
  const [mode, setMode] = useState('walkin');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (visible) {
      setMode('walkin');
      setName('');
      setMobile('');
      setErrors({});
      setSelectedCustomer(null);
    }
  }, [visible]);

  const handleWalkInSave = () => {
    const nextErrors = {};
    if (mobile && !/^\d{10}$/.test(mobile)) nextErrors.mobile = 'Enter a valid 10-digit mobile number';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSave && onSave({ name: name.trim() || 'Walk-in Customer', mobile: mobile.trim() || '-' });
  };

  const handleExistingConfirm = () => {
    if (!selectedCustomer) return;
    onSave && onSave(selectedCustomer);
  };

  const warnings = [];
  if (selectedCustomer) {
    if (selectedCustomer.outstanding > selectedCustomer.creditLimit && selectedCustomer.creditLimit > 0) {
      warnings.push('Credit limit exceeded for this customer.');
    } else if (selectedCustomer.availableCredit < selectedCustomer.creditLimit * 0.1 && selectedCustomer.creditLimit > 0) {
      warnings.push('Available credit is low.');
    }
  }

  return (
    <Modal visible={visible} onClose={onClose} title="Customer Details" width={480}>
      <Tabs
        tabs={[
          { key: 'walkin', label: 'Quick / Walk-In' },
          { key: 'existing', label: 'Existing Customer' },
        ]}
        active={mode}
        onChange={setMode}
      />

      {mode === 'walkin' ? (
        <View>
          <Text style={styles.hint}>Enter the customer's name and contact for this bill (optional).</Text>
          <Input label="Customer Name" value={name} onChangeText={setName} placeholder="Walk-in Customer" />
          <Input
            label="Customer Contact"
            value={mobile}
            onChangeText={setMobile}
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.mobile}
          />
          <View style={{ marginTop: SPACING.sm }}>
            <Button title="Continue" onPress={handleWalkInSave} />
          </View>
        </View>
      ) : (
        <View>
          {!selectedCustomer ? (
            <CustomerSearchPanel branchId={branchId} onSelect={setSelectedCustomer} />
          ) : (
            <View>
              <View style={styles.selectedBox}>
                <Text style={styles.selectedName}>{selectedCustomer.name} ({selectedCustomer.customerCode})</Text>
                <Text style={styles.selectedMeta}>{selectedCustomer.billingAddress || 'No address on file'}</Text>
                <Text style={styles.selectedMeta}>GST: {selectedCustomer.gst || '-'}  ·  Terms: {selectedCustomer.paymentTerms}</Text>
                <Text style={styles.selectedMeta}>Credit Limit: ₹{selectedCustomer.creditLimit}  ·  Outstanding: ₹{selectedCustomer.outstanding}  ·  Available: ₹{selectedCustomer.availableCredit}</Text>
              </View>
              {warnings.map((w) => (
                <Text key={w} style={styles.warning}>{w}</Text>
              ))}
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
                <Button title="Change" variant="secondary" outline onPress={() => setSelectedCustomer(null)} style={{ flex: 1 }} />
                <Button title="Continue" onPress={handleExistingConfirm} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </View>
      )}
    </Modal>
  );
}

const styles = {
  hint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.md },
  selectedBox: { backgroundColor: COLORS.background, borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.sm, gap: 2 },
  selectedName: { ...TYPOGRAPHY.bodyStrong },
  selectedMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  warning: { ...TYPOGRAPHY.caption, color: COLORS.warning, fontWeight: '700', marginBottom: SPACING.xs },
};
