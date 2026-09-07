import { useContext } from 'react';
import BillingContext from '../context/BillingContext';

export function useBillingCart() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBillingCart must be used within a BillingProvider');
  }
  return context;
}

export default useBillingCart;
