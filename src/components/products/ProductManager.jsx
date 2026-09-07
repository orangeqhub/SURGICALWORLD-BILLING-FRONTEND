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
import Checkbox from '../ui/Checkbox';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { useRegisterPrimaryAction } from '../../context/KeyboardShortcutsContext';
import {
  listProductsWithProfile,
  createProductWithProfile,
  updateProductProfile,
  setProductStatus,
  fetchCategories,
} from '../../services/api/productMasterApi';
import { validateHsn, validateNonNegative } from '../../utils/inventoryHelpers';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING } from '../../theme';

const emptyForm = {
  name: '', code: '', subcategory: '', brand: '', manufacturer: '', hsn: '', gst: '18', unit: 'Pcs',
  purchasePrice: '', sellingPrice: '', mrp: '', minStock: '', maxStock: '', barcode: '',
  batchTrackingEnabled: true, expiryTrackingEnabled: true, remarks: '', categoryId: '',
};

/**
 * Shared Product Master list/form/detail experience, reused by Super Admin
 * (full CRUD) and Branch Admin (list/search/view, edit gated by
 * PRODUCT_MASTER) - see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 2
 * corrections. Branch/stock quantities are never shown or edited here - that
 * stays in the Inventory screens.
 *
 * @param {boolean} allowCreate - show "Add Product"
 * @param {boolean} allowEdit - show Edit/Activate/Deactivate actions
 */
export default function ProductManager({ allowCreate = true, allowEdit = true }) {
  const { success, error: notifyError } = useNotification();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, prods] = await Promise.all([fetchCategories(), listProductsWithProfile()]);
    setCategories(cats);
    setProducts(prods);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))), [products]);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.code?.toLowerCase().includes(query.toLowerCase()))
        .filter((p) => categoryFilter === 'ALL' || p.categoryId === categoryFilter)
        .filter((p) => brandFilter === 'ALL' || p.brand === brandFilter)
        .filter((p) => statusFilter === 'ALL' || p.status === statusFilter),
    [products, query, categoryFilter, brandFilter, statusFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormVisible(true);
  };

  useRegisterPrimaryAction(allowCreate ? openAdd : null, [allowCreate]);

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      code: product.code || product.sku || '',
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      manufacturer: product.manufacturer || '',
      hsn: product.hsn || '',
      gst: String(product.gst ?? '18'),
      unit: product.unit || 'Pcs',
      purchasePrice: String(product.purchasePrice ?? ''),
      sellingPrice: String(product.sellingPrice ?? ''),
      mrp: String(product.mrp ?? ''),
      minStock: String(product.minStock ?? ''),
      maxStock: String(product.maxStock ?? ''),
      barcode: product.barcode || '',
      batchTrackingEnabled: product.batchTrackingEnabled ?? true,
      expiryTrackingEnabled: product.expiryTrackingEnabled ?? true,
      remarks: product.remarks || '',
      categoryId: product.categoryId || '',
    });
    setFormErrors({});
    setFormVisible(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Product name is required';
    if (!form.code.trim()) errors.code = 'SKU / product code is required';
    else {
      const duplicate = products.some((p) => p.code?.toLowerCase() === form.code.trim().toLowerCase() && p.id !== editing?.id);
      if (duplicate) errors.code = 'SKU must be unique';
    }
    const gstNum = Number(form.gst);
    if (form.gst !== '' && (Number.isNaN(gstNum) || gstNum < 0 || gstNum > 100)) errors.gst = 'GST must be between 0 and 100';
    const priceErr = validateNonNegative(form.purchasePrice, 'Purchase price') || validateNonNegative(form.sellingPrice, 'Selling price') || validateNonNegative(form.mrp, 'MRP');
    if (priceErr) errors.sellingPrice = priceErr;
    const minErr = validateNonNegative(form.minStock, 'Minimum stock');
    if (minErr) errors.minStock = minErr;
    const maxErr = validateNonNegative(form.maxStock, 'Maximum stock');
    if (maxErr) errors.maxStock = maxErr;
    if (!minErr && !maxErr && form.maxStock !== '' && form.minStock !== '' && Number(form.maxStock) < Number(form.minStock)) {
      errors.maxStock = 'Maximum stock cannot be lower than minimum stock';
    }
    const hsnErr = validateHsn(form.hsn);
    if (hsnErr) errors.hsn = hsnErr;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        gst: Number(form.gst) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        mrp: Number(form.mrp) || 0,
        minStock: Number(form.minStock) || 0,
        maxStock: form.maxStock === '' ? null : Number(form.maxStock),
      };
      if (editing) {
        await updateProductProfile(editing.id, payload);
        success(`Product ${payload.code} updated`);
      } else {
        const created = await createProductWithProfile(payload);
        success(`Product ${created.code} added to master catalog`);
      }
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    const nextStatus = confirmTarget.status === 'Active' ? 'Inactive' : 'Active';
    await setProductStatus(confirmTarget.id, nextStatus);
    success(`${confirmTarget.name} marked ${nextStatus}`);
    setConfirmTarget(null);
    load();
  };

  const columns = [
    { key: 'name', title: 'Product', flex: 1.5 },
    { key: 'sku', title: 'SKU' },
    { key: 'brand', title: 'Brand', render: (row) => <Text>{row.brand || '-'}</Text> },
    { key: 'sellingPrice', title: 'Selling Price', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.sellingPrice)}</Text> },
    { key: 'gst', title: 'GST %' },
    { key: 'expiryDate', title: 'Expiry', render: (row) => <Text>{row.expiryDate ? formatDate(row.expiryDate) : '-'}</Text> },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} /> },
    {
      key: 'actions',
      title: 'Actions',
      flex: 1.6,
      render: (row) => (
        <View style={styles.actionsRow}>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {allowEdit ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink muted onPress={() => setConfirmTarget(row)}>
                {row.status === 'Active' ? 'Deactivate' : 'Activate'}
              </ActionLink>
            </>
          ) : null}
        </View>
      ),
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={row.name}
      subtitle={row.sku}
      badge={<Badge label={row.status} tone={row.status === 'Active' ? 'success' : 'neutral'} />}
      lines={[
        { label: 'Brand', value: row.brand || '-' },
        { label: 'Selling Price', value: formatCurrency(row.sellingPrice) },
        { label: 'GST', value: `${row.gst}%` },
      ]}
      actions={
        <>
          <ActionLink onPress={() => setViewing(row)}>View</ActionLink>
          {allowEdit ? (
            <>
              <ActionLink onPress={() => openEdit(row)}>Edit</ActionLink>
              <ActionLink muted onPress={() => setConfirmTarget(row)}>
                {row.status === 'Active' ? 'Deactivate' : 'Activate'}
              </ActionLink>
            </>
          ) : null}
        </>
      }
    />
  );

  return (
    <View>
      <SectionHeader
        title="Product Master"
        subtitle={`${products.length} products in the global catalog`}
        action={allowCreate ? <Button title="Add Product" size="sm" onPress={openAdd} /> : null}
      />

      <View style={styles.filterRow}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search product name or code" style={{ flex: 1, minWidth: 220, marginBottom: 0 }} />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[{ label: 'All Categories', value: 'ALL' }, ...categories.map((c) => ({ label: c.name, value: c.id }))]}
          style={{ minWidth: 160, marginBottom: 0 }}
        />
        <Select
          value={brandFilter}
          onChange={setBrandFilter}
          options={[{ label: 'All Brands', value: 'ALL' }, ...brands.map((b) => ({ label: b, value: b }))]}
          style={{ minWidth: 160, marginBottom: 0 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ label: 'All Status', value: 'ALL' }, { label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }]}
          style={{ minWidth: 150, marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <LoadingState label="Loading product catalog..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="cube-outline" title="No products found" message="Try adjusting your filters." />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No products found" />
      )}

      {allowEdit && (
        <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={editing ? 'Edit Product' : 'Add Product'} width={560}>
          <View style={styles.formRow}>
            <Input label="Product Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={formErrors.name} style={{ flex: 1 }} />
            <Input label="SKU / Product Code *" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} error={formErrors.code} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Select label="Category" value={form.categoryId} onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))} options={categories.map((c) => ({ label: c.name, value: c.id }))} placeholder="Select category" style={{ flex: 1 }} />
            <Input label="Subcategory" value={form.subcategory} onChangeText={(v) => setForm((f) => ({ ...f, subcategory: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Brand" value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} style={{ flex: 1 }} />
            <Input label="Manufacturer" value={form.manufacturer} onChangeText={(v) => setForm((f) => ({ ...f, manufacturer: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="HSN Code" value={form.hsn} onChangeText={(v) => setForm((f) => ({ ...f, hsn: v }))} error={formErrors.hsn} style={{ flex: 1 }} />
            <Input label="GST %" value={form.gst} onChangeText={(v) => setForm((f) => ({ ...f, gst: v }))} error={formErrors.gst} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input label="Unit" value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Default Purchase Price" value={form.purchasePrice} onChangeText={(v) => setForm((f) => ({ ...f, purchasePrice: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input label="Default Selling Price" value={form.sellingPrice} onChangeText={(v) => setForm((f) => ({ ...f, sellingPrice: v }))} error={formErrors.sellingPrice} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input label="MRP" value={form.mrp} onChangeText={(v) => setForm((f) => ({ ...f, mrp: v }))} keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Input label="Minimum Stock" value={form.minStock} onChangeText={(v) => setForm((f) => ({ ...f, minStock: v }))} error={formErrors.minStock} keyboardType="number-pad" style={{ flex: 1 }} />
            <Input label="Maximum Stock" value={form.maxStock} onChangeText={(v) => setForm((f) => ({ ...f, maxStock: v }))} error={formErrors.maxStock} keyboardType="number-pad" style={{ flex: 1 }} />
            <Input label="Barcode" value={form.barcode} onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))} style={{ flex: 1 }} />
          </View>
          <View style={styles.formRow}>
            <Checkbox label="Batch Tracking Enabled" checked={form.batchTrackingEnabled} onChange={(v) => setForm((f) => ({ ...f, batchTrackingEnabled: v }))} />
            <Checkbox label="Expiry Tracking Enabled" checked={form.expiryTrackingEnabled} onChange={(v) => setForm((f) => ({ ...f, expiryTrackingEnabled: v }))} />
          </View>
          <Input label="Remarks" value={form.remarks} onChangeText={(v) => setForm((f) => ({ ...f, remarks: v }))} />
          <Button title={editing ? 'Save Changes' : 'Save Product'} onPress={handleSave} loading={saving} />
        </Modal>
      )}

      {allowEdit && (
        <ConfirmModal
          visible={Boolean(confirmTarget)}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleToggleStatus}
          title={confirmTarget?.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}
          message={
            confirmTarget?.status === 'Active'
              ? `${confirmTarget?.name} will be hidden from new billing/purchases but stays visible in existing transaction history.`
              : `${confirmTarget?.name} will be marked active again.`
          }
          confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
          variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
        />
      )}

      <Modal visible={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name || ''} width={520}>
        {viewing ? (
          <View style={{ gap: SPACING.xs }}>
            <DetailRow label="SKU" value={viewing.sku} />
            <DetailRow label="Brand / Manufacturer" value={`${viewing.brand || '-'} / ${viewing.manufacturer || '-'}`} />
            <DetailRow label="Category / Subcategory" value={`${categories.find((c) => c.id === viewing.categoryId)?.name || '-'} / ${viewing.subcategory || '-'}`} />
            <DetailRow label="HSN / GST" value={`${viewing.hsn || '-'} / ${viewing.gst}%`} />
            <DetailRow label="Purchase / Selling / MRP" value={`${formatCurrency(viewing.purchasePrice)} / ${formatCurrency(viewing.sellingPrice)} / ${formatCurrency(viewing.mrp)}`} />
            <DetailRow label="Min / Max Stock" value={`${viewing.minStock} / ${viewing.maxStock ?? '-'}`} />
            <DetailRow label="Batch / Expiry Tracking" value={`${viewing.batchTrackingEnabled ? 'Yes' : 'No'} / ${viewing.expiryTrackingEnabled ? 'Yes' : 'No'}`} />
            <DetailRow label="Remarks" value={viewing.remarks || '-'} />
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
  actionLink: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  detailValue: { fontWeight: '700', flex: 1.4, textAlign: 'right' },
});
