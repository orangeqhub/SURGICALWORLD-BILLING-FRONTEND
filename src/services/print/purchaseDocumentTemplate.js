import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Standalone HTML template for the frontend Purchase document (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part G). Deliberately
 * separate from src/services/print/invoiceTemplates.js - purchase documents
 * are a different document type and must never be confused with, or alter,
 * the existing customer invoice templates.
 */
export function buildPurchaseDocumentHtml({ purchase, branch, supplier, totals, logoBase64 }) {
  const isDemo = purchase.source === 'FRONTEND_DEMO' || !purchase.source;
  const rows = (totals.lines || [])
    .map(
      (l) => `
      <tr>
        <td>${l.productName || ''}</td>
        <td>${l.sku || ''}</td>
        <td>${l.batchNumber || '-'}</td>
        <td>${l.expiryDate ? formatDate(l.expiryDate) : '-'}</td>
        <td style="text-align:right">${l.quantity}</td>
        <td style="text-align:right">${formatCurrency(l.purchasePrice)}</td>
        <td style="text-align:right">${l.gstPercent}%</td>
        <td style="text-align:right">${formatCurrency(l.lineTotal)}</td>
      </tr>`
    )
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #202463; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ED1C2E; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { height: 48px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${isDemo ? '#FFF4E5' : '#E7F7EE'}; color: ${isDemo ? '#B45309' : '#0F9D58'}; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        th, td { border: 1px solid #E2E2ED; padding: 6px 8px; }
        th { background: #F5F5FA; text-align: left; }
        .totals { margin-top: 16px; width: 320px; margin-left: auto; font-size: 13px; }
        .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
        .totals .net { font-weight: 800; font-size: 15px; color: #ED1C2E; border-top: 1px solid #E2E2ED; margin-top: 6px; padding-top: 6px; }
        .section-title { font-weight: 700; margin-top: 16px; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${logoBase64 ? `<img class="logo" src="${logoBase64}" />` : ''}
          <div><strong>Surgical World</strong> - ${branch?.name || ''}</div>
          <div>${branch?.address || ''}</div>
        </div>
        <div style="text-align:right">
          <div class="badge">${isDemo ? 'FRONTEND DEMO - NOT POSTED TO INVENTORY' : 'PURCHASE ORDER'}</div>
          <div><strong>${purchase.purchaseNumber}</strong></div>
          <div>${formatDate(purchase.purchaseDate)}</div>
        </div>
      </div>

      <div class="section-title">Supplier</div>
      <div>${supplier?.name || ''} (${supplier?.supplierCode || ''})</div>
      <div>${supplier?.address || ''}</div>
      <div>GSTIN: ${supplier?.gst || '-'}</div>
      <div>Supplier Invoice: ${purchase.supplierInvoiceNumber || '-'} ${purchase.supplierInvoiceDate ? `(${formatDate(purchase.supplierInvoiceDate)})` : ''}</div>

      <table>
        <thead>
          <tr><th>Product</th><th>SKU</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Price</th><th>GST</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div><span>Gross Amount</span><span>${formatCurrency(totals.grossAmount)}</span></div>
        <div><span>Product Discounts</span><span>${formatCurrency(totals.productDiscounts)}</span></div>
        <div><span>Invoice Discount</span><span>${formatCurrency(totals.invoiceDiscount)}</span></div>
        <div><span>Taxable Amount</span><span>${formatCurrency(totals.taxableAmount)}</span></div>
        <div><span>CGST</span><span>${formatCurrency(totals.cgst)}</span></div>
        <div><span>SGST</span><span>${formatCurrency(totals.sgst)}</span></div>
        <div><span>IGST</span><span>${formatCurrency(totals.igst)}</span></div>
        <div><span>Other Charges (Non-taxable)</span><span>${formatCurrency(totals.otherCharges)}</span></div>
        <div class="net"><span>Net Amount</span><span>${formatCurrency(totals.netAmount)}</span></div>
        <div><span>Paid</span><span>${formatCurrency(purchase.paidAmount)}</span></div>
        <div><span>Balance</span><span>${formatCurrency(purchase.balanceAmount)}</span></div>
      </div>

      ${purchase.remarks ? `<div class="section-title">Remarks</div><div>${purchase.remarks}</div>` : ''}
    </body>
  </html>`;
}

export default { buildPurchaseDocumentHtml };
