import { useEffect } from 'react';
import { Platform } from 'react-native';
import { COLORS } from '../theme/colors';

const STYLE_TAG_ID = 'sw-focus-visible-styles';

/**
 * Global keyboard-focus stylesheet (web only). Replaces the old JS-driven
 * `focusRingStyle(focused)` approach (src/utils/a11y.js), which applied an
 * outline on RNW's `focused` state - true for BOTH a mouse click and a Tab
 * press, so every click on a Button/Select/Card left an ugly rectangular
 * outline behind. CSS `:focus-visible` lets the browser make that
 * distinction natively: it matches keyboard-driven focus, not
 * pointer-driven focus, on every focusable element (div[tabindex] included,
 * not just native form controls) - no per-component logic needed.
 *
 * Mounted once at the app root (see app/_layout.js). Idempotent - checks
 * for an existing tag before inserting another, so remounts (e.g. React
 * Strict Mode's double-invoke) can't duplicate it.
 */
export default function GlobalFocusStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (document.getElementById(STYLE_TAG_ID)) return undefined;

    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = `
      button:focus,
      [tabindex]:focus,
      input:focus,
      select:focus,
      textarea:focus,
      a:focus {
        outline: none;
      }
      button:focus-visible,
      [tabindex]:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible,
      a:focus-visible {
        outline: 2px solid ${COLORS.brandBlue};
        outline-offset: 2px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
    return undefined;
  }, []);

  return null;
}
