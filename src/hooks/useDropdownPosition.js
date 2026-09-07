import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Platform } from 'react-native';

// useLayoutEffect is unavailable during SSR (this app statically exports
// every route - see `npm run build:web`); fall back to useEffect there so
// only the browser-side re-render pays for the (harmless) one-frame delay.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const GUTTER = 4;

/**
 * Computes viewport-relative (`position: fixed`) coordinates for a
 * portaled dropdown menu from its trigger's bounding rect, web only -
 * native dropdowns stay positioned in place (see DropdownPortal.jsx) so
 * this returns null there and callers fall back to their original
 * `position: 'absolute'` styling.
 *
 * Used by any component that opens a floating menu from a trigger
 * (Select.jsx, BranchSelector.jsx) so a menu rendered inside a modal/
 * scrollable container is never clipped by that ancestor's overflow, and
 * flips above the trigger when there isn't room below.
 */
export function useDropdownPosition(anchorRef, open, maxHeight = 240) {
  const [style, setStyle] = useState(null);

  const recompute = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const node = anchorRef.current;
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      setStyle(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < maxHeight + GUTTER && spaceAbove > spaceBelow;

    setStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      // Higher than RNW's own Modal overlay (zIndex: 9999 - see
      // ModalAnimation.js), so a Select opened inside a modal always
      // paints above it instead of relying on DOM append order (both are
      // portaled to document.body) to break the tie.
      zIndex: 100000,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + GUTTER, maxHeight: Math.max(Math.min(maxHeight, spaceAbove - GUTTER * 2), 80) }
        : { top: rect.bottom + GUTTER, maxHeight: Math.max(Math.min(maxHeight, spaceBelow - GUTTER * 2), 80) }),
    });
  }, [anchorRef, maxHeight]);

  useIsomorphicLayoutEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof window === 'undefined') {
      setStyle(null);
      return undefined;
    }
    recompute();
    window.addEventListener('resize', recompute);
    // capture:true so this also fires for scrolls on any scrollable
    // ancestor (e.g. a modal body), not just the window.
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, recompute]);

  return style;
}

export default useDropdownPosition;
