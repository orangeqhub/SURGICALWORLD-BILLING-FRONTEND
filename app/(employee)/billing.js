import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SearchInput from '../../src/components/ui/SearchInput';
import Badge from '../../src/components/ui/Badge';
import ProductGrid from '../../src/components/billing/ProductGrid';
import BillingCart from '../../src/components/billing/BillingCart';
import QuickCustomerModal from '../../src/components/billing/QuickCustomerModal';
import BatchPickerModal from '../../src/components/billing/BatchPickerModal';
import BillReviewModal from '../../src/components/billing/BillReviewModal';
import PaymentModal from '../../src/components/billing/PaymentModal';
import HeldBillCard from '../../src/components/billing/HeldBillCard';
import ConfirmModal from '../../src/components/ui/ConfirmModal';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { useBillingCart } from '../../src/hooks/useBillingCart';
import { useSync } from '../../src/hooks/useSync';
import { useNotification } from '../../src/hooks/useNotification';
import { hasPermission } from '../../src/utils/permissions';
import { fetchCategories, fetchProductByBarcode, fetchBranchStock } from '../../src/services/api/productApi';
import { listProductsWithProfile } from '../../src/services/api/productMasterApi';
import { fetchBatches, consumeBatchesForInvoice } from '../../src/services/api/batchInventoryApi';
import { saveBill, holdCurrentBill, fetchHeldBills, removeHeldBill } from '../../src/services/api/billingApi';
import { saveInvoiceMeta } from '../../src/services/api/printTypeStore';
import { saveDraftMeta, getDraftMeta } from '../../src/services/api/billingDraftMetaStore';
import { generateLocalId, generateInvoiceNumber } from '../../src/utils/formatters';
import { PERMISSIONS } from '../../src/constants/roles';
import { getBranchById } from '../../src/constants/branches';
import { printBillOnly } from '../../src/services/print/printService';

export default function BillingScreen() {
  const { user } = useAuth();
  const { triggerSync } = useSync();
  const { success, error: notifyError } = useNotification();
  const cart = useBillingCart();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockByProductId, setStockByProductId] = useState({});
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heldBills, setHeldBills] = useState([]);
  const [pendingDiscard, setPendingDiscard] = useState(null);
  const [batchPickerProduct, setBatchPickerProduct] = useState(null);

  const branch = getBranchById(user.branchId);
  const canCredit = hasPermission(user, PERMISSIONS.CREDIT_SALE);
  const canEditPrice = hasPermission(user, PERMISSIONS.PRICE_EDIT);
  const canEditDiscount = hasPermission(user, PERMISSIONS.DISCOUNT_EDIT);

  const loadHeldBills = useCallback(async () => {
    const bills = await fetchHeldBills(user.branchId);
    setHeldBills(bills);
  }, [user.branchId]);

  useEffect(() => {
    (async () => {
      const [cats, prods, stock] = await Promise.all([
        fetchCategories(),
        listProductsWithProfile(),
        fetchBranchStock(user.branchId),
      ]);
      setCategories(cats);
      setProducts(prods);
      setStockByProductId(Object.fromEntries(stock.map((s) => [s.productId, s])));
    })();
    loadHeldBills();
  }, [user.branchId, loadHeldBills]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === 'ALL' || p.categoryId === activeCategory;
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode?.includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, activeCategory, query]);

  const handleBarcodeSearch = async () => {
    if (!query) return;
    const product = await fetchProductByBarcode(query);
    if (product) {
      handleSelectProduct(products.find((p) => p.id === product.id) || product);
      setQuery('');
    }
  };

  const handleAddBlocked = (reason) => {
    if (reason === 'BATCH_UNSELLABLE') notifyError('This batch is expired, blocked or depleted and cannot be sold.');
    else if (reason === 'MAX_QUANTITY') notifyError('Cannot add more than the available quantity.');
    else if (reason === 'OUT_OF_STOCK') notifyError('This product is out of stock.');
  };

  const handleSelectProduct = (product) => {
    if (product.batchTrackingEnabled) {
      setBatchPickerProduct(product);
      return;
    }
    cart.addItem(product, stockByProductId[product.id], null, handleAddBlocked);
  };

  const handleBatchSelected = (batch) => {
    if (batch) {
      cart.addItem(batchPickerProduct, stockByProductId[batchPickerProduct.id], batch, handleAddBlocked);
    } else {
      // Graceful fallback (batch data unavailable) - add at product level, unchanged behavior.
      cart.addItem(batchPickerProduct, stockByProductId[batchPickerProduct.id], null, handleAddBlocked);
    }
    setBatchPickerProduct(null);
  };

  const handleHold = async () => {
    if (cart.items.length === 0) return;
    const heldRecord = await holdCurrentBill({
      branchId: user.branchId,
      customerId: cart.customer?.customerMasterId || null,
      customerName: cart.customer?.name || null,
      items: cart.items,
      subtotal: cart.totals.subtotal,
      discount: cart.totals.discount,
      gst: cart.totals.gst,
      grandTotal: cart.totals.grandTotal,
      heldBy: user.id,
    });
    // Item-level batch/discount/price data already round-trips via itemsJson;
    // this side-table only needs to preserve the richer customer-master snapshot.
    if (heldRecord?.localId && cart.customer?.customerMasterId) {
      await saveDraftMeta(heldRecord.localId, { customer: cart.customer }).catch(() => {});
    }
    cart.clearCart();
    success('Bill held as draft');
    loadHeldBills();
  };

  const handleResumeHeld = async (bill) => {
    cart.loadHeldBill(bill);
    // Old drafts (or ones without a linked customer master) simply have no
    // meta entry - loadHeldBill's basic name/id snapshot above still applies.
    const meta = await getDraftMeta(bill.localId).catch(() => null);
    if (meta?.customer) {
      cart.setCustomer(meta.customer);
    }
  };

  const handleDiscardHeldConfirm = async () => {
    if (!pendingDiscard) return;
    await removeHeldBill(pendingDiscard.localId);
    setPendingDiscard(null);
    success('Draft bill discarded');
    loadHeldBills();
  };

  /**
   * Final payment-path re-validation: a resumed draft (or a batch sold down
   * by someone else since it was added) could have gone stale, so quantity
   * vs current batch/stock availability is re-checked here, not just at
   * add-time. Runs before the customer modal, i.e. before "Proceed to Payment".
   */
  const handleCheckout = async () => {
    const batchLineItems = cart.items.filter((i) => i.batchId);
    if (batchLineItems.length > 0) {
      const batchesByProduct = {};
      for (const item of batchLineItems) {
        if (!batchesByProduct[item.productId]) {
          batchesByProduct[item.productId] = await fetchBatches({ branchId: user.branchId, productId: item.productId }).catch(() => []);
        }
        const liveBatch = batchesByProduct[item.productId].find((b) => b.id === item.batchId);
        if (!liveBatch || ['EXPIRED', 'BLOCKED', 'DEPLETED'].includes(liveBatch.status)) {
          notifyError(`${item.name} (Batch ${item.batchNumber}) is no longer available. Please remove or reselect it.`);
          return;
        }
        if (item.quantity > liveBatch.available) {
          notifyError(`${item.name} (Batch ${item.batchNumber}) only has ${liveBatch.available} available now. Please reduce the quantity.`);
          return;
        }
      }
    }
    setCustomerModalVisible(true);
  };

  const handleCustomerConfirm = (customerInfo) => {
    cart.setCustomer(customerInfo);
    setCustomerModalVisible(false);
    setReviewVisible(true);
  };

  const handleReviewBack = () => {
    setReviewVisible(false);
    setCustomerModalVisible(true);
  };

  const handleReviewConfirm = () => {
    setReviewVisible(false);
    setPaymentVisible(true);
  };

  const handleConfirmPayment = async ({ payments }) => {
    setSaving(true);
    try {
      const localId = generateLocalId('INV');
      const invoiceNumber = generateInvoiceNumber(branch?.code?.split('-')[1] || 'GEN', Date.now() % 1000000);
      const customerSnapshot = cart.customer;
      const itemsSnapshot = cart.items;

      // invoice_items has no discountAmount/invoiceDiscount column, so both
      // the item discount AND this item's allocated share of the
      // invoice-level discount (cart.totals.lineDetails - the same
      // allocation used for the on-screen totals, never recomputed
      // separately) are folded into the per-unit price sent to the
      // repository. The resulting lineTotal it computes internally
      // (quantity * sellingPrice) reconciles exactly with the corrected
      // subtotal/GST/grand total. The rich per-item breakdown (batch,
      // discount, price edit) is preserved separately below via
      // saveInvoiceMeta, purely for display.
      const itemsForRepo = itemsSnapshot.map((item, index) => {
        const adjustedTaxable = cart.totals.lineDetails[index]?.adjustedTaxable ?? item.quantity * item.sellingPrice;
        return {
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          gst: item.gst,
          quantity: item.quantity,
          sellingPrice: item.quantity > 0 ? adjustedTaxable / item.quantity : item.sellingPrice,
        };
      });

      const invoice = await saveBill({
        localId,
        branchId: user.branchId,
        employeeId: user.id,
        customerId: customerSnapshot?.customerMasterId || null,
        items: itemsForRepo,
        subtotal: cart.totals.subtotal,
        discount: cart.totals.discount,
        gst: cart.totals.gst,
        grandTotal: cart.totals.grandTotal,
        payments,
        invoiceNumber,
      });

      setPaymentVisible(false);
      success(`Bill ${invoice.invoiceNumber} saved`);

      // Mock/synthetic batch quantities only ever decrement here, after a
      // successful invoice save - never on draft save, payment cancel, save
      // failure, or print/reprint. invoice.localId is the idempotency key.
      await consumeBatchesForInvoice(
        invoice.localId,
        itemsSnapshot.filter((i) => i.batchId).map((i) => ({ batchId: i.batchId, quantity: i.quantity }))
      ).catch(() => {});

      await saveInvoiceMeta(invoice.localId, {
        printType: "bill",
        customerName: customerSnapshot?.name || 'Walk-in Customer',
        customerMobile: customerSnapshot?.mobile || '-',
        customerContact: customerSnapshot?.mobile || '-',
        branchName: branch?.name || '',
        employeeName: user.name,
        customerMasterId: customerSnapshot?.customerMasterId || null,
        customerCode: customerSnapshot?.customerCode || null,
        customerGst: customerSnapshot?.gst || null,
        customerAddress: customerSnapshot?.billingAddress || null,
        items: itemsSnapshot.map((i) => ({
          productId: i.productId,
          name: i.name,
          batchId: i.batchId || null,
          batchNumber: i.batchNumber || null,
          originalPrice: i.originalPrice,
          sellingPrice: i.sellingPrice,
          discountAmount: i.discountAmount || 0,
        })),
        invoiceDiscount: cart.totals.discount,
        itemDiscountTotal: cart.totals.itemDiscountTotal,
      }).catch(() => {});

      try {
        // Same discount-folded items used for the repository save, so the
        // printed line total * quantity math (invoiceTemplates.js is
        // unmodified) reconciles exactly with the saved grand total - no
        // template changes needed. Reprint reads these same effective prices
        // back from invoice_items, so it stays consistent automatically.
        await printBillOnly({
          invoice,
          branch,
          customer: customerSnapshot,
          items: itemsForRepo,
          payments,
          cashierName: user.name,
        });
      } catch (printErr) {
        success(`Bill saved, but print failed. You can reprint from history.`);
      }

      cart.clearCart();
      triggerSync();
    } catch (err) {
      notifyError(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  return (
    <ScreenContainer scrollable={isMobile} style={{ padding: 0 }}>
      <View style={[styles.row, isMobile && styles.rowMobile]}>
        <View style={[styles.leftPane, isMobile && styles.paneMobile]}>
          <View style={styles.searchRow}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search product name, code or scan barcode"
              onSubmitEditing={handleBarcodeSearch}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.categoryRow}>
            <Badge
              label="All"
              tone={activeCategory === 'ALL' ? 'danger' : 'neutral'}
              style={styles.categoryChip}
              onPress={() => setActiveCategory('ALL')}
            />
            {categories.map((c) => (
              <Badge
                key={c.id}
                label={c.name}
                tone={activeCategory === c.id ? 'danger' : 'neutral'}
                style={styles.categoryChip}
                onPress={() => setActiveCategory(c.id)}
              />
            ))}
          </View>

          {heldBills.length > 0 ? (
            <View style={styles.draftSection}>
              <View style={styles.draftHeader}>
                <Ionicons name="pause-circle-outline" size={20} color={COLORS.brandRed} />
                <Text style={styles.draftTitle}>Draft Bills / On-Hold Bills ({heldBills.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.draftList}>
                {heldBills.map((bill) => (
                  <HeldBillCard
                    key={bill.localId}
                    bill={bill}
                    onResume={handleResumeHeld}
                    onDiscard={setPendingDiscard}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={isMobile ? { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg } : { flex: 1, paddingHorizontal: SPACING.lg }}>
            <ProductGrid products={filteredProducts} stockByProductId={stockByProductId} onSelectProduct={handleSelectProduct} />
          </View>
        </View>

        <View style={[styles.rightPane, isMobile && styles.rightPaneMobile]}>
          <BillingCart
            items={cart.items}
            totals={cart.totals}
            branch={branch}
            onIncrease={(item) => cart.increaseItem(item, handleAddBlocked)}
            onDecrease={cart.decreaseItem}
            onRemove={cart.removeItem}
            onHold={handleHold}
            onClear={cart.clearCart}
            onCheckout={handleCheckout}
            disabled={saving}
            canEditPrice={canEditPrice}
            canEditDiscount={canEditDiscount}
            onPriceChange={(item, value) => canEditPrice && cart.updateItemPrice(item, value)}
            onDiscountChange={(item, value) => canEditDiscount && cart.updateItemDiscount(item, value)}
            onInvoiceDiscountChange={(value) => {
              if (!canEditDiscount) return;
              const eligible = cart.totals.subtotal + cart.totals.gst;
              const next = Math.min(Math.max(Number(value) || 0, 0), eligible);
              cart.setDiscount(next);
            }}
          />
        </View>
      </View>

      <QuickCustomerModal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        onSave={handleCustomerConfirm}
        branchId={user.branchId}
      />

      <BatchPickerModal
        visible={Boolean(batchPickerProduct)}
        onClose={() => setBatchPickerProduct(null)}
        product={batchPickerProduct}
        branchId={user.branchId}
        onSelect={handleBatchSelected}
      />

      <BillReviewModal
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        onBack={handleReviewBack}
        onConfirm={handleReviewConfirm}
        customer={cart.customer}
        items={cart.items}
        totals={cart.totals}
      />

      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        grandTotal={cart.totals.grandTotal}
        allowCredit={canCredit}
        onConfirm={handleConfirmPayment}
      />

      <ConfirmModal
        visible={Boolean(pendingDiscard)}
        onClose={() => setPendingDiscard(null)}
        onConfirm={handleDiscardHeldConfirm}
        title="Discard draft bill?"
        message="This bill and its items will be permanently removed."
        confirmLabel="Discard"
        variant="danger"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minHeight: 0, flexDirection: 'row' },
  rowMobile: { flexDirection: 'column', flex: 0 },
  leftPane: { flex: 2, paddingTop: SPACING.lg },
  paneMobile: { flex: 0 },
  rightPane: { flex: 1, minWidth: 320, maxWidth: 380, minHeight: 0, padding: SPACING.lg, backgroundColor: COLORS.surfaceSoft },
  rightPaneMobile: { flex: 0, minWidth: '100%', maxWidth: '100%', padding: SPACING.md },
  searchRow: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  categoryChip: { paddingHorizontal: SPACING.sm },
  draftSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  draftTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  draftList: { gap: SPACING.sm, paddingBottom: 4 },
});
