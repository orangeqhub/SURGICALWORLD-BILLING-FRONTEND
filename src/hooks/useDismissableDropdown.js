import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Shared close-on-Escape / close-on-click-outside behavior for a floating
 * dropdown trigger + menu (Select.jsx, BranchSelector.jsx).
 *
 * Escape closing is handled ENTIRELY on `keyup`, matching the event type
 * react-native-web's own Modal uses for its Escape-to-close
 * (ModalContent.js, also `keyup`, bubble phase) - and closes+suppresses
 * within that SAME event, in its capture phase, so there is no cross-event
 * race to get right. (An earlier version closed on `keydown` and tried to
 * separately suppress the matching `keyup`; that doesn't work reliably
 * because `setOpen(false)` from a raw `document` listener triggers a
 * synchronous React re-render - not batched - which can tear down and
 * recreate state before the browser has even dispatched the matching
 * keyup for the same physical key press, intermittently letting that
 * keyup reach Modal's listener unsuppressed and close an ancestor modal
 * along with the dropdown.)
 *
 * `openDropdownClosers` is a plain module-level set (not React state) of
 * the currently-open dropdowns' close functions, kept in sync by a normal
 * effect keyed on `open` - unlike the keydown/keyup race above, this
 * bookkeeping isn't time-critical: it only needs to reflect "is a
 * dropdown open" by the time some LATER Escape key event arrives, not
 * synchronize with the very keystroke that's closing one.
 */
const openDropdownClosers = new Set();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener(
    'keyup',
    (event) => {
      if (event.key !== 'Escape' || openDropdownClosers.size === 0) return;
      event.stopPropagation();
      const closers = Array.from(openDropdownClosers);
      closers[closers.length - 1](); // close the most-recently-opened one
    },
    true // capture: runs before Modal's own bubble-phase keyup listener
  );
}

export function useDismissableDropdown({ open, onClose, anchorRef, menuRef }) {
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    openDropdownClosers.add(onClose);

    const handleOutsidePress = (event) => {
      const target = event.target;
      const anchor = anchorRef.current;
      const menu = menuRef && menuRef.current;
      const insideAnchor = anchor && anchor.contains && anchor.contains(target);
      const insideMenu = menu && menu.contains && menu.contains(target);
      if (!insideAnchor && !insideMenu) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsidePress);
    return () => {
      openDropdownClosers.delete(onClose);
      document.removeEventListener('mousedown', handleOutsidePress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export default useDismissableDropdown;
