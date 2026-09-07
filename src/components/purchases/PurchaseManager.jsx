import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import ConfirmModal from '../ui/ConfirmModal';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import PurchaseEditor from './PurchaseEditor';
import PurchasePreview from './PurchasePreview';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import { listPurchasesForBranch, cancelPurchase } from '../../services/api/purchaseFrontendApi';
import { listSuppliersWithProfile } from '../../services/api/supplierMasterApi';
import { calculatePurchaseTotals } from '../../utils/purchaseCalculations';
import { BRANCHES } from '../../constants/branches';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING } from '../../theme';

/**
 * Shared Purchase list/editor entry point, reused by Branch Admin and
 * Purchase Executive (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3,
 * Part A/F). Every row created/edited here is a frontend demo purchase
 * (source: FRONTEND_DEMO); real purchases recorded through the existing
 * simple form remain visible read-only for reference (source: REAL).
 */
export default function PurchaseManager({ user, branchId, branchLocked }) {
  const { success, error: notifyError } = useNotification();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [purch, supp] = await Promise.all([listPurchasesForBranch(branchId), listSuppliersWithProfile(branchId)]);
    setPurchases(purch);
    setSuppliers(supp);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const supplierById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers]);

  const paymentStatusOf = (p) => {
    if (p.paidAmount === undefined || p.paidAmount === null) return null;
    if (p.paidAmount <= 0) return 'UNPAID';
    if ((p.balanceAmount || 0) > 0) return 'PARTIAL';
    return 'PAID';
  };

  const filtered = useMemo(
    () =>
      purchases
        .filter(
          (p) =>
            !query ||
            p.purchaseNumber?.toLowerCase().includes(query.toLowerCase()) ||
            p.invoiceNumber?.toLowerCase().includes(query.toLowerCase()) ||
            p.supplierInvoiceNumber?.toLowerCase().includes(query.toLowerCase())
        )
        .filter((p) => sourceFilter === 'ALL' || p.source === sourceFilter)
        .filter((p) => statusFilter === 'ALL' || p.status === statusFilter)
        .filter((p) => supplierFilter === 'ALL' || p.supplierId === supplierFilter)
        .filter((p) => branchFilter === 'ALL' || p.branchId === branchFilter)
        .filter((p) => paymentStatusFilter === 'ALL' || paymentStatusOf(p) === paymentStatusFilter)
        .filter((p) => !dateFrom || new Date(p.purchaseDate || p.createdAt) >= new Date(dateFrom))
        .filter((p) => !dateTo || new Date(p.purchaseDate || p.createdAt) <= new Date(`${dateTo}T23:59:59`)),
    [purchases, query, sourceFilter, statusFilter, supplierFilter, branchFilter, paymentStatusFilter, dateFrom, dateTo]
  );

  const openCreate = () => {
    setEditingPurchase(null);
    setEditorVisible(true);
  };

  useRegisterPrimaryAction(openCreate);

  const openEdit = (purchase) => {
    if (purchase.source !== 'FRONTEND_DEMO') {
      notifyError('Real purchases are read-only in this editor');
      return;
    }
    setEditingPurchase(purchase);
    setEditorVisible(true);
  };

  const openPreview = (purchase) => {
    const supplier = supplierById[purchase.supplierId];
    const totals = calculatePurchaseTotals(purchase.items || [], {
      invoiceDiscount: purchase.invoiceDiscount || 0,
      otherCharges: purchase.otherCharges || 0,
      isInterState: purchase.taxType === 'INTER',
    });
    setPreviewTarget({ purchase, supplier, totals });
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await cancelPurchase(user, cancelTarget.id);
    success('Demo purchase cancelled');
    setCancelTarget(null);
    load();
  };

  const columns = [
    { key: 'purchaseNumber', title: 'Purchase No.', render: (row) => <Text>{row.purchaseNumber || row.invoiceNumber}</Text> },
    { key: 'purchaseDate', title: 'Date', render: (row) => <Text>{formatDate(row.purchaseDate || row.createdAt)}</Text> },
    { key: 'supplier', title: 'Supplier', render: (row) => <Text>{supplierById[row.supplierId]?.name || row.supplierId}</Text> },
    ...(!branchId ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name}</Text> }] : []),
    { key: 'items', title: 'Items', render: (row) => <Text>{row.items?.length ?? '-'}</Text> },
    { key: 'netAmount', title: 'Net Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.netAmount ?? row.totalAmount)}</Text> },
    { key: 'balanceAmount', title: 'Balance', render: (row) => <Text>{row.balanceAmount !== undefined ? formatCurrency(row.balanceAmount) : '-'}</Text> },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'CANCELLED' ? 'danger' : row.status === 'DRAFT' ? 'warning' : 'success'} /> },
    { key: 'source', title: 'Source', render: (row) => <Badge label={row.source === 'REAL' ? 'Real' : 'Frontend Demo'} tone={row.source === 'REAL' ? 'success' : 'info'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={{ flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' }}>
          <ActionLink onPress={() => openPreview(row)}>Preview</ActionLink>
          {row.source === 'FRONTEND_DEMO' && row.status !== 'CANCELLED' ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>{row.status === 'DRAFT' ? 'Continue Draft' : 'Edit'}</ActionLink>
              <ActionLink muted onPress={() => setCancelTarget(row)}>Cancel</ActionLink>
            </>
          ) : null}
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.purchaseNumber || row.invoiceNumber}
      subtitle={supplierById[row.supplierId]?.name || row.supplierId}
      badge={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={row.status} tone={row.status === 'CANCELLED' ? 'danger' : row.status === 'DRAFT' ? 'warning' : 'success'} />
          <Badge label={row.source === 'REAL' ? 'Real' : 'Demo'} tone={row.source === 'REAL' ? 'success' : 'info'} />
        </View>
      }
      lines={[
        { label: 'Date', value: formatDate(row.purchaseDate || row.createdAt) },
        { label: 'Items', value: row.items?.length ?? '-' },
        { label: 'Net Amount', value: formatCurrency(row.netAmount ?? row.totalAmount) },
      ]}
      actions={
        <>
          <ActionLink onPress={() => openPreview(row)}>Preview</ActionLink>
          {row.source === 'FRONTEND_DEMO' && row.status !== 'CANCELLED' ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>{row.status === 'DRAFT' ? 'Continue Draft' : 'Edit'}</ActionLink>
              <ActionLink muted onPress={() => setCancelTarget(row)}>Cancel</ActionLink>
            </>
          ) : null}
        </>
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title="Purchases"
        subtitle={`${purchases.length} purchase orders${branchId ? '' : ' across all branches'}`}
        action={<Button title="Create Purchase" size="sm" onPress={openCreate} />}
      />

      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search purchase/invoice number" style={{ flex: 1, minWidth: 220, marginBottom: 0 }} />
        <Select
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[{ label: 'All Sources', value: 'ALL' }, { label: 'Real', value: 'REAL' }, { label: 'Frontend Demo', value: 'FRONTEND_DEMO' }]}
          style={{ minWidth: 160, marginBottom: 0 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'All Status', value: 'ALL' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Saved Demo', value: 'SAVED_DEMO' },
            { label: 'Cancelled', value: 'CANCELLED' },
            { label: 'Received (Real)', value: 'RECEIVED' },
          ]}
          style={{ minWidth: 170, marginBottom: 0 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' }}>
        <Select
          value={supplierFilter}
          onChange={setSupplierFilter}
          options={[{ label: 'All Suppliers', value: 'ALL' }, ...suppliers.map((s) => ({ label: s.name, value: s.id }))]}
          style={{ minWidth: 180, marginBottom: 0 }}
        />
        {!branchId ? (
          <Select
            value={branchFilter}
            onChange={setBranchFilter}
            options={[{ label: 'All Branches', value: 'ALL' }, ...BRANCHES.map((b) => ({ label: b.name, value: b.id }))]}
            style={{ minWidth: 170, marginBottom: 0 }}
          />
        ) : null}
        <Select
          value={paymentStatusFilter}
          onChange={setPaymentStatusFilter}
          options={[
            { label: 'All Payment Status', value: 'ALL' },
            { label: 'Paid', value: 'PAID' },
            { label: 'Partial', value: 'PARTIAL' },
            { label: 'Unpaid', value: 'UNPAID' },
          ]}
          style={{ minWidth: 170, marginBottom: 0 }}
        />
        <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From (YYYY-MM-DD)" style={{ minWidth: 160, marginBottom: 0 }} />
        <Input value={dateTo} onChangeText={setDateTo} placeholder="To (YYYY-MM-DD)" style={{ minWidth: 160, marginBottom: 0 }} />
      </View>

      {loading ? (
        <LoadingState label="Loading purchases..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="bag-add-outline" title="No purchases found" message="Create a new purchase to get started." />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No purchases found" />
      )}

      <PurchaseEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        onSaved={load}
        user={user}
        branchLocked={branchLocked}
        existingPurchase={editingPurchase}
      />

      <PurchasePreview
        visible={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        purchase={previewTarget?.purchase}
        supplier={previewTarget?.supplier}
        totals={previewTarget?.totals}
      />

      <ConfirmModal
        visible={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel demo purchase?"
        message={`${cancelTarget?.purchaseNumber} will be marked cancelled. This does not affect any real inventory.`}
        confirmLabel="Cancel Purchase"
        variant="danger"
      />
    </View>
  );
}

const styles = {
  actionLink: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
};
