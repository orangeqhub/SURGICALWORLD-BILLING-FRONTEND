import React from 'react';
import { View, Text, Pressable, Modal as RNModal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../../theme';

export default function Modal({ visible, onClose, title, children, width = 480, scrollable = true }) {
  // `scrollable` is kept as a no-op prop for backward compatibility - the
  // body is always a ScrollView now. RNW's ScrollView defaults to
  // `overflow-y: auto`, which is visually identical to a plain View
  // whenever content fits (no scrollbar, nothing changes for short
  // modals like ConfirmModal), but - unlike a plain View - actually lets
  // a tall form scroll into view instead of being clipped by the card's
  // `overflow: hidden` or spilling past it. `scrollable={false}` used to
  // opt out of this and was exactly what caused long forms (e.g. "Generate
  // Payroll") to render their bottom fields/button off-screen.
  void scrollable;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxWidth: width }, SHADOWS.raised]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(32,36,99,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    maxHeight: '85%',
    // Clip anything the flex children below can't fit in - without this,
    // a tall form's fields render past the card's bottom edge (and the
    // screen) instead of being scrolled inside it.
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    // Stays a fixed height so it (and the close button) never scrolls
    // away, regardless of how tall the body content is.
    flexShrink: 0,
  },
  title: { ...TYPOGRAPHY.h3 },
  body: {
    paddingHorizontal: SPACING.lg,
    // Take the remaining height under the fixed header and let the
    // ScrollView's own overflow handle anything past that (minHeight: 0
    // is required for a flex child to shrink below its content size
    // instead of pushing the card taller than its maxHeight).
    flex: 1,
    minHeight: 0,
  },
  bodyContent: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
});
