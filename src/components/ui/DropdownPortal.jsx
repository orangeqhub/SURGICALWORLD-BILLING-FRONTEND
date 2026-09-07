/**
 * Native/default implementation: no portal exists on native, and RN's
 * View stacking (elevation/zIndex) already lets an absolutely-positioned
 * dropdown render above its siblings without escaping the component tree,
 * so this just renders children in place. See DropdownPortal.web.jsx for
 * the web implementation, which portals to document.body.
 */
export default function DropdownPortal({ visible, children }) {
  if (!visible) return null;
  return children;
}
