import { Redirect } from 'expo-router';

/**
 * Held Bills now lives inline on the Billing page as a Draft Bills section.
 * The route is kept so any stale link doesn't crash - it just sends the
 * user back to Billing instead of rendering the old standalone list.
 */
export default function HeldBillsScreen() {
  return <Redirect href="/(employee)/billing" />;
}
