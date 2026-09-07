import mockStore from './mockStore';

const KEY = 'sw_attendance';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function computeWorkingHours(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) return 0;
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  return minutes > 0 ? Math.round((minutes / 60) * 100) / 100 : 0;
}

export async function listAttendance({ branchId, employeeId, dateFrom, dateTo } = {}) {
  const rows = await mockStore.getAll(KEY);
  return rows
    .filter((r) => !branchId || r.branchId === branchId)
    .filter((r) => !employeeId || r.employeeId === employeeId)
    .filter((r) => !dateFrom || r.date >= dateFrom)
    .filter((r) => !dateTo || r.date <= dateTo)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getAttendanceRecord(employeeId, date) {
  const rows = await mockStore.getAll(KEY);
  return rows.find((r) => r.employeeId === employeeId && r.date === date) || null;
}

/**
 * Single upsert path for every write (check-in, check-out, manual entry,
 * edit) so "one record per employee/date" can never be violated - the
 * caller never has to know whether today's row already exists.
 */
async function upsertAttendance(employeeId, date, patch) {
  const existing = await getAttendanceRecord(employeeId, date);
  const timestamp = new Date().toISOString();
  if (existing) {
    const merged = { ...existing, ...patch };
    merged.workingHours = computeWorkingHours(merged.checkInTime, merged.checkOutTime);
    return mockStore.update(KEY, existing.id, { ...merged, updatedAt: timestamp });
  }
  const record = {
    id: `ATT-${employeeId}-${date}`,
    employeeId,
    date,
    status: 'PRESENT',
    checkInTime: null,
    checkOutTime: null,
    workingHours: 0,
    remarks: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  };
  record.workingHours = computeWorkingHours(record.checkInTime, record.checkOutTime);
  return mockStore.insert(KEY, record);
}

export async function checkIn({ employeeId, employeeName, branchId }) {
  const date = todayStr();
  const time = new Date().toTimeString().slice(0, 5);
  return upsertAttendance(employeeId, date, { employeeName, branchId, status: 'PRESENT', checkInTime: time });
}

export async function checkOut({ employeeId }) {
  const date = todayStr();
  const time = new Date().toTimeString().slice(0, 5);
  const existing = await getAttendanceRecord(employeeId, date);
  if (!existing || !existing.checkInTime) {
    throw new Error('Check in before checking out.');
  }
  return upsertAttendance(employeeId, date, { checkOutTime: time });
}

export async function setAttendance({ employeeId, employeeName, branchId, date, status, checkInTime, checkOutTime, remarks }) {
  return upsertAttendance(employeeId, date, { employeeName, branchId, status, checkInTime, checkOutTime, remarks });
}

export async function getMonthlySummary(employeeId, month) {
  const rows = await listAttendance({ employeeId, dateFrom: `${month}-01`, dateTo: `${month}-31` });
  const summary = { presentDays: 0, absentDays: 0, halfDays: 0, leaveDays: 0, holidayDays: 0, totalHours: 0, workingDays: 0 };
  rows.forEach((r) => {
    if (r.status === 'PRESENT') summary.presentDays += 1;
    else if (r.status === 'ABSENT') summary.absentDays += 1;
    else if (r.status === 'HALF_DAY') summary.halfDays += 1;
    else if (r.status === 'LEAVE') summary.leaveDays += 1;
    else if (r.status === 'HOLIDAY') summary.holidayDays += 1;
    summary.totalHours += r.workingHours || 0;
  });
  summary.workingDays = summary.presentDays + summary.halfDays * 0.5;
  summary.records = rows;
  return summary;
}

export default { listAttendance, getAttendanceRecord, checkIn, checkOut, setAttendance, getMonthlySummary };
