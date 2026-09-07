import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { timeAgo } from '../../utils/formatters';
import EmptyState from '../ui/EmptyState';

export default function ActivityTimeline({ title = 'Recent Activity', items = [], style }) {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <EmptyState icon="time-outline" title="No recent activity" />
      ) : (
        items.map((item, index) => (
          <View key={item.id || index} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: `${item.color || COLORS.brandRed}1A` }]}>
              <Ionicons name={item.icon || 'ellipse'} size={14} color={item.color || COLORS.brandRed} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  message: { ...TYPOGRAPHY.body },
  time: { ...TYPOGRAPHY.small },
});
