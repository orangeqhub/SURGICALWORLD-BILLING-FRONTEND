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
import Input from '../ui/Input';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import Card from '../ui/Card';
import Tabs from '../ui/Tabs';
import DataTable from '../ui/DataTable';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import {
  fetchAttendance,
  fetchTodayAttendance,
  checkInEmployee,
  checkOutEmployee,
  recordManualAttendance,
  fetchMonthlySummary,
} from '../../services/api/attendanceApi';
import { listEmployeesForBranch, listAllEmployees } from '../../services/api/employeeDirectory';
import { BRANCHES } from '../../constants/branches';
import { formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const STATUSES = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Half Day', value: 'HALF_DAY' },
  { label: 'Leave', value: 'LEAVE' },
  { label: 'Holiday', value: 'HOLIDAY' },
];

const STATUS_TONE = { PRESENT: 'success', ABSENT: 'danger', HALF_DAY: 'warning', LEAVE: 'info', HOLIDAY: 'neutral' };

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);

const emptyForm = { employeeId: '', branchId: '', date: todayStr(), status: 'PRESENT', checkInTime: '', checkOutTime: '', remarks: '' };

/**
 * Attendance: admin manual entry/edit + roster history (canManage=true), or
 * an employee's own Check In / Check Out self-service + personal monthly
 * summary (ownEmployeeId set, canManage=false). Same shared-manager shape
 * as the other new modules.
 */
export default function AttendanceManager({ branchId, allowBranchPicker = false, ownEmployeeId, ownEmployeeName, canManage = true, user }) {
  const { success, error: notifyError } = useNotification();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState(ownEmployeeId || 'ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, employeeId: ownEmployeeId || '', branchId: branchId || '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [checking, setChecking] = useState(false);

  const [viewTab, setViewTab] = useState('DAILY');
  const [summaryMonth, setSummaryMonth] = useState(monthStr());
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, empList] = await Promise.all([
      fetchAttendance({ branchId, employeeId: ownEmployeeId || (employeeFilter !== 'ALL' ? employeeFilter : undefined), dateFrom, dateTo }),
      branchId ? listEmployeesForBranch(branchId) : listAllEmployees(),
    ]);
    setRows(list);
    setEmployees(empList);
    if (ownEmployeeId) {
      const [today, monthSummary] = await Promise.all([fetchTodayAttendance(ownEmployeeId), fetchMonthlySummary(ownEmployeeId, monthStr())]);
      setTodayRecord(today);
      setSummary(monthSummary);
    }
    setLoading(false);
  }, [branchId, ownEmployeeId, employeeFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMonthlySummary = useCallback(async () => {
    if (!canManage || viewTab !== 'SUMMARY' || employees.length === 0) return;
    setSummaryLoading(true);
    const targetEmployees = employeeFilter !== 'ALL' ? employees.filter((e) => e.id === employeeFilter) : employees;
    const results = await Promise.all(
      targetEmployees.map(async (emp) => {
        const s = await fetchMonthlySummary(emp.id, summaryMonth);
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          branchId: emp.branchId,
          presentDays: s.presentDays,
          absentDays: s.absentDays,
          halfDays: s.halfDays,
          leaveDays: s.leaveDays,
          workingDays: s.workingDays,
        };
      })
    );
    setMonthlySummaries(results);
    setSummaryLoading(false);
  }, [canManage, viewTab, employees, employeeFilter, summaryMonth]);

  useEffect(() => {
    loadMonthlySummary();
  }, [loadMonthlySummary]);

  const openAdd = () => {
    setForm({ ...emptyForm, employeeId: '', branchId: branchId || '' });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(canManage ? openAdd : null, [canManage, branchId]);

  const openEditRow = (row) => {
    setForm({
      employeeId: row.employeeId, branchId: row.branchId || '', date: row.date,
      status: row.status, checkInTime: row.checkInTime || '', checkOutTime: row.checkOutTime || '', remarks: row.remarks || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.employeeId) errors.employeeId = 'Employee is required';
    if (!form.date) errors.date = 'Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const employee = employees.find((e) => e.id === form.employeeId);
      await recordManualAttendance(user, { ...form, employeeName: employee?.name || '', branchId: form.branchId || employee?.branchId || branchId });
      success('Attendance saved');
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      await checkInEmployee({ employeeId: ownEmployeeId, employeeName: ownEmployeeName, branchId });
      success('Checked in');
      load();
    } catch (e) {
      notifyError(e.message || 'Check-in failed');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      await checkOutEmployee({ employeeId: ownEmployeeId });
      success('Checked out');
      load();
    } catch (e) {
      notifyError(e.message || 'Check-out failed');
    } finally {
      setChecking(false);
    }
  };

  const columns = useMemo(
    () => [
      ...(ownEmployeeId ? [] : [{ key: 'employeeName', title: 'Employee', flex: 1.2 }]),
      ...(allowBranchPicker ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name || '-'}</Text> }] : []),
      { key: 'date', title: 'Date', render: (row) => <Text>{formatDate(row.date)}</Text> },
      { key: 'checkInTime', title: 'Check In', render: (row) => <Text>{row.checkInTime || '-'}</Text> },
      { key: 'checkOutTime', title: 'Check Out', render: (row) => <Text>{row.checkOutTime || '-'}</Text> },
      { key: 'workingHours', title: 'Hours', render: (row) => <Text>{row.workingHours || 0}h</Text> },
      { key: 'status', title: 'Status', render: (row) => <Badge label={row.status.replace('_', ' ')} tone={STATUS_TONE[row.status]} /> },
      ...(canManage ? [{ key: 'actions', title: 'Actions', render: (row) => <ActionLink onPress={() => openEditRow(row)}>Edit</ActionLink> }] : []),
    ],
    [ownEmployeeId, allowBranchPicker, canManage, employees]
  );

  const summaryColumns = useMemo(
    () => [
      { key: 'employeeName', title: 'Employee', flex: 1.2 },
      ...(allowBranchPicker ? [{ key: 'branchId', title: 'Branch', render: (row) => <Text>{BRANCHES.find((b) => b.id === row.branchId)?.name || '-'}</Text> }] : []),
      { key: 'presentDays', title: 'Present' },
      { key: 'absentDays', title: 'Absent' },
      { key: 'halfDays', title: 'Half Day' },
      { key: 'leaveDays', title: 'Leave' },
      { key: 'workingDays', title: 'Working Days' },
    ],
    [allowBranchPicker]
  );

  const renderCard = (row) => (
    <ListCard
      title={row.employeeName || formatDate(row.date)}
      subtitle={`${formatDate(row.date)} - ${row.checkInTime || '-'} to ${row.checkOutTime || '-'}`}
      badge={<Badge label={row.status.replace('_', ' ')} tone={STATUS_TONE[row.status]} />}
      lines={[{ label: 'Hours', value: `${row.workingHours || 0}h` }]}
      actions={canManage ? <ActionLink onPress={() => openEditRow(row)}>Edit</ActionLink> : null}
    />
  );

  return (
    <View>
      <SectionHeader
        title="Attendance"
        subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
        action={canManage ? <Button title="Add Attendance" size="sm" onPress={openAdd} /> : null}
      />

      {ownEmployeeId ? (
        <Card style={{ marginBottom: SPACING.lg, maxWidth: 480 }}>
          <Text style={styles.cardTitle}>Today - {formatDate(todayStr())}</Text>
          <Text style={styles.selfRow}>Check In: <Text style={styles.selfValue}>{todayRecord?.checkInTime || 'Not checked in'}</Text></Text>
          <Text style={styles.selfRow}>Check Out: <Text style={styles.selfValue}>{todayRecord?.checkOutTime || 'Not checked out'}</Text></Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
            <Button title="Check In" onPress={handleCheckIn} loading={checking} disabled={Boolean(todayRecord?.checkInTime)} style={{ flex: 1 }} />
            <Button title="Check Out" variant="secondary" onPress={handleCheckOut} loading={checking} disabled={!todayRecord?.checkInTime || Boolean(todayRecord?.checkOutTime)} style={{ flex: 1 }} />
          </View>
          {summary ? (
            <View style={styles.metricsRow}>
              <MetricCard label="Present" value={summary.presentDays} icon="checkmark-circle-outline" tone="success" />
              <MetricCard label="Absent" value={summary.absentDays} icon="close-circle-outline" tone="danger" />
              <MetricCard label="Leave" value={summary.leaveDays} icon="airplane-outline" tone="info" />
              <MetricCard label="Total Hours" value={`${summary.totalHours}h`} icon="time-outline" tone="brandBlue" />
            </View>
          ) : null}
        </Card>
      ) : null}

      {canManage ? (
        <Tabs
          tabs={[{ key: 'DAILY', label: 'Daily Records' }, { key: 'SUMMARY', label: 'Monthly Summary' }]}
          active={viewTab}
          onChange={setViewTab}
        />
      ) : null}

      {canManage ? (
        <View style={styles.filterRow}>
          <Select
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={[{ label: 'All Employees', value: 'ALL' }, ...employees.map((e) => ({ label: e.name, value: e.id }))]}
            style={{ minWidth: 200, marginBottom: 0 }}
          />
          {viewTab === 'DAILY' ? (
            <>
              <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From (YYYY-MM-DD)" style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
              <Input value={dateTo} onChangeText={setDateTo} placeholder="To (YYYY-MM-DD)" style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
            </>
          ) : (
            <Input value={summaryMonth} onChangeText={setSummaryMonth} placeholder="Month (YYYY-MM)" style={{ minWidth: 160, marginBottom: 0 }} />
          )}
        </View>
      ) : null}

      {viewTab === 'SUMMARY' && canManage ? (
        summaryLoading ? (
          <LoadingState label="Loading monthly summary..." />
        ) : monthlySummaries.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No employees found for this branch" />
        ) : (
          <DataTable columns={summaryColumns} data={monthlySummaries} keyExtractor={(item) => item.employeeId} />
        )
      ) : loading ? (
        <LoadingState label="Loading attendance..." />
      ) : rows.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No attendance records found" />
      ) : (
        <ResponsiveList columns={columns} data={rows} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No attendance records found" />
      )}

      {canManage ? (
        <Modal visible={formVisible} onClose={() => setFormVisible(false)} title="Attendance Entry" width={480} scrollable={false}>
          <Select
            label="Employee *"
            value={form.employeeId}
            onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            options={employees.map((e) => ({ label: `${e.name} (${e.id})`, value: e.id }))}
            placeholder="Select employee"
          />
          {formErrors.employeeId ? <Text style={styles.fieldError}>{formErrors.employeeId}</Text> : null}
          <Input label="Date *" value={form.date} onChangeText={(v) => setForm((f) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" error={formErrors.date} />
          <Select label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={STATUSES} />
          <View style={styles.formRow}>
            <Input label="Check In" value={form.checkInTime} onChangeText={(v) => setForm((f) => ({ ...f, checkInTime: v }))} placeholder="HH:MM" style={{ flex: 1 }} />
            <Input label="Check Out" value={form.checkOutTime} onChangeText={(v) => setForm((f) => ({ ...f, checkOutTime: v }))} placeholder="HH:MM" style={{ flex: 1 }} />
          </View>
          <Input label="Remarks" value={form.remarks} onChangeText={(v) => setForm((f) => ({ ...f, remarks: v }))} />
          <Button title="Save Attendance" onPress={handleSave} loading={saving} />
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap', alignItems: 'center' },
  formRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  cardTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  selfRow: { ...TYPOGRAPHY.body, marginBottom: 2 },
  selfValue: { fontWeight: '700', color: COLORS.textPrimary },
});
