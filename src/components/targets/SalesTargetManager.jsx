import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
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
import { fetchTargets, createTargetEntry, editTarget, cancelTargetEntry, computeTargetProgress } from '../../services/api/salesTargetApi';
import { listEmployeesForBranch, listAllEmployees } from '../../services/api/employeeDirectory';
import { BRANCHES } from '../../constants/branches';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING } from '../../theme';

const PERIOD_TYPES = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Yearly', value: 'YEARLY' },
];

const STATUS_TONE = { IN_PROGRESS: 'info', ACHIEVED: 'success', MISSED: 'danger', CANCELLED: 'neutral' };

const emptyForm = { targetName: '', employeeId: '', branchId: '', periodType: 'MONTHLY', startDate: '', endDate: '', targetAmount: '', targetQuantity: '', notes: '' };

/**
 * Sales Target creation and Target vs Actual tracking, shared by Super
 * Admin (all-branch), Branch Admin and Employee (own targets, read-only)
 * screens - same shape as PurchaseManager.jsx.
 *
 * @param {string|undefined} branchId - branch to scope by; undefined = all branches
 * @param {boolean} allowBranchPicker - show a Branch select in the create form
 * @param {string|undefined} ownEmployeeId - when set (employee role), list is locked to this employee and no manage actions are shown
 * @param {boolean} canManage - whether Create/Edit/Cancel actions are available
 */
export default function SalesTargetManager({ branchId, allowBranchPicker = false, ownEmployeeId, canManage = true, user }) {
  const { success, error: notifyError } = useNotification();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, employeeId: ownEmployeeId || '', branchId: branchId || '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTargetRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [targets, empList] = await Promise.all([
      fetchTargets({ branchId, employeeId: ownEmployeeId, periodType: periodFilter, status: statusFilter }),
      branchId ? listEmployeesForBranch(branchId) : listAllEmployees(),
    ]);
    const withProgress = await Promise.all(
      targets.map(async (t) => ({ ...t, progress: await computeTargetProgress(t) }))
    );
    setRows(withProgress);
    setEmployees(empList);
    setLoading(false);
  }, [branchId, ownEmployeeId, periodFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const targetAmount = rows.reduce((s, r) => s + (Number(r.targetAmount) || 0), 0);
    const actual = rows.reduce((s, r) => s + (r.progress?.actual || 0), 0);
    const remaining = Math.max(targetAmount - actual, 0);
    const achievementPct = targetAmount > 0 ? Math.round((actual / targetAmount) * 1000) / 10 : 0;
    return { targetAmount, actual, remaining, achievementPct };
  }, [rows]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, employeeId: ownEmployeeId || '', branchId: branchId || '' });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(canManage ? openAdd : null, [canManage, ownEmployeeId, branchId]);

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      targetName: row.targetName, employeeId: row.employeeId, branchId: row.branchId || '',
      periodType: row.periodType, startDate: row.startDate, endDate: row.endDate,
      targetAmount: String(row.targetAmount), targetQuantity: row.targetQuantity ? String(row.targetQuantity) : '',
      notes: row.notes || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.targetName.trim()) errors.targetName = 'Target name is required';
    if (!form.employeeId) errors.employeeId = 'Employee is required';
    if (!form.startDate) errors.startDate = 'Start date is required';
    if (!form.endDate) errors.endDate = 'End date is required';
    if (!form.targetAmount || Number(form.targetAmount) <= 0) errors.targetAmount = 'Target amount must be greater than 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const employee = employees.find((e) => e.id === form.employeeId);
      const payload = {
        ...form,
        employeeName: employee?.name || '',
        branchId: form.branchId || employee?.branchId || branchId,
        targetAmount: Number(form.targetAmount),
        targetQuantity: form.targetQuantity ? Number(form.targetQuantity) : null,
      };
      if (editing) {
        await editTarget(user, editing.id, payload);
        success('Target updated');
      } else {
        await createTargetEntry(user, payload);
        success('Target created');
      }
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTarget = async () => {
    if (!cancelTarget) return;
    await cancelTargetEntry(user, cancelTarget.id);
    success('Target cancelled');
    setCancelTargetRow(null);
    load();
  };

  const columns = [
    { key: 'targetName', title: 'Target', flex: 1.2 },
    { key: 'employeeName', title: 'Employee' },
    ...(allowBranchPicker ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name || '-'}</Text> }] : []),
    { key: 'periodType', title: 'Period' },
    { key: 'targetAmount', title: 'Target', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.targetAmount)}</Text> },
    { key: 'actual', title: 'Actual', render: (row) => <Text>{formatCurrency(row.progress?.actual || 0)}</Text> },
    { key: 'remaining', title: 'Remaining', render: (row) => <Text>{formatCurrency(row.progress?.remaining || 0)}</Text> },
    { key: 'achievement', title: 'Achievement', render: (row) => <Text style={{ fontWeight: '700', color: (row.progress?.achievementPct || 0) >= 100 ? COLORS.success : COLORS.textPrimary }}>{row.progress?.achievementPct || 0}%</Text> },
    { key: 'status', title: 'Status', render: (row) => <Badge label={(row.progress?.targetStatus || row.status).replace('_', ' ')} tone={STATUS_TONE[row.progress?.targetStatus] || STATUS_TONE[row.status]} /> },
    ...(canManage
      ? [{
          key: 'actions',
          title: 'Actions',
          render: (row) => (
            <View style={styles.actionsRow}>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              {row.status !== 'CANCELLED' ? <ActionLink muted onPress={() => setCancelTargetRow(row)}>Cancel</ActionLink> : null}
            </View>
          ),
        }]
      : []),
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.targetName}
      subtitle={`${row.employeeName} - ${row.periodType}`}
      badge={<Badge label={(row.progress?.targetStatus || row.status).replace('_', ' ')} tone={STATUS_TONE[row.progress?.targetStatus] || STATUS_TONE[row.status]} />}
      lines={[
        { label: 'Target', value: formatCurrency(row.targetAmount) },
        { label: 'Actual', value: formatCurrency(row.progress?.actual || 0) },
        { label: 'Remaining', value: formatCurrency(row.progress?.remaining || 0) },
        { label: 'Achievement', value: `${row.progress?.achievementPct || 0}%` },
      ]}
      actions={
        canManage ? (
          <>
            <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
            {row.status !== 'CANCELLED' ? <ActionLink muted onPress={() => setCancelTargetRow(row)}>Cancel</ActionLink> : null}
          </>
        ) : null
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title="Sales Targets"
        subtitle={`${rows.length} target${rows.length === 1 ? '' : 's'}`}
        action={canManage ? <Button title="New Target" size="sm" onPress={openAdd} /> : null}
      />

      <View style={styles.metricsRow}>
        <MetricCard label="Total Target" value={formatCurrency(totals.targetAmount)} icon="flag-outline" tone="brandBlue" />
        <MetricCard label="Achieved" value={formatCurrency(totals.actual)} icon="checkmark-done-outline" tone="success" />
        <MetricCard label="Remaining" value={formatCurrency(totals.remaining)} icon="hourglass-outline" tone="warning" />
        <MetricCard label="Achievement %" value={`${totals.achievementPct}%`} icon="trophy-outline" tone="purple" />
      </View>

      <View style={styles.filterRow}>
        <Select value={periodFilter} onChange={setPeriodFilter} options={[{ label: 'All Periods', value: 'ALL' }, ...PERIOD_TYPES]} style={{ minWidth: 180, marginBottom: 0 }} />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'All Status', value: 'ALL' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Achieved', value: 'ACHIEVED' },
            { label: 'Missed', value: 'MISSED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ]}
          style={{ minWidth: 180, marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <LoadingState label="Loading targets..." />
      ) : rows.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No targets found" message={canManage ? 'Create a sales target to start tracking progress.' : 'No targets have been assigned to you yet.'} />
      ) : (
        <ResponsiveList columns={columns} data={rows} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No targets found" />
      )}

      {canManage ? (
        <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={editing ? 'Edit Target' : 'New Sales Target'} width={560}>
          <Input label="Target Name *" value={form.targetName} onChangeText={(v) => setForm((f) => ({ ...f, targetName: v }))} error={formErrors.targetName} />
          <View style={styles.formRow}>
            <Select
              label="Employee *"
              value={form.employeeId}
              onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
              options={employees.map((e) => ({ label: `${e.name} (${e.id})`, value: e.id }))}
              placeholder="Select employee"
              style={{ flex: 1 }}
            />
            <Select label="Period Type" value={form.periodType} onChange={(v) => setForm((f) => ({ ...f, periodType: v }))} options={PERIOD_TYPES} style={{ flex: 1 }} />
          </View>
          {formErrors.employeeId ? <Text style={styles.fieldError}>{formErrors.employeeId}</Text> : null}
          {allowBranchPicker ? (
            <Select label="Branch" value={form.branchId} onChange={(v) => setForm((f) => ({ ...f, branchId: v }))} options={BRANCHES.map((b) => ({ label: b.name, value: b.id }))} placeholder="Select branch" />
          ) : null}
          <View style={styles.formRow}>
            <Input label="Start Date *" value={form.startDate} onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" error={formErrors.startDate} style={{ flex: 1 }} />
            <Input label="End Date *" value={form.endDate} onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))} placeholder="YYYY-MM-DD" error={formErrors.endDate} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Target Amount *" value={form.targetAmount} onChangeText={(v) => setForm((f) => ({ ...f, targetAmount: v }))} keyboardType="decimal-pad" error={formErrors.targetAmount} style={{ flex: 1 }} />
            <Input label="Target Quantity" value={form.targetQuantity} onChangeText={(v) => setForm((f) => ({ ...f, targetQuantity: v }))} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <Input label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <Button title={editing ? 'Save Changes' : 'Save Target'} onPress={handleSave} loading={saving} />
        </Modal>
      ) : null}

      <ConfirmModal
        visible={Boolean(cancelTarget)}
        onClose={() => setCancelTargetRow(null)}
        onConfirm={handleCancelTarget}
        title="Cancel Target"
        message={`Cancel the target "${cancelTarget?.targetName}"?`}
        confirmLabel="Cancel Target"
        variant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  formRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flexWrap: 'wrap' },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
});
