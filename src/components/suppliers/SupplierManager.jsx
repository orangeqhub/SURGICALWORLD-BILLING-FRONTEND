import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import Modal from '../ui/Modal';
import ConfirmModal from '../ui/ConfirmModal';
import Input from '../ui/Input';
import Tabs from '../ui/Tabs';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import {
  listSuppliersWithProfile,
  createSupplierWithProfile,
  updateSupplierProfile,
  setSupplierStatus,
} from '../../services/api/supplierMasterApi';
import { fetchPurchases } from '../../services/api/purchaseApi';
import { fetchLedgerEntries } from '../../services/api/ledgerApi';
import { fetchPayments } from '../../services/api/paymentApi';
import { BRANCHES } from '../../constants/branches';
import { OPENING_BALANCE_TYPES, PAYMENT_TERMS_OPTIONS } from '../../constants/inventorySettings';
import { validateMobile, validateEmail, validateGst, validateIfsc, validateNonNegative } from '../../utils/inventoryHelpers';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const emptyForm = {
  name: '', address: '', gst: '', mobile: '', altMobile: '', email: '', contactPerson: '',
  creditPeriod: '', paymentTerms: 'CASH', openingBalance: '', openingBalanceType: 'DEBIT',
  bankName: '', accountHolderName: '', accountNumber: '', ifsc: '', remarks: '',
};

/**
 * Shared Supplier Management list/form/detail experience, reused by Branch
 * Admin (branch-scoped), Super Admin (all-branch), and Purchase Executive
 * (branch-scoped, edit gated by allowEdit) - see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2 corrections.
 *
 * @param {string|undefined} branchId - branch to filter by; undefined = all branches
 * @param {boolean} allowBranchPicker - show a Branch select in the Add/Edit form
 * @param {boolean} allowEdit - whether Add/Edit/Deactivate actions are available
 */
export default function SupplierManager({ title = 'Suppliers', branchId, allowBranchPicker = false, defaultCreateBranchId, allowEdit = true }) {
  const { success, error: notifyError } = useNotification();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, branchId: defaultCreateBranchId || '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listSuppliersWithProfile(branchId);
    setSuppliers(rows);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      suppliers
        .filter(
          (s) =>
            !query ||
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.mobile?.includes(query) ||
            s.supplierCode?.toLowerCase().includes(query.toLowerCase())
        )
        .filter((s) => statusFilter === 'ALL' || s.status === statusFilter),
    [suppliers, query, statusFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, branchId: defaultCreateBranchId || branchId || '' });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(allowEdit ? openAdd : null, [allowEdit, defaultCreateBranchId, branchId]);

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name || '',
      address: supplier.address || '',
      gst: supplier.gst || '',
      mobile: supplier.mobile || '',
      altMobile: supplier.altMobile || '',
      email: supplier.email || '',
      contactPerson: supplier.contactPerson || '',
      creditPeriod: String(supplier.creditPeriod ?? ''),
      paymentTerms: supplier.paymentTerms || 'CASH',
      openingBalance: String(supplier.openingBalance ?? ''),
      openingBalanceType: supplier.openingBalanceType || 'DEBIT',
      bankName: supplier.bankName || '',
      accountHolderName: supplier.accountHolderName || '',
      accountNumber: supplier.accountNumber || '',
      ifsc: supplier.ifsc || '',
      remarks: supplier.remarks || '',
      branchId: supplier.branchId || defaultCreateBranchId || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Supplier name is required';
    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) errors.mobile = mobileErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;
    const gstErr = validateGst(form.gst);
    if (gstErr) errors.gst = gstErr;
    const ifscErr = validateIfsc(form.ifsc);
    if (ifscErr) errors.ifsc = ifscErr;
    const creditErr = validateNonNegative(form.creditPeriod, 'Credit period');
    if (creditErr) errors.creditPeriod = creditErr;
    const openingErr = validateNonNegative(form.openingBalance, 'Opening balance');
    if (openingErr) errors.openingBalance = openingErr;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        creditPeriod: Number(form.creditPeriod) || 0,
        openingBalance: Number(form.openingBalance) || 0,
        branchId: form.branchId || defaultCreateBranchId || branchId,
      };
      if (editing) {
        await updateSupplierProfile(editing.id, payload);
        success(`Supplier ${editing.supplierCode} updated`);
      } else {
        const created = await createSupplierWithProfile(payload);
        success(`Supplier ${created.supplierCode} added`);
      }
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    const nextStatus = confirmTarget.status === 'Active' ? 'Inactive' : 'Active';
    await setSupplierStatus(confirmTarget.id, nextStatus);
    success(`${confirmTarget.name} marked ${nextStatus}`);
    setConfirmTarget(null);
    load();
  };

  const columns = [
    { key: 'supplierCode', title: 'Code' },
    { key: 'name', title: 'Supplier', flex: 1.4 },
    { key: 'mobile', title: 'Phone' },
    { key: 'gst', title: 'GSTIN' },
    { key: 'creditPeriod', title: 'Credit Period', render: (row) => <Text>{row.creditPeriod} days</Text> },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={styles.actionsRow}>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {allowEdit ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink muted onPress={() => setConfirmTarget(row)}>
                {row.status === 'Active' ? 'Deactivate' : 'Activate'}
              </ActionLink>
            </>
          ) : null}
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={`${row.name} (${row.supplierCode})`}
      subtitle={row.mobile || 'No mobile on file'}
      badge={<Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} />}
      lines={[
        { label: 'GSTIN', value: row.gst || '-' },
        { label: 'Credit Period', value: `${row.creditPeriod} days` },
      ]}
      actions={
        <>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {allowEdit ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink muted onPress={() => setConfirmTarget(row)}>
                {row.status === 'Active' ? 'Deactivate' : 'Activate'}
              </ActionLink>
            </>
          ) : null}
        </>
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title={title}
        subtitle={`${suppliers.length} registered supplier${suppliers.length === 1 ? '' : 's'}`}
        action={allowEdit ? <Button title="Add Supplier" size="sm" onPress={openAdd} /> : null}
      />

      <View style={styles.filterRow}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search supplier name, mobile or code" style={{ flex: 1, minWidth: 240, marginBottom: 0 }} />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'All Status', value: 'ALL' },
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' },
          ]}
          style={{ minWidth: 160, marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <LoadingState label="Loading suppliers..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="briefcase-outline" title="No suppliers found" message="Try adjusting your search or add a new supplier." />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No suppliers found" />
      )}

      {allowEdit && (
        <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} width={560}>
          <View style={styles.formRow}>
            <Input label="Supplier Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={formErrors.name} style={{ flex: 1 }} />
            <Input label="GST Number" value={form.gst} onChangeText={(v) => setForm((f) => ({ ...f, gst: v.toUpperCase() }))} error={formErrors.gst} style={{ flex: 1 }} />
          </View>
          {allowBranchPicker ? (
            <Select label="Assigned Branch" value={form.branchId} onChange={(v) => setForm((f) => ({ ...f, branchId: v }))} options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))} placeholder="Select branch (optional)" />
          ) : null}
          <Input label="Address" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
          <View style={styles.formRow}>
            <Input label="Mobile Number" value={form.mobile} onChangeText={(v) => setForm((f) => ({ ...f, mobile: v }))} error={formErrors.mobile} keyboardType="number-pad" maxLength={10} style={{ flex: 1 }} />
            <Input label="Alternate Mobile" value={form.altMobile} onChangeText={(v) => setForm((f) => ({ ...f, altMobile: v }))} keyboardType="number-pad" maxLength={10} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Email Address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} error={formErrors.email} style={{ flex: 1 }} />
            <Input label="Contact Person" value={form.contactPerson} onChangeText={(v) => setForm((f) => ({ ...f, contactPerson: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Credit Period (days)" value={form.creditPeriod} onChangeText={(v) => setForm((f) => ({ ...f, creditPeriod: v }))} error={formErrors.creditPeriod} keyboardType="number-pad" style={{ flex: 1 }} />
            <Select label="Payment Terms" value={form.paymentTerms} onChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))} options={PAYMENT_TERMS_OPTIONS} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Opening Balance" value={form.openingBalance} onChangeText={(v) => setForm((f) => ({ ...f, openingBalance: v }))} error={formErrors.openingBalance} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Select label="Balance Type" value={form.openingBalanceType} onChange={(v) => setForm((f) => ({ ...f, openingBalanceType: v }))} options={OPENING_BALANCE_TYPES} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Bank Name" value={form.bankName} onChangeText={(v) => setForm((f) => ({ ...f, bankName: v }))} style={{ flex: 1 }} />
            <Input label="Account Holder Name" value={form.accountHolderName} onChangeText={(v) => setForm((f) => ({ ...f, accountHolderName: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Account Number" value={form.accountNumber} onChangeText={(v) => setForm((f) => ({ ...f, accountNumber: v }))} keyboardType="number-pad" style={{ flex: 1 }} />
            <Input label="IFSC Code" value={form.ifsc} onChangeText={(v) => setForm((f) => ({ ...f, ifsc: v.toUpperCase() }))} error={formErrors.ifsc} style={{ flex: 1 }} />
          </View>
          <Input label="Remarks" value={form.remarks} onChangeText={(v) => setForm((f) => ({ ...f, remarks: v }))} />
          <Button title={editing ? 'Save Changes' : 'Save Supplier'} onPress={handleSave} loading={saving} />
        </Modal>
      )}

      {allowEdit && (
        <ConfirmModal
          visible={Boolean(confirmTarget)}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleToggleStatus}
          title={confirmTarget?.status === 'Active' ? 'Deactivate Supplier' : 'Activate Supplier'}
          message={
            confirmTarget?.status === 'Active'
              ? `${confirmTarget?.name} will be marked inactive. They will remain visible in purchase history.`
              : `${confirmTarget?.name} will be marked active again.`
          }
          confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
          variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
        />
      )}

      {viewing ? <SupplierDetailModal supplier={viewing} branchId={viewing.branchId} onClose={() => setViewing(null)} /> : null}
    </View>
  );
}

function SupplierDetailModal({ supplier, branchId, onClose }) {
  const [tab, setTab] = useState('profile');
  const [purchases, setPurchases] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [pur, ldg, pmts] = await Promise.all([
        branchId ? fetchPurchases(branchId).then((rows) => rows.filter((r) => r.supplierId === supplier.id)) : Promise.resolve([]),
        fetchLedgerEntries({ partyType: 'SUPPLIER', partyId: supplier.id }),
        branchId ? fetchPayments(branchId).then((rows) => rows.filter((r) => r.supplierId === supplier.id)) : Promise.resolve([]),
      ]);
      setPurchases(pur);
      setLedger(ldg);
      setPayments(pmts);
      setLoaded(true);
    })();
  }, [supplier.id, branchId]);

  const outstanding = ledger.reduce((sum, e) => (e.type === 'DEBIT' ? sum + e.amount : sum - e.amount), 0);

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'purchases', label: 'Purchase History', badge: purchases.length },
    { key: 'ledger', label: 'Ledger Preview', badge: ledger.length },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'payments', label: 'Payments', badge: payments.length },
  ];

  return (
    <Modal visible onClose={onClose} title={`${supplier.name} (${supplier.supplierCode})`} width={640}>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {!loaded ? (
        <LoadingState label="Loading supplier details..." />
      ) : (
        <View>
          {tab === 'profile' && (
            <View style={styles.detailGrid}>
              <DetailRow label="Address" value={supplier.address || '-'} />
              <DetailRow label="GST" value={supplier.gst || '-'} />
              <DetailRow label="Mobile" value={supplier.mobile || '-'} />
              <DetailRow label="Alternate Mobile" value={supplier.altMobile || '-'} />
              <DetailRow label="Email" value={supplier.email || '-'} />
              <DetailRow label="Contact Person" value={supplier.contactPerson || '-'} />
              <DetailRow label="Credit Period" value={`${supplier.creditPeriod} days`} />
              <DetailRow label="Payment Terms" value={supplier.paymentTerms} />
              <DetailRow label="Opening Balance" value={`${formatCurrency(supplier.openingBalance)} (${supplier.openingBalanceType})`} />
              <DetailRow label="Bank" value={supplier.bankName || '-'} />
              <DetailRow label="Account Holder" value={supplier.accountHolderName || '-'} />
              <DetailRow label="Account Number" value={supplier.accountNumber || '-'} />
              <DetailRow label="IFSC" value={supplier.ifsc || '-'} />
              <DetailRow label="Remarks" value={supplier.remarks || '-'} />
            </View>
          )}
          {tab === 'purchases' &&
            (purchases.length === 0 ? (
              <EmptyState icon="bag-add-outline" title="No purchases yet" />
            ) : (
              purchases.slice(0, 20).map((p) => (
                <View key={p.localId} style={styles.previewRow}>
                  <Text style={styles.previewTitle}>{p.invoiceNumber}</Text>
                  <Text style={styles.previewMeta}>{formatDate(p.createdAt)} - {formatCurrency(p.totalAmount)} - {p.status}</Text>
                </View>
              ))
            ))}
          {tab === 'ledger' &&
            (ledger.length === 0 ? (
              <EmptyState icon="book-outline" title="No ledger entries yet" />
            ) : (
              ledger.slice(0, 20).map((e) => (
                <View key={e.id} style={styles.previewRow}>
                  <Text style={styles.previewTitle}>{e.type} - {formatCurrency(e.amount)}</Text>
                  <Text style={styles.previewMeta}>{formatDate(e.date)} - {e.referenceType} - {e.note || ''}</Text>
                </View>
              ))
            ))}
          {tab === 'outstanding' && (
            <View style={styles.previewRow}>
              <Text style={styles.previewTitle}>Outstanding Balance</Text>
              <Text style={[styles.previewMeta, { fontWeight: '700', color: outstanding > 0 ? COLORS.danger : COLORS.success }]}>
                {formatCurrency(Math.abs(outstanding))} {outstanding > 0 ? 'Payable' : 'Settled'}
              </Text>
            </View>
          )}
          {tab === 'payments' &&
            (payments.length === 0 ? (
              <EmptyState icon="card-outline" title="No payments recorded" />
            ) : (
              payments.slice(0, 20).map((p) => (
                <View key={p.id} style={styles.previewRow}>
                  <Text style={styles.previewTitle}>{formatCurrency(p.amount)} via {p.mode}</Text>
                  <Text style={styles.previewMeta}>{formatDate(p.date)}</Text>
                </View>
              ))
            ))}
        </View>
      )}
    </Modal>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  formRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flexWrap: 'wrap' },
  actionLink: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
  detailGrid: { gap: SPACING.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xxs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  detailValue: { ...TYPOGRAPHY.bodyStrong, flex: 1.4, textAlign: 'right' },
  previewRow: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  previewTitle: { ...TYPOGRAPHY.bodyStrong },
  previewMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
});
