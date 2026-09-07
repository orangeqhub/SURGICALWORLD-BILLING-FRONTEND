import React, { useState } from 'react';
import { View } from 'react-native';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { previewReportDocument } from '../../services/print/reportDocumentService';
import { exportCsv } from '../../utils/csvExport';
import { SPACING } from '../../theme';

/**
 * Reusable Print Preview / CSV export action bar for report screens (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 5, Part 3C). One
 * implementation shared by every report instead of duplicating export
 * plumbing per screen.
 */
export default function ReportExportBar({ title, branchName, filtersSummary, columns, rows, totals, fileName }) {
  const { error: notifyError } = useNotification();
  const [busy, setBusy] = useState(false);

  const handlePrint = async () => {
    setBusy(true);
    try {
      await previewReportDocument({ title, branchName, filtersSummary, columns, rows, totals });
    } catch (e) {
      notifyError('Unable to open print preview');
    } finally {
      setBusy(false);
    }
  };

  const handleCsv = async () => {
    setBusy(true);
    try {
      const headers = columns.map((c) => c.title);
      const csvRows = rows.map((row) => columns.map((c) => (c.numeric ? Number(row[c.key]) || 0 : row[c.key] ?? '')));
      await exportCsv(fileName || title.replace(/\s+/g, '_'), headers, csvRows);
    } catch (e) {
      notifyError('Unable to export CSV');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' }}>
      <Button title="Print Preview" variant="secondary" outline size="sm" onPress={handlePrint} loading={busy} />
      <Button title="Export CSV" size="sm" onPress={handleCsv} loading={busy} />
    </View>
  );
}
