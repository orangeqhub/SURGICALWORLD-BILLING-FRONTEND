import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import EmptyState from './EmptyState';

export default function DataTable({ columns = [], data = [], keyExtractor, emptyLabel = 'No records found', minWidth = 720 }) {
  const getKey = keyExtractor || ((item, index) => item.id || item.localId || String(index));

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth }}>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View key={col.key} style={[styles.cell, { flex: col.flex || 1 }]}>
                <Text style={styles.headerText}>{col.title}</Text>
              </View>
            ))}
          </View>

          {data.length === 0 ? (
            <EmptyState title={emptyLabel} icon="document-text-outline" />
          ) : (
            data.map((item, index) => (
              <View key={getKey(item, index)} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                {columns.map((col) => (
                  <View key={col.key} style={[styles.cell, { flex: col.flex || 1 }]}>
                    {col.render ? col.render(item, index) : <Text style={styles.cellText}>{item[col.key]}</Text>}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', backgroundColor: COLORS.background, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  headerText: { ...TYPOGRAPHY.label, fontSize: 11, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  rowAlt: { backgroundColor: COLORS.surfaceSoft },
  cell: { paddingRight: SPACING.sm, justifyContent: 'center' },
  cellText: { ...TYPOGRAPHY.body },
});
