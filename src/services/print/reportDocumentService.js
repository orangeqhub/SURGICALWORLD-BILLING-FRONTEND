import * as Print from 'expo-print';
import { formatCurrency } from '../../utils/formatters';

/**
 * Generic print-preview document generator for Reports (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 5, Part 3C). Kept separate
 * from printService.js / Bluetooth thermal printing and from the Purchase
 * document service - reports are a third, independent document type.
 * Print-friendly only: no sidebar/header chrome is included in the output.
 */
export async function previewReportDocument({ title, branchName, filtersSummary, columns, rows, totals }) {
  const headerHtml = columns.map((c) => `<th>${c.title}</th>`).join('');
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td style="${c.numeric ? 'text-align:right' : ''}">${c.numeric ? formatCurrency(row[c.key]) : row[c.key] ?? '-'}</td>`)
          .join('')}</tr>`
    )
    .join('');
  const totalsHtml = totals
    ? `<tr style="font-weight:700;border-top:2px solid #333">${columns
        .map((c) => `<td style="${c.numeric ? 'text-align:right' : ''}">${totals[c.key] !== undefined ? (c.numeric ? formatCurrency(totals[c.key]) : totals[c.key]) : ''}</td>`)
        .join('')}</tr>`
    : '';

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #202463; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        .meta { font-size: 12px; color: #555; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 5px 7px; }
        th { background: #f5f5fa; text-align: left; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">${branchName || 'All Branches'} - Generated ${new Date().toLocaleString('en-IN')}</div>
      ${filtersSummary ? `<div class="meta">Filters: ${filtersSummary}</div>` : ''}
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}${totalsHtml}</tbody>
      </table>
    </body>
  </html>`;

  await Print.printAsync({ html });
}

export default { previewReportDocument };
