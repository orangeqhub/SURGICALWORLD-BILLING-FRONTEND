/**
 * Historically this returned an inline outline style whenever a Pressable's
 * `focused` render-prop was true - but RNW sets that state on a mouse click
 * as well as a Tab press, so every click left an ugly rectangular outline
 * behind (ANDROID/iOS don't have this problem; it's web-only). The focus
 * ring is now handled globally and correctly via CSS `:focus-visible`
 * (see src/components/GlobalFocusStyles.jsx, mounted once in app/_layout.js),
 * which the browser itself only matches for keyboard-driven focus. This
 * function is kept as a no-op so the many existing
 * `style={({ focused }) => [..., focusRingStyle(focused)]}` call sites
 * don't need to be touched individually - it always returns null.
 */
export function focusRingStyle() {
  return null;
}

/**
 * Space/Enter activation helper for Pressable-based controls whose
 * accessibilityRole isn't "button" (checkbox, tab, menuitem...). RNW's
 * Pressable only auto-triggers onPress for Space when the DOM role is
 * "button"/"menuitem", so non-button roles need to opt in manually.
 * Enter already works globally in RNW regardless of role.
 */
export function handleActivationKeyDown(onActivate) {
  return (event) => {
    const key = event?.nativeEvent?.key ?? event?.key;
    if (key === ' ' || key === 'Spacebar') {
      if (event.preventDefault) event.preventDefault();
      onActivate();
    }
  };
}
