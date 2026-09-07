import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import SearchInput from '../ui/SearchInput';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { listCustomersWithProfile } from '../../services/api/customerMasterApi';
import { fetchPartyBalance } from '../../services/api/ledgerApi';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

/**
 * Existing-customer search mode for Billing (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part I). Read-only search
 * over customerMasterApi - selecting a customer never mutates master data.
 * Inactive customers cannot be selected for a new sale.
 */
export default function CustomerSearchPanel({ branchId, onSelect }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCustomersWithProfile(branchId).then((rows) => {
      setCustomers(rows);
      setLoading(false);
    });
  }, [branchId]);

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.customerCode?.toLowerCase().includes(query.toLowerCase()) ||
      c.allianceNumber?.toLowerCase().includes(query.toLowerCase()) ||
      c.mobile?.includes(query) ||
      c.gst?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = async (customer) => {
    if (customer.status === 'Inactive') return;
    const outstanding = await fetchPartyBalance('CUSTOMER', customer.id).catch(() => 0);
    const availableCredit = Math.max((customer.creditLimit || 0) - outstanding, 0);
    onSelect({
      id: customer.id,
      customerMasterId: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      customerCode: customer.customerCode,
      allianceNumber: customer.allianceNumber,
      billingAddress: customer.billingAddress,
      gst: customer.gst,
      creditLimit: customer.creditLimit,
      outstanding,
      availableCredit,
      paymentTerms: customer.paymentTerms,
      status: customer.status,
    });
  };

  if (loading) return null;

  return (
    <View>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search name, code, alliance number, mobile or GST" style={{ marginBottom: SPACING.sm }} />
      {filtered.length === 0 ? (
        <EmptyState icon="people-outline" title="No matching customers" />
      ) : (
        <View style={{ maxHeight: 320 }}>
          {filtered.slice(0, 30).map((c) => (
            <Pressable
              key={c.id}
              style={[styles.row, c.status === 'Inactive' && styles.rowDisabled]}
              onPress={() => handleSelect(c)}
              disabled={c.status === 'Inactive'}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name} ({c.customerCode})</Text>
                <Text style={styles.meta}>{c.mobile || 'No mobile'} - Credit Limit {formatCurrency(c.creditLimit)}</Text>
              </View>
              <Badge label={c.status} tone={c.status === 'Active' ? 'success' : 'neutral'} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowDisabled: { opacity: 0.5 },
  name: { ...TYPOGRAPHY.bodyStrong },
  meta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
