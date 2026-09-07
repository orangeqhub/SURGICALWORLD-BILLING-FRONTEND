import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import ActionLink from '../../src/components/ui/ActionLink';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import Select from '../../src/components/ui/Select';
import { useNotification } from '../../src/hooks/useNotification';
import { useBranch } from '../../src/hooks/useBranch';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { loadDirectoryList, saveDirectoryList } from '../../src/services/api/directoryStore';
import { BRANCH_ADMINS } from '../../src/constants/employees';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme';

const STORE_KEY = 'sw_branch_admins_v1';
const DEFAULT_PASSWORD = 'Welcome@123';

const seedAdmins = () => BRANCH_ADMINS.map((a) => ({ ...a, status: a.status || 'Active' }));

function nextAdminId(admins) {
  const nums = admins.map((a) => Number(String(a.id || a.adminId).replace(/\D/g, '')) || 0);
  const next = Math.max(200, ...nums) + 1;
  return `ADM-${next}`;
}

export default function AdminManagementScreen() {
  const { success, info } = useNotification();
  const { branches } = useBranch();
  const [admins, setAdmins] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adminId, setAdminId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('Active');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [activityFor, setActivityFor] = useState(null);

  useEffect(() => {
    loadDirectoryList(STORE_KEY, seedAdmins()).then((list) => {
      setAdmins(list);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveDirectoryList(STORE_KEY, admins);
  }, [admins, loaded]);

  const openCreateModal = () => {
    setEditing(null);
    setAdminId(nextAdminId(admins));
    setName('');
    setPhone('');
    setBranchId('');
    setStatus('Active');
    setPassword(DEFAULT_PASSWORD);
    setModalVisible(true);
  };

  useRegisterPrimaryAction(openCreateModal, [admins]);

  const openEditModal = (admin) => {
    setEditing(admin);
    setAdminId(admin.id || admin.adminId);
    setName(admin.name);
    setPhone(admin.phone || '');
    setBranchId(admin.branchId || '');
    setStatus(admin.status || 'Active');
    setPassword(admin.password || DEFAULT_PASSWORD);
    setModalVisible(true);
  };

  const toggleStatus = (id) => {
    setAdmins((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a))
    );
  };

  const handleSave = () => {
    const trimmedId = adminId.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedId || !trimmedName || !branchId) {
      info('Please fill in all required fields');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === branchId);
    if (!selectedBranch) {
      info('Selected branch is invalid');
      return;
    }

    const isDuplicate = admins.some(
      (a) => (a.id || a.adminId || '').toLowerCase() === trimmedId.toLowerCase() && (!editing || a.id !== editing.id)
    );
    if (isDuplicate) {
      info('This Admin ID already exists');
      return;
    }

    const adminData = {
      id: trimmedId,
      adminId: trimmedId,
      name: trimmedName,
      branchId,
      branchCode: selectedBranch.code,
      branchName: selectedBranch.name,
      branch: selectedBranch.name,
      phone,
      status,
      password: password || DEFAULT_PASSWORD,
    };

    if (editing) {
      setAdmins((prev) => prev.map((a) => (a.id === editing.id ? adminData : a)));
      success(`Branch admin ${adminData.id} updated successfully`);
    } else {
      setAdmins((prev) => [adminData, ...prev]);
      success(`Branch admin ${adminData.id} created with default password ${adminData.password}`);
    }
    setModalVisible(false);
  };

  const handleResetAccess = (admin) => {
    setAdmins((prev) =>
      prev.map((a) => (a.id === admin.id ? { ...a, password: DEFAULT_PASSWORD } : a))
    );
    info(`Password for ${admin.id || admin.adminId} reset to default: ${DEFAULT_PASSWORD}`);
  };

  const columns = [
    { key: 'id', title: 'Admin ID', flex: 1, render: (row) => <Text>{row.id || row.adminId}</Text> },
    { key: 'name', title: 'Name', flex: 1.3 },
    {
      key: 'branchId',
      title: 'Branch',
      render: (row) => <Text>{branches.find((b) => b.id === row.branchId)?.name || row.branchName || row.branch || ''}</Text>,
    },
    { key: 'phone', title: 'Phone' },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 2.2,
      render: (row) => (
        <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
          <ActionLink onPress={() => openEditModal(row)}>Edit</ActionLink>
          <ActionLink muted onPress={() => toggleStatus(row.id)}>
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </ActionLink>
          <ActionLink muted onPress={() => handleResetAccess(row)}>Reset Access</ActionLink>
          <ActionLink textStyle={{ color: COLORS.info }} onPress={() => setActivityFor(row)}>View Activity</ActionLink>
        </View>
      ),
    },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Admin Management"
        subtitle={`${admins.length} branch admins across the network`}
        action={<Button title="Add Admin" size="sm" onPress={openCreateModal} />}
      />
      <DataTable columns={columns} data={admins} keyExtractor={(item) => item.id || item.adminId} />

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={editing ? 'Edit Branch Admin' : 'Create Branch Admin'} width={440}>
        <Input label="Admin ID" value={adminId} onChangeText={setAdminId} placeholder="e.g. ADM-201" autoCapitalize="characters" />
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="e.g. G. Satyanarayana" />
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="number-pad" maxLength={10} />
        <Select
          label="Assign Branch"
          value={branchId}
          onChange={setBranchId}
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
        <Button title={editing ? 'Save Changes' : 'Create Admin'} onPress={handleSave} />
      </Modal>

      <Modal visible={Boolean(activityFor)} onClose={() => setActivityFor(null)} title={`Activity - ${activityFor?.name || ''}`} width={420} scrollable={false}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
          Recent activity for this admin will appear here once server-side audit sync is available.
        </Text>
      </Modal>
    </ScreenContainer>
  );
}

const styles = {
  passwordNote: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.md },
};
