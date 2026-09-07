import { formatCurrency, formatDate, formatTime, formatDateTime } from '../../utils/formatters';

const QUOTE = 'Quality Surgical Products, Trusted Care';

function paymentMethodLabel(payments = []) {
  if (!payments.length) return '-';
  return payments.map((p) => p.method).join(', ');
}

function paymentStatusLabel(invoice) {
  return invoice?.paymentStatus || '-';
}

function invoiceItemRowsHtml(items) {
  return items
    .map((item, index) => {
      const lineTotal = item.quantity * item.sellingPrice;
      const gstAmount = (lineTotal * (item.gst || 0)) / 100;
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${formatCurrency(item.sellingPrice)}</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">${item.gst || 0}%</td>
        <td style="text-align:right;">${formatCurrency(gstAmount)}</td>
        <td style="text-align:right;">${formatCurrency(lineTotal)}</td>
      </tr>`;
    })
    .join('');
}

function billItemRowsHtml(items) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="width: 45%; word-break: break-word; text-align: left; vertical-align: top; padding: 2px 0;">${item.name}</td>
        <td style="width: 15%; text-align: right; vertical-align: top; padding: 2px 0;">${item.quantity}</td>
        <td style="width: 20%; text-align: right; vertical-align: top; padding: 2px 0;">${formatCurrency(item.sellingPrice)}</td>
        <td style="width: 20%; text-align: right; vertical-align: top; padding: 2px 0;">${formatCurrency(item.quantity * item.sellingPrice)}</td>
      </tr>`
    )
    .join('');
}

/**
 * FORMAT 1: Invoice - detailed A4 GST tax invoice.
 */
export function buildA4InvoiceHtml({ invoice, branch, customer, items, payments = [], cashierName, logoBase64 }) {
  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; color: #202463; padding: 32px; }
      .header { display: flex; align-items: center; border-bottom: 3px solid #ED1C2E; padding-bottom: 16px; margin-bottom: 8px; }
      .header img { width: 70px; height: 70px; margin-right: 16px; object-fit: contain; }
      .branch-name { font-size: 20px; font-weight: 700; margin: 0; }
      .branch-meta { font-size: 12px; color: #77799E; margin: 2px 0; }
      .quote { text-align: center; font-size: 12px; font-style: italic; color: #AE204B; margin: 4px 0 16px; }
      .doc-title { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: 1px; color: #202463; margin-bottom: 12px; }
      .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; flex-wrap: wrap; gap: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #F7F8FC; text-align: left; font-size: 10px; text-transform: uppercase; padding: 8px; color: #77799E; }
      td { padding: 8px; font-size: 12px; border-top: 1px solid #E7E1EA; }
      .totals { width: 280px; margin-left: auto; font-size: 13px; }
      .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
      .grand { font-weight: 800; color: #ED1C2E; font-size: 18px; border-top: 1px solid #E7E1EA; padding-top: 6px; margin-top: 6px; }
      .signature { display: flex; justify-content: flex-end; margin-top: 48px; }
      .signature-box { width: 220px; text-align: center; border-top: 1px solid #202463; padding-top: 6px; font-size: 12px; color: #77799E; }
      .footer { text-align: center; font-size: 11px; color: #77799E; margin-top: 24px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" />` : ''}
      <div>
        <p class="branch-name">${branch?.name || ''} - Surgical World</p>
        <p class="branch-meta">${branch?.address || ''}</p>
        <p class="branch-meta">Phone: ${branch?.phone || ''} | GSTIN: ${branch?.gst || '-'}</p>
      </div>
    </div>
    <p class="quote">"${QUOTE}"</p>
    <p class="doc-title">TAX INVOICE</p>

    <div class="meta-row">
      <div><strong>Invoice No:</strong> ${invoice?.invoiceNumber || ''}</div>
      <div><strong>Date:</strong> ${formatDateTime(invoice?.createdAt)}</div>
      <div><strong>Cashier:</strong> ${cashierName || '-'}</div>
    </div>
    <div class="meta-row">
      <div><strong>Customer Name:</strong> ${customer?.name || 'Walk-in Customer'}</div>
      <div><strong>Customer Contact:</strong> ${customer?.mobile || '-'}</div>
    </div>

    <table>
      <thead>
        <tr><th>S.No</th><th>Product</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST %</th><th>GST Amt</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${invoiceItemRowsHtml(items)}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(invoice?.subtotal)}</span></div>
      <div class="totals-row"><span>Discount</span><span>- ${formatCurrency(invoice?.discount)}</span></div>
      <div class="totals-row"><span>GST Total</span><span>${formatCurrency(invoice?.gst)}</span></div>
      <div class="totals-row grand"><span>Grand Total</span><span>${formatCurrency(invoice?.grandTotal)}</span></div>
      <div class="totals-row"><span>Payment Method</span><span>${paymentMethodLabel(payments)}</span></div>
      <div class="totals-row"><span>Payment Status</span><span>${paymentStatusLabel(invoice)}</span></div>
    </div>

    <div class="signature">
      <div class="signature-box">Authorized Signature</div>
    </div>

    <p class="footer">
      Thank you for choosing Surgical World<br/>
      Goods once sold cannot be returned without bill<br/>
      For support, contact your nearest Surgical World branch
    </p>
  </body>
  </html>`;
}

/**
 * FORMAT 2: Bill - short compact receipt (thermal-friendly).
 */
export function buildThermalReceiptHtml({ invoice, branch, customer, items, payments = [], cashierName, logoBase64, printerWidth = 80 }) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const bodyWidth = printerWidth === 58 ? '240px' : '340px';
  const fontSize = printerWidth === 58 ? '10px' : '12px';
  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Courier New', monospace; font-size: ${fontSize}; width: ${bodyWidth}; padding: 8px; color: #000; background: #fff; }
      .center { text-align: center; }
      .logo { display: block; margin: 0 auto 4px; width: 48px; height: 48px; object-fit: contain; }
      .brand { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
      .quote { font-style: italic; font-size: 10px; margin: 2px 0 4px; }
      .row { display: flex; justify-content: space-between; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin: 4px 0; }
      th { text-align: right; font-size: 11px; border-bottom: 1px dashed #000; padding: 2px 0; }
      th.item-header { text-align: left; }
      td { font-size: 11px; padding: 2px 0; }
    </style>
  </head>
  <body>
    ${logoBase64 ? `<img class="logo" src="${logoBase64}" />` : ''}
    <p class="center brand">SURGICAL WORLD</p>
    <p class="center">${branch?.name || ''}</p>
    <p class="center">${branch?.address || ''}</p>
    <p class="center">${branch?.phone ? `Ph: ${branch.phone}` : ''}</p>
    <p class="center">${branch?.gst ? `GSTIN: ${branch.gst}` : ''}</p>
    <p class="center quote">"${QUOTE}"</p>
    <p class="center"><strong>BILL / RECEIPT</strong></p>
    <hr />
    <div class="row"><span>Bill No:</span><span>${invoice?.invoiceNumber || ''}</span></div>
    <div class="row"><span>Date:</span><span>${formatDate(invoice?.createdAt)}</span></div>
    <div class="row"><span>Time:</span><span>${formatTime(invoice?.createdAt)}</span></div>
    <div class="row"><span>Cashier:</span><span>${cashierName || '-'}</span></div>
    <hr />
    <div class="row"><span>Customer:</span><span>${customer?.name || 'Walk-in Customer'}</span></div>
    <div class="row"><span>Contact:</span><span>${customer?.mobile || '-'}</span></div>
    <hr />
    <table>
      <thead>
        <tr>
          <th class="item-header" style="width: 45%;">ITEM</th>
          <th style="width: 15%; text-align: right;">QTY</th>
          <th style="width: 20%; text-align: right;">RATE</th>
          <th style="width: 20%; text-align: right;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${billItemRowsHtml(items)}
      </tbody>
    </table>
    <hr />
    <div class="row"><span>Item Total</span><span>${totalItems}</span></div>
    <div class="row"><span>Subtotal</span><span>${formatCurrency(invoice?.subtotal)}</span></div>
    <div class="row"><span>Discount</span><span>- ${formatCurrency(invoice?.discount)}</span></div>
    <div class="row"><span>GST</span><span>${formatCurrency(invoice?.gst)}</span></div>
    <div class="row"><strong>Grand Total</strong><strong>${formatCurrency(invoice?.grandTotal)}</strong></div>
    <hr />
    <div class="row"><span>Payment Method</span><span>${paymentMethodLabel(payments)}</span></div>
    <div class="row"><span>Payment Status</span><span>${paymentStatusLabel(invoice)}</span></div>
    <hr />
    <p class="center" style="font-weight: bold; margin: 4px 0;">Thank You</p>
    <p class="center" style="font-size: 10px;">Quality Surgical Products, Trusted Care</p>
  </body>
  </html>`;
}

export default { buildA4InvoiceHtml, buildThermalReceiptHtml };
