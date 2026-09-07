import React, { createContext, useCallback, useMemo, useState } from 'react';
import { round2, allocateInvoiceDiscount } from '../utils/discountAllocation';

export const BillingContext = createContext(null);

const GST_INCLUDED_IN_PRICE = false;
const UNSELLABLE_BATCH_STATUSES = ['EXPIRED', 'BLOCKED', 'DEPLETED'];

export function BillingProvider({ children }) {
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);

  /**
   * onBlocked(reason) fires synchronously when the requested add/increase
   * can't happen, so the calling screen can surface a clear message - the
   * cap is enforced here in context logic, not only in the Batch Picker UI.
   */
  const addItem = useCallback((product, stock, batch, onBlocked) => {
    if (batch && UNSELLABLE_BATCH_STATUSES.includes(batch.status)) {
      onBlocked && onBlocked('BATCH_UNSELLABLE');
      return;
    }
    setItems((prev) => {
      const cartKey = batch ? `${product.id}::${batch.id}` : product.id;
      const existing = prev.find((i) => (batch ? i.batchId === batch.id : !i.batchId) && i.productId === product.id);
      const maxQty = batch ? batch.available ?? Infinity : stock?.available ?? Infinity;

      if (existing) {
        if (existing.quantity >= maxQty) {
          onBlocked && onBlocked('MAX_QUANTITY');
          return prev;
        }
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
      }

      if (maxQty <= 0) {
        onBlocked && onBlocked('OUT_OF_STOCK');
        return prev;
      }

      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          name: product.name,
          unit: product.unit,
          sellingPrice: product.sellingPrice,
          originalPrice: product.sellingPrice,
          gst: product.gst,
          quantity: 1,
          maxQuantity: maxQty,
          discountAmount: 0,
          batchId: batch?.id || null,
          batchNumber: batch?.batchNumber || null,
          batchExpiryDate: batch?.expiryDate || null,
        },
      ];
    });
  }, []);

  /** Requires PERMISSIONS.PRICE_EDIT - enforced by the calling screen, not here. */
  const updateItemPrice = useCallback((item, nextPrice) => {
    const price = Math.max(Number(nextPrice) || 0, 0);
    setItems((prev) => prev.map((i) => (i === item || (i.productId === item.productId && i.batchId === item.batchId) ? { ...i, sellingPrice: price } : i)));
  }, []);

  /** Requires PERMISSIONS.DISCOUNT_EDIT - enforced by the calling screen, not here. */
  const updateItemDiscount = useCallback((item, nextDiscount) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i !== item && !(i.productId === item.productId && i.batchId === item.batchId)) return i;
        const lineAmount = i.quantity * i.sellingPrice;
        const discountAmount = Math.min(Math.max(Number(nextDiscount) || 0, 0), lineAmount);
        return { ...i, discountAmount };
      })
    );
  }, []);

  const sameLine = (a, b) => a.productId === b.productId && (a.batchId || null) === (b.batchId || null);

  const increaseItem = useCallback((item, onBlocked) => {
    let blocked = false;
    setItems((prev) =>
      prev.map((i) => {
        if (!sameLine(i, item)) return i;
        const maxQty = i.maxQuantity ?? Infinity;
        if (i.quantity >= maxQty) {
          blocked = true;
          return i;
        }
        return { ...i, quantity: i.quantity + 1 };
      })
    );
    if (blocked) onBlocked && onBlocked('MAX_QUANTITY');
  }, []);

  const decreaseItem = useCallback((item) => {
    setItems((prev) =>
      prev
        .map((i) => (sameLine(i, item) ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((item) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, item)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setDiscount(0);
  }, []);

  const loadHeldBill = useCallback((heldBill) => {
    const parsedItems = JSON.parse(heldBill.itemsJson);
    setItems(parsedItems);
    // customerMasterId is restored straight from the real held_bills.customerId
    // column, not just the supplemental metadata store - the metadata store
    // (loaded separately by the caller) only adds richer display fields
    // (code/GST/credit) on top of this baseline linkage.
    setCustomer(
      heldBill.customerId
        ? { id: heldBill.customerId, customerMasterId: heldBill.customerId, name: heldBill.customerName }
        : heldBill.customerName
        ? { name: heldBill.customerName }
        : null
    );
    setDiscount(heldBill.discount || 0);
  }, []);

  const totals = useMemo(() => {
    // item.discountAmount defaults to 0 for every existing/old cart shape, so
    // this reduces to the original subtotal formula when no item/invoice
    // discount is set. Invoice-level `discount` is allocated PRE-TAX across
    // lines (proportional to each line's taxable share) via the same
    // allocateInvoiceDiscount used by the Purchase Editor, then GST is
    // computed from each line's post-allocation taxable amount - never
    // subtracted from an already-taxed total. `lineDetails` (aligned 1:1
    // with `items`) exposes each line's adjusted taxable amount so callers
    // (e.g. billing.js building the repository/print payload) can reuse the
    // exact same allocation instead of recomputing it separately.
    const baseLines = items.map((item) => ({
      taxableAmount: Math.max(item.quantity * item.sellingPrice - (item.discountAmount || 0), 0),
    }));
    const itemDiscountTotal = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const subtotal = baseLines.reduce((sum, l) => sum + l.taxableAmount, 0);
    const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
    const allocations = allocateInvoiceDiscount(baseLines, safeDiscount);

    const lineDetails = items.map((item, index) => {
      const adjustedTaxable = Math.max(round2(baseLines[index].taxableAmount - allocations[index]), 0);
      const lineGst = round2((adjustedTaxable * (item.gst || 0)) / 100);
      return { allocatedInvoiceDiscount: allocations[index], adjustedTaxable, lineGst };
    });

    const gst = round2(lineDetails.reduce((sum, l) => sum + l.lineGst, 0));
    const grandTotal = Math.max(round2(subtotal - safeDiscount + gst), 0);
    return { subtotal, discount: safeDiscount, itemDiscountTotal, gst, grandTotal, lineDetails };
  }, [items, discount]);

  const value = useMemo(
    () => ({
      items,
      customer,
      discount,
      totals,
      setCustomer,
      setDiscount,
      addItem,
      increaseItem,
      decreaseItem,
      removeItem,
      updateItemPrice,
      updateItemDiscount,
      clearCart,
      loadHeldBill,
    }),
    [items, customer, discount, totals, addItem, increaseItem, decreaseItem, removeItem, updateItemPrice, updateItemDiscount, clearCart, loadHeldBill]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export default BillingContext;
