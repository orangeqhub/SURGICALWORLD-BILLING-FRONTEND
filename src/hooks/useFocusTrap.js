import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside `containerRef`, focuses the first focusable
 * descendant when activated, closes on Escape, and restores focus to
 * whatever was focused before opening once deactivated. Mirrors what RN's
 * built-in web Modal already does for free - this covers custom overlays
 * (like the mobile sidebar drawer) that don't render through RN Modal.
 */
export function useFocusTrap(containerRef, { active, onClose } = {}) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (!active) return undefined;

    previouslyFocused.current = document.activeElement;

    const getFocusable = () => {
      const node = containerRef.current;
      return node ? Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    };

    const focusFirst = () => {
      const focusable = getFocusable();
      if (focusable.length) focusable[0].focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (onClose) onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [active]);
}

export default useFocusTrap;
