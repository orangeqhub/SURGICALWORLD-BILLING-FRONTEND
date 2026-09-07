import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatCurrencyCompact } from '../../utils/formatters';

const CHART_HEIGHT = 160;

export default function SalesChart({ title = 'Sales Trend', data = [], style }) {
  const width = 560;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((d, i) => `${i * stepX},${CHART_HEIGHT - (d.value / max) * (CHART_HEIGHT - 24)}`)
    .join(' ');

  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`}>
        <Line x1="0" y1={CHART_HEIGHT - 1} x2={width} y2={CHART_HEIGHT - 1} stroke={COLORS.border} strokeWidth="1" />
        <Polyline points={points} fill="none" stroke={COLORS.brandRed} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <Circle
            key={i}
            cx={i * stepX}
            cy={CHART_HEIGHT - (d.value / max) * (CHART_HEIGHT - 24)}
            r="4"
            fill={COLORS.brandRed}
          />
        ))}
      </Svg>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={styles.label}>{d.label}</Text>
        ))}
      </View>
      <Text style={styles.total}>Peak: {formatCurrencyCompact(max)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xxs },
  label: { ...TYPOGRAPHY.small },
  total: { ...TYPOGRAPHY.caption, marginTop: SPACING.xs },
});
