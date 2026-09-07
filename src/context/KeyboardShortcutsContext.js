import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';

/**
 * Lets the screen currently on top register its primary Create/Add/New
 * action so the app-wide Alt+C shortcut (see AppShell) can trigger the
 * same handler the on-screen button uses.
 *
 * Some screens have both an outer tab shell (e.g. "Quick Record" tab with
 * its own button) and an inner reusable Manager component (e.g. the
 * "Editor" tab, which owns its own Create button) mounting/unmounting as
 * the active tab changes - both may call this hook. A stack (rather than a
 * single mutable ref) keeps that safe regardless of React's effect
 * ordering: each registrant owns exactly its own entry, pushed on mount
 * and popped on cleanup, and the shortcut always fires the most recently
 * pushed (innermost/most-specific) handler.
 */
const KeyboardShortcutsContext = createContext(null);

export function KeyboardShortcutsProvider({ children }) {
  const stackRef = useRef([]);
  const nextIdRef = useRef(0);

  const pushPrimaryAction = useCallback((handler) => {
    const id = nextIdRef.current++;
    stackRef.current.push({ id, handler });
    return id;
  }, []);

  const popPrimaryAction = useCallback((id) => {
    stackRef.current = stackRef.current.filter((entry) => entry.id !== id);
  }, []);

  const triggerPrimaryAction = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (top && typeof top.handler === 'function') {
      top.handler();
    }
  }, []);

  return (
    <KeyboardShortcutsContext.Provider value={{ pushPrimaryAction, popPrimaryAction, triggerPrimaryAction }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

function useKeyboardShortcutsRegistry() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcutsRegistry must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

/**
 * Call from a screen/manager component that renders the page's primary
 * Create/Add/New button. Pass `null`/`undefined` while the action isn't
 * available (permission-gated, or a different tab is active) so Alt+C
 * correctly does nothing there.
 */
export function useRegisterPrimaryAction(handler, deps = [handler]) {
  const { pushPrimaryAction, popPrimaryAction } = useKeyboardShortcutsRegistry();

  useEffect(() => {
    if (typeof handler !== 'function') return undefined;
    const id = pushPrimaryAction(handler);
    return () => popPrimaryAction(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function usePrimaryActionTrigger() {
  const { triggerPrimaryAction } = useKeyboardShortcutsRegistry();
  return triggerPrimaryAction;
}

export default KeyboardShortcutsContext;
