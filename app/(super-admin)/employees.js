import React, { useMemo, useState, useEffect } from 'react';
import { Text, View, Pressable } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import SearchInput from '../../src/components/ui/SearchInput';
import Select from '../../src/components/ui/Select';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import { useBranch } from '../../src/hooks/useBranch';
import { useNotification } from '../../src/hooks/useNotification';
import { loadDirectoryList, saveDirectoryList } from '../../src/services/api/directoryStore';
import { EMPLOYEES } from '../../src/constants/employees';
import { COLORS, SPACING } from '../../src/theme';

const DEFAULT_PASSWORD = 'Welcome@123';

function storeKey(branchId) {
  return `sw_employees_${branchId}_v1`;
}

function seedEmployees(branchId) {
  return EMPLOYEES.filter((e) => e.branchId === branchId).map((e) => ({ ...e }));
}

export default function EmployeeOversightScreen() {
  const { selectedBranchId, isAllBranches, branches } = useBranch();
  const { success, info } = useNotification();
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [employees, setEmployees] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeBranchId, setEmployeeBranchId] = useState('');
  const [status, setStatus] = useState('Active');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);

  const loadAllEmployees = async () => {
    let all = [];
    for (const br of branches) {
      const list = await loadDirectoryList(storeKey(br.id), seedEmployees(br.id));
      all = [...all, ...list];
    }
    setEmployees(all);
    setLoaded(true);
  };

  useEffect(() => {
    if (branches && branches.length > 0) {
      loadAllEmployees();
    }
  }, [branches]);

  const toggleStatus = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const list = await loadDirectoryList(storeKey(emp.branchId), seedEmployees(emp.branchId));
    const updatedList = list.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e));
    await saveDirectoryList(storeKey(emp.branchId), updatedList);
    success(`Employee ${emp.id} status updated to ${nextStatus}`);
    await loadAllEmployees();
  };

  const openEditModal = (emp) => {
    setEditing(emp);
    setEmployeeId(emp.id || emp.employeeId);
    setName(emp.name);
    setPhone(emp.phone || '');
    setEmployeeBranchId(emp.branchId || '');
    setStatus(emp.status || 'Active');
    setPassword(emp.password || DEFAULT_PASSWORD);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmedId = employeeId.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedId || !trimmedName || !employeeBranchId) {
      info('Please fill in all required fields');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === employeeBranchId);
    if (!selectedBranch) {
      info('Selected branch is invalid');
      return;
    }

    // Duplicate check network-wide
    let all = [];
    for (const br of branches) {
      const list = await loadDirectoryList(storeKey(br.id), seedEmployees(br.id));
      all = [...all, ...list];
    }

    const isDuplicate = all.some(
      (e) => (e.id || e.employeeId || '').toLowerCase() === trimmedId.toLowerCase() && (!editing || e.id !== editing.id)
    );
    if (isDuplicate) {
      info('This Employee ID already exists');
      return;
    }

    const employeeData = {
      id: trimmedId,
      employeeId: trimmedId,
      name: trimmedName,
      branchId: employeeBranchId,
      branchCode: selectedBranch.code,
      branchName: selectedBranch.name,
      branch: selectedBranch.name,
      phone,
      role: editing ? editing.role : 'Cashier',
      status: status,
      deviceAuthorized: editing ? editing.deviceAuthorized : false,
      permissions: editing ? editing.permissions : ['BILLING', 'HOLD_BILL'],
      password: password || DEFAULT_PASSWORD,
    };

    if (editing) {
      if (editing.branchId !== employeeBranchId) {
        // Remove from old branch list
        const oldList = await loadDirectoryList(storeKey(editing.branchId), seedEmployees(editing.branchId));
        const updatedOldList = oldList.filter((e) => e.id !== editing.id);
        await saveDirectoryList(storeKey(editing.branchId), updatedOldList);

        // Add to new branch list
        const newList = await loadDirectoryList(storeKey(employeeBranchId), seedEmployees(employeeBranchId));
        const updatedNewList = [employeeData, ...newList.filter((e) => e.id !== employeeData.id)];
        await saveDirectoryList(storeKey(employeeBranchId), updatedNewList);
      } else {
        // Update in current branch list
        const list = await loadDirectoryList(storeKey(employeeBranchId), seedEmployees(employeeBranchId));
        const updatedList = list.map((e) => (e.id === editing.id ? employeeData : e));
        await saveDirectoryList(storeKey(employeeBranchId), updatedList);
      }
      success(`Employee ${employeeData.id} updated successfully`);
    } else {
      // Create new in selected branch list
      const list = await loadDirectoryList(storeKey(employeeBranchId), seedEmployees(employeeBranchId));
      await saveDirectoryList(storeKey(employeeBranchId), [employeeData, ...list]);
      success(`Employee ${employeeData.id} added with default password ${DEFAULT_PASSWORD}`);
    }

    await loadAllEmployees();
    setModalVisible(false);
  };

  const effectiveBranch = isAllBranches ? branchFilter : selectedBranchId;

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesBranch = effectiveBranch === 'ALL' || e.branchId === effectiveBranch;
      const matchesQuery = !query || e.name.toLowerCase().includes(query.toLowerCase());
      return matchesBranch && matchesQuery;
    });
  }, [employees, effectiveBranch, query]);

  const columns = [
    { key: 'id', title: 'Employee ID', flex: 1, render: (row) => <Text>{row.id || row.employeeId}</Text> },
    { key: 'name', title: 'Name', flex: 1.3 },
    {
      key: 'branchId',
      title: 'Branch',
      render: (row) => <Text>{branches.find((b) => b.id === row.branchId)?.name || row.branchName || row.branch || ''}</Text>,
    },
    { key: 'role', title: 'Role' },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'permissions',
      title: 'Permissions',
      flex: 1.6,
      render: (row) => <Text numberOfLines={1}>{(row.permissions || []).join(', ')}</Text>,
    },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
          <Pressable onPress={() => openEditModal(row)}>
            <Text style={{ color: COLORS.brandRed, fontWeight: '700', fontSize: 12 }}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => toggleStatus(row)}>
            <Text style={{ color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 }}>
              {row.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Text>
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScreenContainer>
      <SectionHeader title="Employee Oversight" subtitle={`${filtered.length} employees network-wide`} />

      <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, flexWrap: 'wrap' }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search employee name" style={{ flex: 1, minWidth: 240 }} />
        {isAllBranches ? (
          <Select
            value={branchFilter}
            onChange={setBranchFilter}
            options={[{ label: 'All Branches', value: 'ALL' }, ...branches.map((b) => ({ label: b.name, value: b.id }))]}
            style={{ minWidth: 220, marginBottom: 0 }}
          />
        ) : null}
      </View>

      <DataTable columns={columns} data={filtered} keyExtractor={(item) => item.id || item.employeeId} />

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Edit Employee" width={420}>
        <Input label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="e.g. EMP-101" autoCapitalize="characters" />
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Lakshmi Priya" />
        <Input label="Phone / Contact" value={phone} onChangeText={setPhone} placeholder="10-digit mobile" keyboardType="number-pad" maxLength={10} />
        <Select
          label="Branch"
          value={employeeBranchId}
          onChange={setEmployeeBranchId}
          options={branches.map((b) => ({ label: `${b.code} - ${b.name}`, value: b.id }))}
          placeholder="Select branch"
        />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry={false} placeholder="Enter login password" />
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' },
          ]}
        />
        <View style={{ marginTop: SPACING.sm }}>
          <Button title="Save Changes" onPress={handleSave} />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
