import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '../../theme';
import { formatCurrencyCompact } from '../../utils/formatters';

const SEGMENT_COLORS = [COLORS.brandRed, COLORS.wine, COLORS.purple, COLORS.brandBlue];
const SIZE = 140;
const STROKE = 20;
const RADIUS_PX = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_PX;

export default function PaymentChart({ title = 'Payment Mode Split', data = [], style }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let offsetSoFar = 0;

  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS_PX} stroke={COLORS.border} strokeWidth={STROKE} fill="none" />
            {data.map((d, i) => {
              const length = (d.value / total) * CIRCUMFERENCE;
              const dashArray = `${length} ${CIRCUMFERENCE - length}`;
              const dashOffset = -offsetSoFar;
              offsetSoFar += length;
              return (
                <Circle
                  key={d.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS_PX}
                  stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  strokeWidth={STROKE}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
          </G>
        </Svg>

        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={d.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]} />
              <Text style={styles.legendLabel}>{d.label}</Text>
              <Text style={styles.legendValue}>{formatCurrencyCompact(d.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  legend: { flex: 1, gap: SPACING.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, ...TYPOGRAPHY.caption },
  legendValue: { ...TYPOGRAPHY.bodyStrong, fontSize: 12 },
});
