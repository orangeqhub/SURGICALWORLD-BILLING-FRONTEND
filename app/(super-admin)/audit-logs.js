import { Redirect } from 'expo-router';

/**
 * Audit Logs is removed from the Super Admin menu. The route is kept so any
 * stale link/bookmark doesn't crash - it just sends the user back to the
 * dashboard instead of rendering the (now unused) audit view.
 */
export default function AuditLogsScreen() {
  return <Redirect href="/(super-admin)/dashboard" />;
}
