import { createPortal } from 'react-dom';

/**
 * Web implementation: portals the dropdown menu straight to
 * `document.body`, so it's never clipped by a modal's `overflow: hidden`
 * card or a scrollable body, and always paints above everything else
 * regardless of any ancestor's z-index/stacking context. Positioning
 * itself is computed separately (see useDropdownPosition.js) from the
 * trigger's bounding rect and applied to the portaled content as
 * `position: fixed` styles by the caller.
 */
export default function DropdownPortal({ visible, children }) {
  if (!visible || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
