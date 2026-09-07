import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionHeader from '../ui/SectionHeader';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ActionLink from '../ui/ActionLink';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import ResponsiveList from '../ui/ResponsiveList';
import ListCard from '../ui/ListCard';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import { useNotification } from '../../hooks/useNotification';
import { listSuppliersWithProfile } from '../../services/api/supplierMasterApi';
import { listCustomersWithProfile } from '../../services/api/customerMasterApi';
import { fetchPurchases } from '../../services/api/purchaseApi';
import { fetchInvoices } from '../../services/api/billingApi';
import { fetchPayments, recordPayment } from '../../services/api/paymentApi';
import { fetchReceipts, recordReceipt } from '../../services/api/receiptApi';
import { fetchPartyBalance } from '../../services/api/ledgerApi';
import { previewPurchaseDocument } from '../../services/print/purchaseDocumentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD'];

/**
 * Shared list/create UI for Supplier Payments and Customer Receipts (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 4). Both are structurally
 * identical (party, outstanding, invoice-reference allocation, method,
 * bank/cheque fields) so one parameterized component avoids duplicating it
 * twice. Uses the Phase 0 paymentApi/receiptApi mock adapters only - never
 * posts into real accounting/database repositories.
 */
export default function FinanceDocumentManager({ type, user, branchId }) {
  const isPayment = type === 'PAYMENT';
  const partyLabel = isPayment ? 'Supplier' : 'Customer';
  const partyType = isPayment ? 'SUPPLIER' : 'CUSTOMER';
  const { success, error: notifyError } = useNotification();

  const [records, setRecords] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [partyId, setPartyId] = useState('');
  const [outstanding, setOutstanding] = useState(0);
  const [refDocs, setRefDocs] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [totalAmount, setTotalAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [recs, parts] = await Promise.all([
      isPayment ? fetchPayments(branchId) : fetchReceipts(branchId),
      isPayment ? listSuppliersWithProfile(branchId) : listCustomersWithProfile(branchId),
    ]);
    setRecords(recs);
    setParties(parts);
    setLoading(false);
  }, [branchId, isPayment]);

  useEffect(() => {
    load();
  }, [load]);

  const partyById = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties]);

  const filtered = records.filter(
    (r) => !query || (isPayment ? r.supplierName : r.customerName)?.toLowerCase().includes(query.toLowerCase())
  );

  const openCreate = () => {
    setPartyId('');
    setOutstanding(0);
    setRefDocs([]);
    setAllocations({});
    setTotalAmount('');
    setMode('CASH');
    setBankName('');
    setChequeNumber('');
    setChequeDate('');
    setReference('');
    setRemarks('');
    setFormVisible(true);
  };

  const handlePartyChange = async (id) => {
    setPartyId(id);
    setAllocations({});
    const balance = await fetchPartyBalance(partyType, id).catch(() => 0);
    setOutstanding(balance);
    const docs = isPayment
      ? await fetchPurchases(branchId).then((rows) => rows.filter((r) => r.supplierId === id)).catch(() => [])
      : await fetchInvoices(branchId).then((rows) => rows.filter((r) => r.customerId === id)).catch(() => []);
    setRefDocs(docs);
  };

  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const unallocated = Math.max((Number(totalAmount) || 0) - allocatedTotal, 0);

  const handleSave = async () => {
    if (!partyId || !(Number(totalAmount) > 0)) {
      notifyError(`Select a ${partyLabel.toLowerCase()} and enter a total amount greater than zero`);
      return;
    }
    const payload = {
      branchId,
      amount: Number(totalAmount),
      mode,
      bankName: mode === 'BANK_TRANSFER' || mode === 'CHEQUE' ? bankName : '',
      chequeNumber: mode === 'CHEQUE' ? chequeNumber : '',
      chequeDate: mode === 'CHEQUE' ? chequeDate : '',
      reference,
      note: remarks,
      allocations: Object.entries(allocations)
        .filter(([, v]) => Number(v) > 0)
        .map(([docId, v]) => ({ documentId: docId, amount: Number(v) })),
      unallocatedAmount: unallocated,
      createdBy: user.name,
    };
    try {
      if (isPayment) {
        const party = partyById[partyId];
        await recordPayment({ ...payload, supplierId: partyId, supplierName: party?.name });
      } else {
        const party = partyById[partyId];
        await recordReceipt({ ...payload, customerId: partyId, customerName: party?.name });
      }
      success(`${isPayment ? 'Payment' : 'Receipt'} recorded`);
      setFormVisible(false);
      load();
    } catch (e) {
      notifyError(e.message || 'Failed to save');
    }
  };

  const handlePrint = async (record) => {
    try {
      await previewPurchaseDocument({
        purchase: {
          purchaseNumber: record.id,
          purchaseDate: record.date,
          branchId: record.branchId,
          source: 'FRONTEND_DEMO',
          supplierInvoiceNumber: record.reference || '-',
          paidAmount: record.amount,
          balanceAmount: 0,
          remarks: `${isPayment ? 'Payment' : 'Receipt'} via ${record.mode}`,
        },
        supplier: { name: isPayment ? record.supplierName : record.customerName, supplierCode: partyId },
        totals: { lines: [], grossAmount: record.amount, productDiscounts: 0, invoiceDiscount: 0, taxableAmount: record.amount, cgst: 0, sgst: 0, igst: 0, otherCharges: 0, roundOff: 0, netAmount: record.amount },
      });
    } catch (e) {
      notifyError('Unable to open print preview');
    }
  };

  const columns = [
    { key: 'id', title: `${isPayment ? 'Payment' : 'Receipt'} No.` },
    { key: 'date', title: 'Date', render: (row) => <Text>{formatDate(row.date)}</Text> },
    { key: 'party', title: partyLabel, render: (row) => <Text>{isPayment ? row.supplierName : row.customerName}</Text> },
    { key: 'amount', title: 'Amount', render: (row) => <Text style={{ fontWeight: '700' }}>{formatCurrency(row.amount)}</Text> },
    { key: 'mode', title: 'Method' },
    { key: 'status', title: 'Status', render: (row) => <Badge label={row.status || 'RECORDED'} tone="success" /> },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => <ActionLink onPress={() => handlePrint(row)}>Print</ActionLink>,
    },
  ];

  const renderCard = (row) => (
    <ListCard
      title={isPayment ? row.supplierName : row.customerName}
      subtitle={formatDate(row.date)}
      badge={<Badge label={row.mode} tone="info" />}
      lines={[{ label: 'Amount', value: formatCurrency(row.amount) }]}
      actions={<ActionLink onPress={() => handlePrint(row)}>Print</ActionLink>}
    />
  );

  return (
    <View>
      <SectionHeader
        title={isPayment ? 'Supplier Payments' : 'Customer Receipts'}
        subtitle={`${records.length} recorded`}
        action={<Button title={`Record ${isPayment ? 'Payment' : 'Receipt'}`} size="sm" onPress={openCreate} />}
      />
      <SearchInput value={query} onChangeText={setQuery} placeholder={`Search ${partyLabel.toLowerCase()} name`} style={{ marginBottom: SPACING.md }} />

      {loading ? (
        <LoadingState label="Loading..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={isPayment ? 'card-outline' : 'document-text-outline'} title={`No ${isPayment ? 'payments' : 'receipts'} yet`} />
      ) : (
        <ResponsiveList columns={columns} data={filtered} renderCard={renderCard} keyExtractor={(item) => item.id} emptyLabel="No records found" />
      )}

      <Modal visible={formVisible} onClose={() => setFormVisible(false)} title={`Record ${isPayment ? 'Payment' : 'Receipt'}`} width={560}>
        <Select label={`${partyLabel} *`} value={partyId} onChange={handlePartyChange} options={parties.map((p) => ({ label: p.name, value: p.id }))} placeholder={`Select ${partyLabel.toLowerCase()}`} />
        {partyId ? <Text style={styles.metaText}>Outstanding: {formatCurrency(outstanding)}</Text> : null}

        <Input label="Total Amount *" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" />

        {partyId && refDocs.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Allocate to Invoices (optional - unallocated becomes advance)</Text>
            {refDocs.slice(0, 15).map((doc) => (
              <View key={doc.localId} style={styles.allocRow}>
                <Text style={styles.allocLabel}>{doc.invoiceNumber} ({formatCurrency(doc.grandTotal ?? doc.totalAmount)})</Text>
                <Input
                  value={String(allocations[doc.localId] ?? '')}
                  onChangeText={(v) => setAllocations((a) => ({ ...a, [doc.localId]: v }))}
                  keyboardType="decimal-pad"
                  style={{ width: 110, marginBottom: 0 }}
                />
              </View>
            ))}
            <Text style={styles.metaText}>Allocated: {formatCurrency(allocatedTotal)}  Unallocated (Advance): {formatCurrency(unallocated)}</Text>
          </View>
        ) : null}

        <Select label="Payment Method" value={mode} onChange={setMode} options={PAYMENT_MODES.map((m) => ({ label: m.replace('_', ' '), value: m }))} />
        {mode === 'BANK_TRANSFER' || mode === 'CHEQUE' ? <Input label="Bank Name" value={bankName} onChangeText={setBankName} /> : null}
        {mode === 'CHEQUE' ? (
          <View style={styles.row}>
            <Input label="Cheque Number" value={chequeNumber} onChangeText={setChequeNumber} style={{ flex: 1 }} />
            <Input label="Cheque Date" value={chequeDate} onChangeText={setChequeDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          </View>
        ) : null}
        {mode === 'UPI' || mode === 'BANK_TRANSFER' ? <Input label="UPI / Transaction Reference" value={reference} onChangeText={setReference} /> : null}
        <Input label="Remarks" value={remarks} onChangeText={setRemarks} />
        <Button title="Save" onPress={handleSave} style={{ marginTop: SPACING.sm }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm },
  sectionTitle: { ...TYPOGRAPHY.bodyStrong, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  metaText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  allocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs, gap: SPACING.sm },
  allocLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  link: { color: COLORS.brandRed, fontWeight: '700', fontSize: 12 },
});
