import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import PurchaseHeaderForm from './PurchaseHeaderForm';
import PurchaseItemsEditor, { validateLine } from './PurchaseItemsEditor';
import PurchaseTotals from './PurchaseTotals';
import PurchasePreview from './PurchasePreview';
import { useNotification } from '../../hooks/useNotification';
import { listSuppliersWithProfile } from '../../services/api/supplierMasterApi';
import { listProductsWithProfile } from '../../services/api/productMasterApi';
import { savePurchase, createDraftPurchase } from '../../services/api/purchaseFrontendApi';
import { calculatePurchaseTotals, calculateBalance } from '../../utils/purchaseCalculations';
import { SPACING } from '../../theme';

function emptyHeader(branchId) {
  return {
    purchaseNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    branchId: branchId || '',
    supplierId: '',
    supplierCode: '',
    supplierGst: '',
    supplierAddress: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    purchaseType: 'CREDIT',
    paymentTerms: 'CASH',
    creditPeriod: 0,
    dueDate: '',
    taxType: 'INTRA',
    referenceNumber: '',
    remarks: '',
  };
}

/**
 * Frontend-only Purchase Editor - creates/edits a Demo Purchase via
 * purchaseFrontendApi only (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase
 * 3, Part A/E). Never calls purchaseApi.recordPurchase and never touches
 * real branch_stock/stock_movements/purchases tables.
 */
export default function PurchaseEditor({ visible, onClose, onSaved, user, branchLocked, existingPurchase }) {
  const { success, error: notifyError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [header, setHeader] = useState(emptyHeader(branchLocked ? user.branchId : ''));
  const [items, setItems] = useState([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      const branchForSuppliers = branchLocked ? user.branchId : existingPurchase?.branchId;
      const [supp, prods] = await Promise.all([listSuppliersWithProfile(branchForSuppliers), listProductsWithProfile()]);
      setSuppliers(supp);
      setProducts(prods.filter((p) => p.status !== 'Inactive'));

      if (existingPurchase) {
        setHeader({ ...emptyHeader(existingPurchase.branchId), ...existingPurchase });
        setItems(existingPurchase.items || []);
        setInvoiceDiscount(String(existingPurchase.invoiceDiscount ?? 0));
        setOtherCharges(String(existingPurchase.otherCharges ?? 0));
        setPaidAmount(String(existingPurchase.paidAmount ?? 0));
      } else {
        setHeader(emptyHeader(branchLocked ? user.branchId : ''));
        setItems([]);
        setInvoiceDiscount('0');
        setOtherCharges('0');
        setPaidAmount('0');
      }
      setErrors({});
      setLoading(false);
    })();
  }, [visible, existingPurchase, branchLocked, user.branchId]);

  const totals = useMemo(
    () =>
      calculatePurchaseTotals(items, {
        invoiceDiscount: Number(invoiceDiscount) || 0,
        otherCharges: Number(otherCharges) || 0,
        isInterState: header.taxType === 'INTER',
      }),
    [items, invoiceDiscount, otherCharges, header.taxType]
  );

  const balance = calculateBalance(totals.netAmount, Number(paidAmount) || 0);

  const validate = () => {
    const nextErrors = {};
    if (!header.branchId) nextErrors.branchId = 'Branch is required';
    if (!header.supplierId) nextErrors.supplierId = 'Supplier is required';
    if (!header.supplierInvoiceNumber?.trim()) nextErrors.supplierInvoiceNumber = 'Supplier invoice number is required';
    if (!header.purchaseDate || Number.isNaN(new Date(header.purchaseDate).getTime())) nextErrors.purchaseDate = 'Enter a valid purchase date';
    if (items.length === 0) nextErrors.items = 'Add at least one item';
    const hasLineErrors = items.some((item) => Object.keys(validateLine(item)).length > 0);
    if (hasLineErrors) nextErrors.items = 'Fix the highlighted item errors before saving';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildRecord = (status) => ({
    ...(existingPurchase ? { id: existingPurchase.id } : {}),
    ...header,
    items,
    invoiceDiscount: Number(invoiceDiscount) || 0,
    otherCharges: Number(otherCharges) || 0,
    paidAmount: balance.paidAmount,
    balanceAmount: balance.balanceAmount,
    netAmount: totals.netAmount,
    status,
    source: 'FRONTEND_DEMO',
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const record = buildRecord('DRAFT');
      const saved = existingPurchase ? await savePurchase(user, record) : await createDraftPurchase(user, record);
      success(`Purchase draft ${saved.purchaseNumber} saved`);
      onSaved && onSaved(saved);
      onClose();
    } catch (e) {
      notifyError(e.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDemo = async () => {
    if (!validate()) {
      notifyError('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const record = buildRecord('SAVED_DEMO');
      const saved = existingPurchase || record.id ? await savePurchase(user, record) : await createDraftPurchase(user, record);
      success(`Demo purchase ${saved.purchaseNumber} saved (frontend only, not posted to inventory)`);
      onSaved && onSaved(saved);
      onClose();
    } catch (e) {
      notifyError(e.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const supplier = suppliers.find((s) => s.id === header.supplierId);
    setPreviewData({ purchase: buildRecord(header.status || 'DRAFT'), supplier, totals });
  };

  return (
    <Modal visible={visible} onClose={onClose} title={existingPurchase ? `Edit Purchase - ${existingPurchase.purchaseNumber}` : 'New Purchase (Demo)'} width={920}>
      {loading ? (
        <LoadingState label="Loading purchase editor..." />
      ) : (
        <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
          <PurchaseHeaderForm header={header} onChange={setHeader} suppliers={suppliers} errors={errors} branchLocked={branchLocked} />

          <View style={styles.divider} />

          <PurchaseItemsEditor items={items} onChange={setItems} products={products} isInterState={header.taxType === 'INTER'} />
          {errors.items ? <View style={styles.itemsError}>{errors.items}</View> : null}

          <View style={styles.divider} />

          <PurchaseTotals
            totals={totals}
            invoiceDiscount={invoiceDiscount}
            otherCharges={otherCharges}
            onInvoiceDiscountChange={setInvoiceDiscount}
            onOtherChargesChange={setOtherCharges}
            paidAmount={paidAmount}
            onPaidAmountChange={setPaidAmount}
            balanceAmount={balance.balanceAmount}
          />

          <View style={styles.actionsRow}>
            <Button title="Save Draft" variant="secondary" outline onPress={handleSaveDraft} loading={saving} style={{ flex: 1 }} />
            <Button title="Preview" variant="secondary" outline onPress={handlePreview} style={{ flex: 1 }} />
            <Button title="Save Demo Purchase" onPress={handleSaveDemo} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      )}

      <PurchasePreview
        visible={Boolean(previewData)}
        onClose={() => setPreviewData(null)}
        purchase={previewData?.purchase}
        supplier={previewData?.supplier}
        totals={previewData?.totals}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: '#E2E2ED', marginVertical: SPACING.lg },
  itemsError: { color: '#ED1C2E', fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.md },
});
