import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * CSV export for report tables (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 5, Part 3C). No spreadsheet library was already installed in this
 * project, so per instruction this stays CSV (Excel-compatible: comma
 * separated, UTF-8, .csv extension) rather than installing a new heavy
 * dependency just for this feature.
 */
function escapeCsvValue(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(',')];
  rows.forEach((row) => {
    lines.push(row.map(escapeCsvValue).join(','));
  });
  return lines.join('\n');
}

export async function exportCsv(fileName, headers, rows) {
  const csv = buildCsv(headers, rows);
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return null;
  }

  const dir = `${FileSystem.documentDirectory}reports/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const destination = `${dir}${fileName.endsWith('.csv') ? fileName : `${fileName}.csv`}`;
  await FileSystem.writeAsStringAsync(destination, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return destination;
}

export default { buildCsv, exportCsv };
