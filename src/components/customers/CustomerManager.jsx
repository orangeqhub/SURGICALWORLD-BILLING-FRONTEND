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
  listCustomersWithProfile,
  createCustomerWithProfile,
  updateCustomerProfile,
  setCustomerStatus,
} from '../../services/api/customerMasterApi';
import { fetchInvoices } from '../../services/api/billingApi';
import { fetchLedgerEntries } from '../../services/api/ledgerApi';
import { fetchReceipts } from '../../services/api/receiptApi';
import { fetchCrmNotes, addCrmNote } from '../../services/api/crmApi';
import { CUSTOMER_TYPES } from '../../constants/customers';
import { BRANCHES } from '../../constants/branches';
import { OPENING_BALANCE_TYPES, PAYMENT_TERMS_OPTIONS } from '../../constants/inventorySettings';
import { validateMobile, validateEmail, validateGst, validateNonNegative } from '../../utils/inventoryHelpers';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const emptyForm = {
  name: '', allianceNumber: '', orgName: '', billingAddress: '', shippingAddress: '', gst: '',
  mobile: '', altMobile: '', email: '', contactPerson: '', doctor: '', type: 'RETAIL',
  creditLimit: '', paymentTerms: 'CASH', openingBalance: '', openingBalanceType: 'DEBIT', remarks: '',
};

/**
 * Shared Customer CRM list/form/detail experience, reused by both the Branch
 * Admin (branch-scoped) and Super Admin (all-branch, with a branch filter)
 * screens - see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2 corrections.
 *
 * @param {string|undefined} branchId - branch to filter by; undefined = all branches
 * @param {boolean} allowBranchPicker - show a Branch select in the Add/Edit form
 * @param {string} defaultCreateBranchId - branch preselected in the create form
 */
export default function CustomerManager({ title = 'Customers', branchId, allowBranchPicker = false, defaultCreateBranchId, userName }) {
  const { success, error: notifyError } = useNotification();
  const [customers, setCustomers] = useState([]);
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
    const rows = await listCustomersWithProfile(branchId);
    setCustomers(rows);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      customers
        .filter(
          (c) =>
            !query ||
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.mobile?.includes(query) ||
            c.customerCode?.toLowerCase().includes(query.toLowerCase()) ||
            c.gst?.toLowerCase().includes(query.toLowerCase()) ||
            c.allianceNumber?.toLowerCase().includes(query.toLowerCase())
        )
        .filter((c) => statusFilter === 'ALL' || c.status === statusFilter),
    [customers, query, statusFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, branchId: defaultCreateBranchId || branchId || '' });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(openAdd, [defaultCreateBranchId, branchId]);

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      name: customer.name || '',
      allianceNumber: customer.allianceNumber || '',
      orgName: customer.orgName || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      gst: customer.gst || '',
      mobile: customer.mobile || '',
      altMobile: customer.altMobile || '',
      email: customer.email || '',
      contactPerson: customer.contactPerson || '',
      doctor: customer.doctor || '',
      type: customer.type || 'RETAIL',
      creditLimit: String(customer.creditLimit ?? ''),
      paymentTerms: customer.paymentTerms || 'CASH',
      openingBalance: String(customer.openingBalance ?? ''),
      openingBalanceType: customer.openingBalanceType || 'DEBIT',
      remarks: customer.remarks || '',
      branchId: customer.branchId || defaultCreateBranchId || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Customer name is required';
    if (allowBranchPicker && !editing && !form.branchId) errors.branchId = 'Branch is required';
    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) errors.mobile = mobileErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;
    const gstErr = validateGst(form.gst);
    if (gstErr) errors.gst = gstErr;
    const creditErr = validateNonNegative(form.creditLimit, 'Credit limit');
    if (creditErr) errors.creditLimit = creditErr;
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
        creditLimit: Number(form.creditLimit) || 0,
        openingBalance: Number(form.openingBalance) || 0,
        branchId: form.branchId || defaultCreateBranchId || branchId,
      };
      if (editing) {
        await updateCustomerProfile(editing.id, payload);
        success(`Customer ${editing.customerCode} updated`);
      } else {
        const created = await createCustomerWithProfile(payload);
        success(`Customer ${created.customerCode} added`);
      }
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    const nextStatus = confirmTarget.status === 'Active' ? 'Inactive' : 'Active';
    await setCustomerStatus(confirmTarget.id, nextStatus);
    success(`${confirmTarget.name} marked ${nextStatus}`);
    setConfirmTarget(null);
    load();
  };

  const columns = [
    { key: 'customerCode', title: 'Code' },
    { key: 'name', title: 'Name', flex: 1.3 },
    { key: 'mobile', title: 'Mobile' },
    ...(allowBranchPicker ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name || '-'}</Text> }] : []),
    { key: 'type', title: 'Type', render: (row) => <Badge label={row.type?.replace('_', ' ')} tone="info" /> },
    { key: 'creditLimit', title: 'Credit Limit', render: (row) => <Text>{formatCurrency(row.creditLimit)}</Text> },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={styles.actionsRow}>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
          <ActionLink muted onPress={() => setConfirmTarget(row)}>
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </ActionLink>
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={`${row.name} (${row.customerCode})`}
      subtitle={row.mobile || 'No mobile on file'}
      badge={<Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} />}
      lines={[
        { label: 'Type', value: row.type?.replace('_', ' ') },
        ...(allowBranchPicker ? [{ label: 'Branch', value: BRANCHES.find((b) => b.id === row.branchId)?.name || '-' }] : []),
        { label: 'Credit Limit', value: formatCurrency(row.creditLimit) },
      ]}
      actions={
        <>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
          <ActionLink muted onPress={() => setConfirmTarget(row)}>
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </ActionLink>
        </>
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title={title}
        subtitle={`${customers.length} customer${customers.length === 1 ? '' : 's'}`}
        action={<Button title="Add Customer" size="sm" onPress={openAdd} />}
      />

      <View style={styles.filterRow}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, mobile, code, GST or alliance number"
          style={{ flex: 1, minWidth: 240, marginBottom: 0 }}
        />
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
        <LoadingState label="Loading customers..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="people-outline" title="No customers found" message="Try adjusting your search or add a new customer." />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No customers found" />
      )}

      <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={editing ? 'Edit Customer' : 'Add Customer'} width={560}>
        <View style={styles.formRow}>
          <Input label="Customer Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={formErrors.name} style={{ flex: 1 }} />
          <Select label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={CUSTOMER_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }))} style={{ flex: 1 }} />
        </View>
        {allowBranchPicker ? (
          <Select
            label="Assigned Branch *"
            value={form.branchId}
            onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
            options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))}
            placeholder="Select branch"
          />
        ) : null}
        {formErrors.branchId ? <Text style={styles.fieldError}>{formErrors.branchId}</Text> : null}
        <View style={styles.formRow}>
          <Input label="Alliance Number" value={form.allianceNumber} onChangeText={(v) => setForm((f) => ({ ...f, allianceNumber: v }))} style={{ flex: 1 }} />
          <Input label="Organization / Hospital Name" value={form.orgName} onChangeText={(v) => setForm((f) => ({ ...f, orgName: v }))} style={{ flex: 1 }} />
        </View>
        <Input label="Billing Address" value={form.billingAddress} onChangeText={(v) => setForm((f) => ({ ...f, billingAddress: v }))} />
        <Input label="Shipping Address" value={form.shippingAddress} onChangeText={(v) => setForm((f) => ({ ...f, shippingAddress: v }))} />
        <View style={styles.formRow}>
          <Input label="Mobile Number" value={form.mobile} onChangeText={(v) => setForm((f) => ({ ...f, mobile: v }))} error={formErrors.mobile} keyboardType="number-pad" maxLength={10} style={{ flex: 1 }} />
          <Input label="Alternate Mobile" value={form.altMobile} onChangeText={(v) => setForm((f) => ({ ...f, altMobile: v }))} keyboardType="number-pad" maxLength={10} style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Input label="Email Address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} error={formErrors.email} style={{ flex: 1 }} />
          <Input label="GST Number" value={form.gst} onChangeText={(v) => setForm((f) => ({ ...f, gst: v.toUpperCase() }))} error={formErrors.gst} style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Input label="Contact Person" value={form.contactPerson} onChangeText={(v) => setForm((f) => ({ ...f, contactPerson: v }))} style={{ flex: 1 }} />
          <Input label="Doctor (optional)" value={form.doctor} onChangeText={(v) => setForm((f) => ({ ...f, doctor: v }))} style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Input label="Credit Limit" value={form.creditLimit} onChangeText={(v) => setForm((f) => ({ ...f, creditLimit: v }))} error={formErrors.creditLimit} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <Select label="Payment Terms" value={form.paymentTerms} onChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))} options={PAYMENT_TERMS_OPTIONS} style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Input label="Opening Balance" value={form.openingBalance} onChangeText={(v) => setForm((f) => ({ ...f, openingBalance: v }))} error={formErrors.openingBalance} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <Select label="Balance Type" value={form.openingBalanceType} onChange={(v) => setForm((f) => ({ ...f, openingBalanceType: v }))} options={OPENING_BALANCE_TYPES} style={{ flex: 1 }} />
        </View>
        <Input label="Remarks" value={form.remarks} onChangeText={(v) => setForm((f) => ({ ...f, remarks: v }))} />
        <Button title={editing ? 'Save Changes' : 'Save Customer'} onPress={handleSave} loading={saving} />
      </Modal>

      <ConfirmModal
        visible={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleStatus}
        title={confirmTarget?.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}
        message={
          confirmTarget?.status === 'Active'
            ? `${confirmTarget?.name} will be marked inactive. They will remain visible in billing and invoice history.`
            : `${confirmTarget?.name} will be marked active again.`
        }
        confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
      />

      {viewing ? (
        <CustomerDetailModal customer={viewing} branchId={viewing.branchId} userName={userName} onClose={() => setViewing(null)} />
      ) : null}
    </View>
  );
}

function CustomerDetailModal({ customer, branchId, userName, onClose }) {
  const { success } = useNotification();
  const [tab, setTab] = useState('profile');
  const [invoices, setInvoices] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [inv, ldg, rcpts, crmNotes] = await Promise.all([
        fetchInvoices(branchId).then((rows) => rows.filter((r) => r.customerId === customer.id)),
        fetchLedgerEntries({ partyType: 'CUSTOMER', partyId: customer.id }),
        fetchReceipts(branchId).then((rows) => rows.filter((r) => r.customerId === customer.id)),
        fetchCrmNotes(customer.id),
      ]);
      setInvoices(inv);
      setLedger(ldg);
      setReceipts(rcpts);
      setNotes(crmNotes);
      setLoaded(true);
    })();
  }, [customer.id, branchId]);

  const outstanding = ledger.reduce((sum, e) => (e.type === 'DEBIT' ? sum + e.amount : sum - e.amount), 0);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const note = await addCrmNote({ customerId: customer.id, branchId, note: noteText.trim(), followUpDate: null, createdBy: userName });
    setNotes((prev) => [note, ...prev]);
    setNoteText('');
    success('Note added');
  };

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'sales', label: 'Sales History', badge: invoices.length },
    { key: 'ledger', label: 'Ledger Preview', badge: ledger.length },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'receipts', label: 'Receipts', badge: receipts.length },
    { key: 'notes', label: 'CRM Notes', badge: notes.length },
  ];

  return (
    <Modal visible onClose={onClose} title={`${customer.name} (${customer.customerCode})`} width={640}>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {!loaded ? (
        <LoadingState label="Loading customer details..." />
      ) : (
        <View>
          {tab === 'profile' && (
            <View style={styles.detailGrid}>
              <DetailRow label="Organization" value={customer.orgName || '-'} />
              <DetailRow label="Alliance Number" value={customer.allianceNumber || '-'} />
              <DetailRow label="Billing Address" value={customer.billingAddress || '-'} />
              <DetailRow label="Shipping Address" value={customer.shippingAddress || '-'} />
              <DetailRow label="GST" value={customer.gst || '-'} />
              <DetailRow label="Mobile" value={customer.mobile || '-'} />
              <DetailRow label="Alternate Mobile" value={customer.altMobile || '-'} />
              <DetailRow label="Email" value={customer.email || '-'} />
              <DetailRow label="Contact Person" value={customer.contactPerson || '-'} />
              <DetailRow label="Credit Limit" value={formatCurrency(customer.creditLimit)} />
              <DetailRow label="Payment Terms" value={customer.paymentTerms} />
              <DetailRow label="Opening Balance" value={`${formatCurrency(customer.openingBalance)} (${customer.openingBalanceType})`} />
              <DetailRow label="Remarks" value={customer.remarks || '-'} />
            </View>
          )}
          {tab === 'sales' &&
            (invoices.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No invoices yet" />
            ) : (
              invoices.slice(0, 20).map((inv) => (
                <View key={inv.localId} style={styles.previewRow}>
                  <Text style={styles.previewTitle}>{inv.invoiceNumber}</Text>
                  <Text style={styles.previewMeta}>{formatDate(inv.createdAt)} - {formatCurrency(inv.grandTotal)} - {inv.paymentStatus}</Text>
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
                {formatCurrency(Math.abs(outstanding))} {outstanding > 0 ? 'Receivable' : 'Settled'}
              </Text>
            </View>
          )}
          {tab === 'receipts' &&
            (receipts.length === 0 ? (
              <EmptyState icon="document-text-outline" title="No receipts recorded" />
            ) : (
              receipts.slice(0, 20).map((r) => (
                <View key={r.id} style={styles.previewRow}>
                  <Text style={styles.previewTitle}>{formatCurrency(r.amount)} via {r.mode}</Text>
                  <Text style={styles.previewMeta}>{formatDate(r.date)}</Text>
                </View>
              ))
            ))}
          {tab === 'notes' && (
            <View>
              <View style={styles.formRow}>
                <Input value={noteText} onChangeText={setNoteText} placeholder="Add a CRM note..." style={{ flex: 1, marginBottom: SPACING.xs }} />
                <Button title="Add" size="sm" onPress={handleAddNote} style={{ height: 50, marginTop: 22 }} />
              </View>
              {notes.length === 0 ? (
                <EmptyState icon="chatbox-ellipses-outline" title="No notes yet" />
              ) : (
                notes.map((n) => (
                  <View key={n.id} style={styles.previewRow}>
                    <Text style={styles.previewTitle}>{n.note}</Text>
                    <Text style={styles.previewMeta}>{formatDate(n.createdAt)} - {n.createdBy}</Text>
                  </View>
                ))
              )}
            </View>
          )}
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
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  detailGrid: { gap: SPACING.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xxs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  detailValue: { ...TYPOGRAPHY.bodyStrong, flex: 1.4, textAlign: 'right' },
  previewRow: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  previewTitle: { ...TYPOGRAPHY.bodyStrong },
  previewMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
});
