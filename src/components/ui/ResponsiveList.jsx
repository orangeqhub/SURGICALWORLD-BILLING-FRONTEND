import React from 'react';
import { View } from 'react-native';
import DataTable from './DataTable';
import EmptyState from './EmptyState';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { SPACING } from '../../theme';

/**
 * Renders a full DataTable on tablet/desktop and a stacked card list on
 * phones (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2 corrections).
 * Desktop/tablet keep the existing DataTable component untouched; `renderCard`
 * supplies the mobile card body so each screen controls its own card layout
 * without re-implementing the breakpoint logic.
 */
export default function ResponsiveList({ columns, data = [], renderCard, keyExtractor, emptyLabel = 'No records found' }) {
  const { isPhone } = useResponsiveLayout();
  const getKey = keyExtractor || ((item, index) => item.id || String(index));

  if (!isPhone) {
    return <DataTable columns={columns} data={data} keyExtractor={keyExtractor} emptyLabel={emptyLabel} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyLabel} icon="document-text-outline" />;
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      {data.map((item, index) => (
        <View key={getKey(item, index)}>{renderCard(item, index)}</View>
      ))}
    </View>
  );
}
