import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';
import { useBranch } from '../../hooks/useBranch';
import { BRANCHES } from '../../constants/branches';
import { focusRingStyle } from '../../utils/a11y';
import DropdownPortal from '../ui/DropdownPortal';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import { useDismissableDropdown } from '../../hooks/useDismissableDropdown';

const MAX_MENU_HEIGHT = 300;

export default function BranchSelector({ value, onChange, allowAll = true, style }) {
  const { branches } = useBranch();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const pathname = usePathname();
  const activeBranches = branches && branches.length > 0 ? branches : BRANCHES;
  const options = allowAll ? [{ id: 'ALL', name: 'All Branches' }, ...activeBranches] : activeBranches;
  const selected = options.find((b) => b.id === value) || options[0];
  const menuPosition = useDropdownPosition(anchorRef, open, MAX_MENU_HEIGHT);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Click-outside and Escape-to-close, with the Escape suppressed on the
  // matching keyup so it can't also close an ancestor Modal (see
  // useDismissableDropdown.js).
  useDismissableDropdown({ open, onClose: () => setOpen(false), anchorRef, menuRef });

  const openMenu = () => {
    if (options.length === 0) return;
    const currentIndex = options.findIndex((b) => b.id === selected?.id);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
    setOpen(true);
  };

  const selectOption = (option) => {
    if (!option) return;
    onChange && onChange(option.id);
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
          // best-effort
        }
      }
      return next;
    });
  };

  const handleTriggerKeyDown = (event) => {
    const key = event.key;
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
      setOpen(false);
    }
  };

  return (
    <View ref={anchorRef} style={[styles.wrap, style, open && styles.wrapOpen]}>
      <Pressable
        style={({ focused }) => [styles.trigger, focusRingStyle(focused)]}
        onPress={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name="business-outline" size={14} color={COLORS.brandRed} />
        <Text style={styles.triggerText} numberOfLines={1} ellipsizeMode="tail">
          {selected?.name}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textSecondary} />
      </Pressable>

      {open && Platform.OS !== 'web' ? (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
      ) : null}
      <DropdownPortal visible={open}>
        <View ref={menuRef} style={[styles.menu, menuPosition, SHADOWS.raised]}>
          <FlatList
            ref={listRef}
            data={options}
            keyExtractor={(item) => item.id}
            style={styles.menuList}
            showsVerticalScrollIndicator
            renderItem={({ item, index }) => (
              <Pressable
                style={({ hovered, focused }) => [
                  styles.option,
                  item.id === selected?.id && styles.optionActive,
                  index === highlightIndex && styles.optionHighlighted,
                  hovered && item.id !== selected?.id && styles.optionHovered,
                  focusRingStyle(focused),
                ]}
                onPress={() => selectOption(item)}
                onHoverIn={() => setHighlightIndex(index)}
                accessibilityRole="menuitem"
              >
                <Text style={[styles.optionText, item.id === selected?.id && styles.optionTextActive]}>
                  {item.name}
                </Text>
                {item.id === selected?.id ? <Ionicons name="checkmark" size={18} color={COLORS.brandRed} /> : null}
              </Pressable>
            )}
          />
        </View>
      </DropdownPortal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 220, minWidth: 160, position: 'relative', zIndex: 1 },
  wrapOpen: { zIndex: 9999 },
  overlay: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: 20000,
    height: 20000,
    zIndex: 9998,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: SPACING.sm,
    height: 40,
    borderRadius: RADIUS.pill,
  },
  triggerText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  menu: {
    position: 'absolute',
    top: 45,
    right: 0,
    width: '100%',
    minWidth: 200,
    maxHeight: 300,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 24,
  },
  menuList: { maxHeight: 300 },
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
  optionText: { fontSize: 14, color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.brandRed, fontWeight: '700' },
});
