import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionHeader from '../ui/SectionHeader';
import Select from '../ui/Select';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import { fetchPayroll, generatePayroll, editPayroll, markPaid } from '../../services/api/payrollApi';
import { listEmployeesForBranch, listAllEmployees } from '../../services/api/employeeDirectory';
import { previewPayslip } from '../../services/print/payslipDocumentService';
import { BRANCHES, getBranchById } from '../../constants/branches';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING } from '../../theme';

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Paid', value: 'PAID' },
];

const monthStr = () => new Date().toISOString().slice(0, 7);

const emptyForm = { employeeId: '', month: monthStr(), basicSalary: '', allowances: '0', bonus: '0', deductions: '0', advance: '0', remarks: '' };

/**
 * Payroll: admin Generate/Edit/Mark Paid + roster history (canManage=true),
 * or an employee's own payslip history (ownEmployeeId set, canManage=false).
 * Same shared-manager shape as the other new modules. Gross/Net are always
 * computed by payrollApi.generatePayroll from Attendance, never re-derived
 * or hand-edited here.
 */
export default function PayrollManager({ branchId, allowBranchPicker = false, ownEmployeeId, canManage = true, user }) {
  const { success, error: notifyError } = useNotification();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(monthStr());
  const [employeeFilter, setEmployeeFilter] = useState(ownEmployeeId || 'ALL');
  const [branchFilter, setBranchFilter] = useState(branchId || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, employeeId: ownEmployeeId || '' });
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const effectiveBranchId = branchId || (branchFilter !== 'ALL' ? branchFilter : undefined);
    const [list, empList] = await Promise.all([
      fetchPayroll({
        branchId: effectiveBranchId,
        employeeId: ownEmployeeId || (employeeFilter !== 'ALL' ? employeeFilter : undefined),
        month: monthFilter || undefined,
      }),
      branchId ? listEmployeesForBranch(branchId) : listAllEmployees(),
    ]);
    setRows(statusFilter === 'ALL' ? list : list.filter((r) => r.paymentStatus === statusFilter));
    setEmployees(empList);
    setLoading(false);
  }, [branchId, ownEmployeeId, monthFilter, employeeFilter, branchFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openGenerate = () => {
    setForm({ ...emptyForm, employeeId: ownEmployeeId || '', month: monthFilter || monthStr() });
    setFormVisible(true);
  };

  useRegisterPrimaryAction(canManage ? openGenerate : null, [canManage, monthFilter]);

  const handleGenerate = async () => {
    if (!form.employeeId || !form.month || !form.basicSalary) {
      notifyError('Employee, month and basic salary are required');
      return;
    }
    setSaving(true);
    try {
      const employee = employees.find((e) => e.id === form.employeeId);
      await generatePayroll(user, {
        ...form,
        employeeName: employee?.name || '',
        branchId: employee?.branchId || branchId,
        basicSalary: Number(form.basicSalary),
        allowances: Number(form.allowances) || 0,
        bonus: Number(form.bonus) || 0,
        deductions: Number(form.deductions) || 0,
        advance: Number(form.advance) || 0,
      });
      success('Payroll generated');
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to generate payroll');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (row) => {
    await markPaid(user, row.id);
    success(`${row.employeeName} marked paid for ${row.month}`);
    load();
  };

  const handlePrint = async (row) => {
    try {
      await previewPayslip({ payroll: row, branch: getBranchById(row.branchId) });
    } catch (e) {
      notifyError('Unable to open payslip preview');
    }
  };

  const columns = [
    ...(ownEmployeeId ? [] : [{ key: 'employeeName', title: 'Employee', flex: 1.2 }]),
    ...(allowBranchPicker ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{getBranchById(row.branchId)?.name || '-'}</Text> }] : []),
    { key: 'month', title: 'Month' },
    { key: 'grossSalary', title: 'Gross', render: (row) => <Text>{formatCurrency(row.grossSalary)}</Text> },
    { key: 'deductions', title: 'Deductions', render: (row) => <Text>{formatCurrency((row.deductions || 0) + (row.attendanceDeduction || 0) + (row.advance || 0))}</Text> },
    { key: 'netSalary', title: 'Net', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.netSalary)}</Text> },
    { key: 'paymentStatus', title: 'Status', render: (row) => <Badge label={row.paymentStatus} tone={row.paymentStatus === 'PAID' ? 'success' : 'warning'} /> },
    { key: 'paymentDate', title: 'Paid On', render: (row) => <Text>{row.paymentDate ? formatDate(row.paymentDate) : '-'}</Text> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={styles.actionsRow}>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          <ActionLink onPress={() => handlePrint(row)}>Print</ActionLink>
          {canManage && row.paymentStatus !== 'PAID' ? <ActionLink onPress={() => handleMarkPaid(row)}>Mark Paid</ActionLink> : null}
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.employeeName || row.month}
      subtitle={row.month}
      badge={<Badge label={row.paymentStatus} tone={row.paymentStatus === 'PAID' ? 'success' : 'warning'} />}
      lines={[{ label: 'Gross', value: formatCurrency(row.grossSalary) }, { label: 'Net', value: formatCurrency(row.netSalary) }]}
      actions={
        <>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          <ActionLink onPress={() => handlePrint(row)}>Print</ActionLink>
          {canManage && row.paymentStatus !== 'PAID' ? <ActionLink onPress={() => handleMarkPaid(row)}>Mark Paid</ActionLink> : null}
        </>
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title="Payroll"
        subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
        action={canManage ? <Button title="Generate Payroll" size="sm" onPress={openGenerate} /> : null}
      />

      <View style={styles.filterRow}>
        <Input value={monthFilter} onChangeText={setMonthFilter} placeholder="Month (YYYY-MM)" style={{ minWidth: 160, marginBottom: 0 }} />
        {!ownEmployeeId ? (
          <Select
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={[{ label: 'All Employees', value: 'ALL' }, ...employees.map((e) => ({ label: e.name, value: e.id }))]}
            style={{ minWidth: 180, marginBottom: 0 }}
          />
        ) : null}
        {allowBranchPicker ? (
          <Select
            value={branchFilter}
            onChange={setBranchFilter}
            options={[{ label: 'All Branches', value: 'ALL' }, ...BRANCHES.map((b) => ({ label: b.name, value: b.id }))]}
            style={{ minWidth: 180, marginBottom: 0 }}
          />
        ) : null}
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} style={{ minWidth: 160, marginBottom: 0 }} />
      </View>

      {loading ? (
        <LoadingState label="Loading payroll..." />
      ) : rows.length === 0 ? (
        <EmptyState icon="cash-outline" title="No payroll records found" message={canManage ? 'Generate payroll for an employee to get started.' : 'Your payslip has not been generated yet.'} />
      ) : (
        <ResponsiveList columns={columns} data={rows} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No payroll records found" />
      )}

      {canManage ? (
        <Modal visible={formVisible} onClose={() => setFormVisible(false)} title="Generate Payroll" width={480} scrollable={false}>
          <Select
            label="Employee *"
            value={form.employeeId}
            onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            options={employees.map((e) => ({ label: `${e.name} (${e.id})`, value: e.id }))}
            placeholder="Select employee"
            disabled={Boolean(ownEmployeeId)}
          />
          <Input label="Month *" value={form.month} onChangeText={(v) => setForm((f) => ({ ...f, month: v }))} placeholder="YYYY-MM" />
          <Input label="Basic Salary *" value={form.basicSalary} onChangeText={(v) => setForm((f) => ({ ...f, basicSalary: v }))} keyboardType="decimal-pad" />
          <View style={styles.formRow}>
            <Input label="Allowances" value={form.allowances} onChangeText={(v) => setForm((f) => ({ ...f, allowances: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input label="Bonus" value={form.bonus} onChangeText={(v) => setForm((f) => ({ ...f, bonus: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Deductions" value={form.deductions} onChangeText={(v) => setForm((f) => ({ ...f, deductions: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input label="Advance" value={form.advance} onChangeText={(v) => setForm((f) => ({ ...f, advance: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
          <Input label="Remarks" value={form.remarks} onChangeText={(v) => setForm((f) => ({ ...f, remarks: v }))} />
          <Text style={styles.helperText}>Net Salary is computed automatically: Gross - Deductions - Advance - an attendance-based deduction (Basic Salary / Working Days per absent/half day).</Text>
          <Button title="Generate" onPress={handleGenerate} loading={saving} />
        </Modal>
      ) : null}

      <Modal visible={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? `Payslip - ${viewing.month}` : 'Payslip'} width={480} scrollable={false}>
        {viewing ? (
          <View style={{ gap: 4 }}>
            <DetailRow label="Employee" value={`${viewing.employeeName} (${viewing.employeeId})`} />
            <DetailRow label="Working Days" value={viewing.workingDays} />
            <DetailRow label="Present / Absent / Half / Leave" value={`${viewing.presentDays} / ${viewing.absentDays} / ${viewing.halfDays} / ${viewing.leaveDays}`} />
            <DetailRow label="Basic Salary" value={formatCurrency(viewing.basicSalary)} />
            <DetailRow label="Allowances" value={formatCurrency(viewing.allowances)} />
            <DetailRow label="Bonus" value={formatCurrency(viewing.bonus)} />
            <DetailRow label="Gross Salary" value={formatCurrency(viewing.grossSalary)} />
            <DetailRow label="Attendance Deduction" value={formatCurrency(viewing.attendanceDeduction)} />
            <DetailRow label="Other Deductions" value={formatCurrency(viewing.deductions)} />
            <DetailRow label="Advance" value={formatCurrency(viewing.advance)} />
            <DetailRow label="Net Salary" value={formatCurrency(viewing.netSalary)} />
            <DetailRow label="Status" value={viewing.paymentStatus} />
            <Button title="Print Payslip" size="sm" onPress={() => handlePrint(viewing)} style={{ marginTop: SPACING.md }} />
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
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  formRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flexWrap: 'wrap' },
  helperText: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  detailValue: { fontWeight: '700', color: COLORS.textPrimary, flex: 1.2, textAlign: 'right' },
});
