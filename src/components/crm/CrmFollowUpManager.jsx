import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import MetricCard from '../ui/MetricCard';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import Modal from '../ui/Modal';
import ConfirmModal from '../ui/ConfirmModal';
import Input from '../ui/Input';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import {
  fetchFollowUps,
  fetchFollowUpCounts,
  createFollowUpEntry,
  editFollowUp,
  markFollowUpComplete,
  markFollowUpCancelled,
  rescheduleFollowUpEntry,
} from '../../services/api/crmFollowUpApi';
import { listCustomersWithProfile } from '../../services/api/customerMasterApi';
import { listEmployeesForBranch, listAllEmployees } from '../../services/api/employeeDirectory';
import { formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const TYPES = [
  { label: 'Call', value: 'CALL' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Visit', value: 'VISIT' },
];

const PRIORITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
];

const STATUSES = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Following', value: 'FOLLOWING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_TONE = { PENDING: 'warning', FOLLOWING: 'info', COMPLETED: 'success', CANCELLED: 'neutral' };
const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' };

const emptyForm = {
  customerId: '', customerName: '', contactPerson: '', mobile: '',
  followUpDate: new Date().toISOString().slice(0, 10), followUpTime: '10:00',
  type: 'CALL', priority: 'MEDIUM', assignedTo: '', notes: '', nextFollowUpDate: '',
};

/**
 * CRM Follow-up scheduling/workflow, shared by Super Admin (all-branch),
 * Branch Admin and Employee (own-assigned only) screens - same shape as
 * CustomerManager.jsx.
 *
 * @param {string|undefined} branchId - branch to filter by; undefined = all branches (super admin)
 * @param {boolean} allowBranchPicker - show a Branch select in the Add/Edit form
 * @param {string|undefined} ownEmployeeId - when set (employee role), list/create is locked to this assignee
 */
export default function CrmFollowUpManager({ branchId, allowBranchPicker = false, ownEmployeeId, user }) {
  const { success, error: notifyError } = useNotification();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ today: 0, overdue: 0, upcoming: 0 });
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, assignedTo: ownEmployeeId || '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [completeTarget, setCompleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const filters = {
      branchId,
      employeeId: ownEmployeeId || (employeeFilter !== 'ALL' ? employeeFilter : undefined),
      customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
      status: statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    const [list, countData, custList, empList] = await Promise.all([
      fetchFollowUps(filters),
      fetchFollowUpCounts({ branchId, employeeId: ownEmployeeId }),
      listCustomersWithProfile(branchId),
      branchId ? listEmployeesForBranch(branchId) : listAllEmployees(),
    ]);
    setRows(list);
    setCounts(countData);
    setCustomers(custList);
    setEmployees(empList);
    setLoading(false);
  }, [branchId, ownEmployeeId, statusFilter, employeeFilter, customerFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !query ||
          r.customerName?.toLowerCase().includes(query.toLowerCase()) ||
          r.contactPerson?.toLowerCase().includes(query.toLowerCase()) ||
          r.mobile?.includes(query)
      ),
    [rows, query]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, assignedTo: ownEmployeeId || '' });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(openAdd, [ownEmployeeId]);

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      customerId: row.customerId || '', customerName: row.customerName || '',
      contactPerson: row.contactPerson || '', mobile: row.mobile || '',
      followUpDate: row.followUpDate, followUpTime: row.followUpTime || '10:00',
      type: row.type, priority: row.priority, assignedTo: row.assignedTo || '',
      notes: row.notes || '', nextFollowUpDate: row.nextFollowUpDate || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setForm((f) => ({
      ...f,
      customerId,
      customerName: customer?.name || '',
      contactPerson: f.contactPerson || customer?.contactPerson || '',
      mobile: f.mobile || customer?.mobile || '',
    }));
  };

  const validate = () => {
    const errors = {};
    if (!form.customerId) errors.customerId = 'Customer is required';
    if (!form.followUpDate) errors.followUpDate = 'Follow-up date is required';
    if (!form.assignedTo) errors.assignedTo = 'Assigned employee is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const assignedEmployee = employees.find((e) => e.id === form.assignedTo);
      const payload = { ...form, branchId: branchId || assignedEmployee?.branchId, assignedToName: assignedEmployee?.name || '' };
      if (editing) {
        await editFollowUp(user, editing.id, payload);
        success('Follow-up updated');
      } else {
        await createFollowUpEntry(user, payload);
        success('Follow-up created');
      }
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!completeTarget) return;
    await markFollowUpComplete(user, completeTarget.id, 'Marked complete');
    success('Follow-up completed');
    setCompleteTarget(null);
    load();
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await markFollowUpCancelled(user, cancelTarget.id, 'Cancelled');
    success('Follow-up cancelled');
    setCancelTarget(null);
    load();
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setCustomerFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const filtersActive = Boolean(
    query || statusFilter !== 'ALL' || employeeFilter !== 'ALL' || customerFilter !== 'ALL' || dateFrom || dateTo
  );

  const openReschedule = (row) => {
    setRescheduleTarget(row);
    setRescheduleDate(row.nextFollowUpDate || row.followUpDate);
    setRescheduleNote('');
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    await rescheduleFollowUpEntry(user, rescheduleTarget.id, { followUpDate: rescheduleDate, followUpTime: rescheduleTarget.followUpTime, notes: rescheduleNote });
    success('Follow-up rescheduled');
    setRescheduleTarget(null);
    load();
  };

  const columns = [
    { key: 'customerName', title: 'Customer', flex: 1.3 },
    { key: 'followUpDate', title: 'Date', render: (row) => <Text>{formatDate(row.followUpDate)} {row.followUpTime || ''}</Text> },
    { key: 'type', title: 'Type', render: (row) => <Badge label={row.type} tone="info" /> },
    { key: 'priority', title: 'Priority', render: (row) => <Badge label={row.priority} tone={PRIORITY_TONE[row.priority]} /> },
    { key: 'assignedToName', title: 'Assigned To' },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={STATUS_TONE[row.status]} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.8,
      render: (row) => (
        <View style={styles.actionsRow}>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {row.status !== 'COMPLETED' && row.status !== 'CANCELLED' ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink onPress={() => openReschedule(row)}>Reschedule</ActionLink>
              <ActionLink onPress={() => setCompleteTarget(row)}>Complete</ActionLink>
              <ActionLink muted onPress={() => setCancelTarget(row)}>Cancel</ActionLink>
            </>
          ) : null}
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.customerName}
      subtitle={`${formatDate(row.followUpDate)} ${row.followUpTime || ''} - ${row.assignedToName || ''}`}
      badge={<Badge label={row.status} tone={STATUS_TONE[row.status]} />}
      lines={[
        { label: 'Type', value: row.type },
        { label: 'Priority', value: row.priority },
        { label: 'Contact', value: row.contactPerson || row.mobile || '-' },
      ]}
      actions={
        <>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {row.status !== 'COMPLETED' && row.status !== 'CANCELLED' ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink onPress={() => openReschedule(row)}>Reschedule</ActionLink>
              <ActionLink onPress={() => setCompleteTarget(row)}>Complete</ActionLink>
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
        title="CRM Follow-ups"
        subtitle={`${rows.length} follow-up${rows.length === 1 ? '' : 's'}`}
        action={<Button title="New Follow-up" size="sm" onPress={openAdd} />}
      />

      <View style={styles.metricsRow}>
        <MetricCard label="Today's Follow-ups" value={counts.today} icon="today-outline" tone="brandBlue" />
        <MetricCard label="Overdue" value={counts.overdue} icon="alert-circle-outline" tone="danger" />
        <MetricCard label="Upcoming" value={counts.upcoming} icon="calendar-outline" tone="success" />
      </View>

      <View style={styles.filterRow}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search by customer, contact or mobile" style={{ flex: 1, minWidth: 240, marginBottom: 0 }} />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ label: 'All Status', value: 'ALL' }, ...STATUSES]}
          style={{ minWidth: 160, marginBottom: 0 }}
        />
        <Select
          value={customerFilter}
          onChange={setCustomerFilter}
          options={[{ label: 'All Customers', value: 'ALL' }, ...customers.map((c) => ({ label: c.name, value: c.id }))]}
          style={{ minWidth: 180, marginBottom: 0 }}
        />
        {!ownEmployeeId ? (
          <Select
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={[{ label: 'All Employees', value: 'ALL' }, ...employees.map((e) => ({ label: e.name, value: e.id }))]}
            style={{ minWidth: 180, marginBottom: 0 }}
          />
        ) : null}
        <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From (YYYY-MM-DD)" style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
        <Input value={dateTo} onChangeText={setDateTo} placeholder="To (YYYY-MM-DD)" style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
        {filtersActive ? <Button title="Clear Filters" variant="ghost" outline size="sm" onPress={clearFilters} /> : null}
      </View>

      {loading ? (
        <LoadingState label="Loading follow-ups..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="call-outline" title="No follow-ups found" message="Create a follow-up to start tracking this customer." />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No follow-ups found" />
      )}

      <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={editing ? 'Edit Follow-up' : 'New Follow-up'} width={560}>
        <Select
          label="Customer *"
          value={form.customerId}
          onChange={handleCustomerChange}
          options={customers.map((c) => ({ label: `${c.name} (${c.customerCode})`, value: c.id }))}
          placeholder="Select customer"
        />
        {formErrors.customerId ? <Text style={styles.fieldError}>{formErrors.customerId}</Text> : null}
        <View style={styles.formRow}>
          <Input label="Contact Person" value={form.contactPerson} onChangeText={(v) => setForm((f) => ({ ...f, contactPerson: v }))} style={{ flex: 1 }} />
          <Input label="Mobile" value={form.mobile} onChangeText={(v) => setForm((f) => ({ ...f, mobile: v }))} keyboardType="number-pad" maxLength={10} style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Input label="Follow-up Date *" value={form.followUpDate} onChangeText={(v) => setForm((f) => ({ ...f, followUpDate: v }))} placeholder="YYYY-MM-DD" error={formErrors.followUpDate} style={{ flex: 1 }} />
          <Input label="Follow-up Time" value={form.followUpTime} onChangeText={(v) => setForm((f) => ({ ...f, followUpTime: v }))} placeholder="HH:MM" style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <Select label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={TYPES} style={{ flex: 1 }} />
          <Select label="Priority" value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={PRIORITIES} style={{ flex: 1 }} />
        </View>
        <Select
          label="Assigned To *"
          value={form.assignedTo}
          onChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}
          options={employees.map((e) => ({ label: `${e.name} (${e.id})`, value: e.id }))}
          placeholder="Select employee"
          disabled={Boolean(ownEmployeeId)}
        />
        {formErrors.assignedTo ? <Text style={styles.fieldError}>{formErrors.assignedTo}</Text> : null}
        <Input label="Next Follow-up Date" value={form.nextFollowUpDate} onChangeText={(v) => setForm((f) => ({ ...f, nextFollowUpDate: v }))} placeholder="YYYY-MM-DD (optional)" />
        <Input label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />
        <Button title={editing ? 'Save Changes' : 'Save Follow-up'} onPress={handleSave} loading={saving} />
      </Modal>

      <Modal visible={Boolean(rescheduleTarget)} onClose={() => setRescheduleTarget(null)} title="Reschedule Follow-up" width={420} scrollable={false}>
        <Input label="New Follow-up Date" value={rescheduleDate} onChangeText={setRescheduleDate} placeholder="YYYY-MM-DD" />
        <Input label="Note" value={rescheduleNote} onChangeText={setRescheduleNote} placeholder="Optional note" />
        <Button title="Reschedule" onPress={handleReschedule} />
      </Modal>

      <ConfirmModal
        visible={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Mark Follow-up Complete"
        message={`Mark the follow-up with ${completeTarget?.customerName} as completed?`}
        confirmLabel="Complete"
      />
      <ConfirmModal
        visible={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Follow-up"
        message={`Cancel the follow-up with ${cancelTarget?.customerName}?`}
        confirmLabel="Cancel Follow-up"
        variant="danger"
      />

      <Modal visible={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.customerName || 'Follow-up'} width={520} scrollable={false}>
        {viewing ? (
          <View style={{ gap: 4 }}>
            <DetailRow label="Contact" value={viewing.contactPerson || '-'} />
            <DetailRow label="Mobile" value={viewing.mobile || '-'} />
            <DetailRow label="Date" value={`${formatDate(viewing.followUpDate)} ${viewing.followUpTime || ''}`} />
            <DetailRow label="Type" value={viewing.type} />
            <DetailRow label="Priority" value={viewing.priority} />
            <DetailRow label="Assigned To" value={viewing.assignedToName || '-'} />
            <DetailRow label="Status" value={viewing.status} />
            <DetailRow label="Notes" value={viewing.notes || '-'} />
            <Text style={styles.sectionLabel}>History</Text>
            {(viewing.history || []).slice().reverse().map((h, idx) => (
              <Text key={idx} style={styles.historyRow}>{formatDate(h.at)} - {h.action}{h.note ? `: ${h.note}` : ''}</Text>
            ))}
          </View>
        ) : null}
      </Modal>
    </View>
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
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  formRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flexWrap: 'wrap' },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xxs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  detailValue: { ...TYPOGRAPHY.bodyStrong, flex: 1.4, textAlign: 'right' },
  sectionLabel: { ...TYPOGRAPHY.h4, marginTop: SPACING.md, marginBottom: SPACING.xs },
  historyRow: { ...TYPOGRAPHY.caption, marginBottom: 2 },
});
