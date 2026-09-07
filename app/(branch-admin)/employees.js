import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Select from '../../src/components/ui/Select';
import ActionLink from '../../src/components/ui/ActionLink';
import { useAuth } from '../../src/hooks/useAuth';
import { useBranch } from '../../src/hooks/useBranch';
import { useNotification } from '../../src/hooks/useNotification';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { loadDirectoryList, saveDirectoryList } from '../../src/services/api/directoryStore';
import { EMPLOYEES } from '../../src/constants/employees';
import { EMPLOYEE_PROFILES, getEmployeeProfileByLabel } from '../../src/constants/employeeProfiles';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

const DEFAULT_PASSWORD = 'Welcome@123';

function storeKey(branchId) {
  return `sw_employees_${branchId}_v1`;
}

function seedEmployees(branchId) {
  return EMPLOYEES.filter((e) => e.branchId === branchId).map((e) => ({ ...e }));
}

function nextEmployeeId(employees) {
  const nums = employees.map((e) => Number(String(e.id || e.employeeId).replace(/\D/g, '')) || 0);
  const next = Math.max(100, ...nums) + 1;
  return `EMP-${next}`;
}

export default function EmployeeManagementScreen() {
  const { user } = useAuth();
  const { success, info } = useNotification();
  const { branches } = useBranch();
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
  const [profileKey, setProfileKey] = useState('CASHIER');

  useEffect(() => {
    loadDirectoryList(storeKey(user.branchId), seedEmployees(user.branchId)).then((list) => {
      setEmployees(list);
      setLoaded(true);
    });
  }, [user.branchId]);

  useEffect(() => {
    if (loaded) saveDirectoryList(storeKey(user.branchId), employees);
  }, [employees, loaded, user.branchId]);

  const openAddModal = () => {
    setEditing(null);
    setEmployeeId(nextEmployeeId(employees));
    setName('');
    setPhone('');
    setEmployeeBranchId(user.branchId);
    setStatus('Active');
    setPassword(DEFAULT_PASSWORD);
    setProfileKey('CASHIER');
    setModalVisible(true);
  };

  useRegisterPrimaryAction(openAddModal, [employees, user.branchId]);

  const openEditModal = (emp) => {
    setEditing(emp);
    setEmployeeId(emp.id || emp.employeeId);
    setName(emp.name);
    setPhone(emp.phone || '');
    setEmployeeBranchId(emp.branchId || user.branchId);
    setStatus(emp.status || 'Active');
    setPassword(emp.password || DEFAULT_PASSWORD);
    setProfileKey(getEmployeeProfileByLabel(emp.role)?.key || 'CASHIER');
    setModalVisible(true);
  };

  const toggleStatus = (id) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: e.status === 'Active' ? 'Inactive' : 'Active' } : e))
    );
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

    const selectedProfile = EMPLOYEE_PROFILES.find((p) => p.key === profileKey) || EMPLOYEE_PROFILES[0];

    const employeeData = {
      id: trimmedId,
      employeeId: trimmedId,
      name: trimmedName,
      branchId: employeeBranchId,
      branchCode: selectedBranch.code,
      branchName: selectedBranch.name,
      branch: selectedBranch.name,
      phone,
      role: selectedProfile.label,
      status: status,
      deviceAuthorized: editing ? editing.deviceAuthorized : false,
      permissions: selectedProfile.permissions,
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

    // Refresh branch admin's view
    const currentList = await loadDirectoryList(storeKey(user.branchId), seedEmployees(user.branchId));
    setEmployees(currentList);
    setModalVisible(false);
  };

  const columns = useMemo(
    () => [
      { key: 'id', title: 'Employee ID', flex: 1, render: (row) => <Text>{row.id || row.employeeId}</Text> },
      { key: 'name', title: 'Name', flex: 1.3 },
      { key: 'phone', title: 'Contact' },
      { key: 'role', title: 'Role' },
      {
        key: 'device',
        title: 'Device',
        render: (row) => (
          <Ionicons
            name={row.deviceAuthorized ? 'checkmark-circle' : 'close-circle-outline'}
            size={18}
            color={row.deviceAuthorized ? COLORS.success : COLORS.textMuted}
          />
        ),
      },
      { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
      {
        key: 'actions',
        title: 'Actions',
        flex: 1.6,
        render: (row) => (
          <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
            <ActionLink onPress={() => openEditModal(row)}>Edit</ActionLink>
            <ActionLink muted onPress={() => toggleStatus(row.id)}>
              {row.status === 'Active' ? 'Deactivate' : 'Activate'}
            </ActionLink>
          </View>
        ),
      },
    ],
    [branches]
  );

  return (
    <ScreenContainer>
      <SectionHeader
        title="Employee Management"
        subtitle={`${employees.length} employees at ${user.branchName}`}
        action={<Button title="Add Employee" size="sm" onPress={openAddModal} />}
      />
      <DataTable columns={columns} data={employees} keyExtractor={(item) => item.id || item.employeeId} />

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={editing ? 'Edit Employee' : 'Add Employee'} width={420}>
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
          label="Job Role"
          value={profileKey}
          onChange={setProfileKey}
          options={EMPLOYEE_PROFILES.map((p) => ({ label: p.label, value: p.key }))}
          placeholder="Select job role"
        />
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
          <Button title={editing ? 'Save Changes' : 'Save Employee'} onPress={handleSave} />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = {
  passwordNote: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.md },
};
