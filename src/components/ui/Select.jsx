import React, { useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../theme';
import { focusRingStyle } from '../../utils/a11y';
import DropdownPortal from './DropdownPortal';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import { useDismissableDropdown } from '../../hooks/useDismissableDropdown';

const MAX_DROPDOWN_WIDTH = 420;
const MAX_DROPDOWN_HEIGHT = 220;

export default function Select({ label, value, options = [], onChange, placeholder = 'Select', disabled = false, style }) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const selected = options.find((o) => o.value === value);
  // Portaled to document.body on web (see DropdownPortal.web.jsx) so the
  // menu is never clipped by a modal's overflow:hidden card or a
  // scrollable ancestor; positioned from the trigger's own bounding rect.
  const menuPosition = useDropdownPosition(anchorRef, open, MAX_DROPDOWN_HEIGHT);

  const closeMenu = () => setOpen(false);

  // Click-outside and Escape-to-close, with the Escape suppressed on the
  // matching keyup so it can't also close an ancestor Modal (see
  // useDismissableDropdown.js).
  useDismissableDropdown({ open, onClose: closeMenu, anchorRef, menuRef });

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    const currentIndex = options.findIndex((o) => o.value === value);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
    setOpen(true);
  };

  const selectOption = (option) => {
    if (!option) return;
    onChange && onChange(option.value);
    setOpen(false);
  };

  const moveHighlight = (delta) => {
    setHighlightIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = (base + delta + options.length) % options.length;
      if (listRef.current && listRef.current.scrollToIndex) {
        try {
          listRef.current.scrollToIndex({ index: next, viewPosition: 0.5 });
        } catch {
          // scroll best-effort; ignore out-of-range errors
        }
      }
      return next;
    });
  };

  const handleTriggerKeyDown = (event) => {
    const key = event.key;
    if (disabled) return;
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === ' ' || key === 'Spacebar' || key === 'Enter') {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
    } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      selectOption(options[highlightIndex]);
    } else if (key === 'Escape') {
      // Closing is handled entirely by the global keyup listener in
      // useDismissableDropdown.js - see its comment for why closing here
      // on keydown would race with that and intermittently let the
      // Escape leak through to close an ancestor Modal too.
      event.preventDefault();
    } else if (key === 'Tab') {
      closeMenu();
    }
  };

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View ref={anchorRef} style={styles.anchor}>
        <Pressable
          style={({ focused }) => [styles.trigger, disabled && styles.triggerDisabled, focusRingStyle(focused)]}
          onPress={() => (open ? closeMenu() : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
        >
          <Text
            style={[styles.triggerText, !selected && styles.triggerPlaceholder]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selected ? selected.label : placeholder}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
        </Pressable>

        <DropdownPortal visible={open}>
          <View ref={menuRef} style={[styles.menu, menuPosition, SHADOWS.raised]}>
            <FlatList
              ref={listRef}
              data={options}
              keyExtractor={(item) => String(item.value)}
              style={styles.menuList}
              showsVerticalScrollIndicator
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ hovered, focused }) => [
                    styles.option,
                    item.value === value && styles.optionActive,
                    index === highlightIndex && styles.optionHighlighted,
                    hovered && item.value !== value && styles.optionHovered,
                    focusRingStyle(focused),
                  ]}
                  onPress={() => selectOption(item)}
                  onHoverIn={() => setHighlightIndex(index)}
                  accessibilityRole="menuitem"
                >
                  <Text
                    style={[styles.optionText, item.value === value && styles.optionTextActive]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.label}
                  </Text>
                  {item.value === value ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.brandRed} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </DropdownPortal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md, position: 'relative', zIndex: 1 },
  wrapperOpen: { zIndex: 9999, elevation: 24 },
  label: { ...TYPOGRAPHY.label, marginBottom: SPACING.xxs },
  anchor: { position: 'relative', zIndex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    height: 50,
  },
  triggerText: { flex: 1, fontSize: 15, color: COLORS.textPrimary, marginRight: SPACING.xs },
  triggerPlaceholder: { color: COLORS.textMuted },
  triggerDisabled: { opacity: 0.5 },
  menu: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    maxWidth: MAX_DROPDOWN_WIDTH,
    maxHeight: MAX_DROPDOWN_HEIGHT,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 24,
  },
  menuList: { maxHeight: MAX_DROPDOWN_HEIGHT },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  optionHovered: { backgroundColor: COLORS.background },
  optionActive: { backgroundColor: COLORS.dangerSoft },
  optionHighlighted: { backgroundColor: COLORS.background },
  optionText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, marginRight: SPACING.xs },
  optionTextActive: { color: COLORS.brandRed, fontWeight: '700' },
});
