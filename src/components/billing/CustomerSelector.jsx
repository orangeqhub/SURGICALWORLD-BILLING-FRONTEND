import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import Modal from '../ui/Modal';
import SearchInput from '../ui/SearchInput';

export default function CustomerSelector({ customer, customers = [], onSelect, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.mobile?.includes(query)
  );

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="person-circle-outline" size={20} color={COLORS.brandRed} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{customer?.name || 'Walk-in Customer'}</Text>
          {customer?.mobile ? <Text style={styles.mobile}>{customer.mobile}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title="Select Customer" width={440}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search by name or mobile" style={{ marginBottom: SPACING.md }} />
        <Pressable
          style={styles.addNew}
          onPress={() => {
            setOpen(false);
            onAddNew && onAddNew();
          }}
        >
          <Ionicons name="person-add-outline" size={18} color={COLORS.brandRed} />
          <Text style={styles.addNewText}>Add New Customer</Text>
        </Pressable>
        {filtered.map((c) => (
          <Pressable
            key={c.id}
            style={styles.option}
            onPress={() => {
              onSelect && onSelect(c);
              setOpen(false);
            }}
          >
            <Text style={styles.optionName}>{c.name}</Text>
            {c.mobile ? <Text style={styles.optionMeta}>{c.mobile}</Text> : null}
          </Pressable>
        ))}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  name: { ...TYPOGRAPHY.bodyStrong },
  mobile: { ...TYPOGRAPHY.small },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  addNewText: { color: COLORS.brandRed, fontWeight: '700', fontSize: 14 },
  option: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionName: { ...TYPOGRAPHY.bodyStrong },
  optionMeta: { ...TYPOGRAPHY.small },
});
