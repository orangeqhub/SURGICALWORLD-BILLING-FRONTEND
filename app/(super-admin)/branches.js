import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import ScreenContainer from '../../src/components/layout/ScreenContainer';
import SectionHeader from '../../src/components/ui/SectionHeader';
import DataTable from '../../src/components/ui/DataTable';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import ActionLink from '../../src/components/ui/ActionLink';
import Modal from '../../src/components/ui/Modal';
import Input from '../../src/components/ui/Input';
import { useNotification } from '../../src/hooks/useNotification';
import { loadDirectoryList, saveDirectoryList } from '../../src/services/api/directoryStore';
import { useBranch } from '../../src/hooks/useBranch';
import { useRegisterPrimaryAction } from '../../src/context/KeyboardShortcutsContext';
import { BRANCHES } from '../../src/constants/branches';
import { SPACING } from '../../src/theme';

export default function BranchManagementScreen() {
  const { success, info } = useNotification();
  const { refreshBranches } = useBranch();
  const [branches, setBranches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', gst: '', manager: '' });

  const STORE_KEY = 'sw_branches_v1';

  useEffect(() => {
    loadDirectoryList(STORE_KEY, BRANCHES.map((b) => ({ ...b }))).then((list) => {
      setBranches(list);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      saveDirectoryList(STORE_KEY, branches).then(() => {
        refreshBranches();
      });
    }
  }, [branches, loaded, refreshBranches]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', address: '', phone: '', gst: '', manager: '' });
    setModalVisible(true);
  };

  useRegisterPrimaryAction(openCreate);

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      gst: branch.gst || '',
      manager: branch.manager || '',
    });
    setModalVisible(true);
  };

  const toggleStatus = (branchId) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b))
    );
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim().toUpperCase();

    if (!trimmedName) {
      info('Branch Name is required');
      return;
    }
    if (!trimmedCode) {
      info('Branch Code is required');
      return;
    }

    const isDuplicateCode = branches.some(
      (b) => b.code.toUpperCase() === trimmedCode && (!editing || b.id !== editing.id)
    );
    if (isDuplicateCode) {
      info('This Branch Code already exists');
      return;
    }

    if (editing) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === editing.id
            ? { ...b, ...form, name: trimmedName, code: trimmedCode }
            : b
        )
      );
      success('Branch updated');
    } else {
      const newBranch = {
        id: `BR-${Date.now().toString().slice(-4)}`,
        ...form,
        name: trimmedName,
        code: trimmedCode,
        opening: '09:00',
        closing: '20:30',
        warehouse: `${trimmedName} Warehouse`,
        status: 'Active',
      };
      setBranches((prev) => [newBranch, ...prev]);
      success('Branch added');
    }
    setModalVisible(false);
  };

  const columns = [
    { key: 'name', title: 'Branch', flex: 1.3 },
    { key: 'code', title: 'Code' },
    { key: 'manager', title: 'Manager', flex: 1.2 },
    { key: 'phone', title: 'Phone' },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.4,
      render: (row) => (
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
          <ActionLink muted onPress={() => toggleStatus(row.id)}>
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </ActionLink>
        </View>
      ),
    },
  ];

  return (
    <ScreenContainer>
      <SectionHeader
        title="Branch Management"
        subtitle={`${branches.length} branches across Andhra Pradesh`}
        action={<Button title="Add Branch" size="sm" onPress={openCreate} />}
      />
      <DataTable columns={columns} data={branches} keyExtractor={(item) => item.id} />

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={editing ? 'Edit Branch' : 'Add Branch'} width={460}>
        <Input label="Branch Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Input label="Branch Code" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} autoCapitalize="characters" />
        <Input label="Manager" value={form.manager} onChangeText={(v) => setForm((f) => ({ ...f, manager: v }))} />
        <Input label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
        <Input label="GSTIN" value={form.gst} onChangeText={(v) => setForm((f) => ({ ...f, gst: v }))} autoCapitalize="characters" />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
        <Button title={editing ? 'Save Changes' : 'Create Branch'} onPress={handleSave} />
      </Modal>
    </ScreenContainer>
  );
}
