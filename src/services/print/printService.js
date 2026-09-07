import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { buildA4InvoiceHtml, buildThermalReceiptHtml } from './invoiceTemplates';
import { INVOICE_PDF_DIR } from '../cleanup/cleanupService';
import { loadPrinterSettings, printBill } from './bluetoothPrinterService';

const LOGO_ASSET = require('../../../assets/logo.png');

/**
 * The Invoice/Bill format-selection step was removed from the live billing
 * and reprint flows - everything prints the compact BILL/receipt format by
 * default now. Kept as a named constant so both flows stay in sync.
 */
export const DEFAULT_PRINT_FORMAT = 'BILL';

async function getLogoBase64() {
  try {
    const asset = Asset.fromModule(LOGO_ASSET);
    await asset.downloadAsync();
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    return null;
  }
}

async function ensureInvoiceDir() {
  const dirInfo = await FileSystem.getInfoAsync(INVOICE_PDF_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(INVOICE_PDF_DIR, { intermediates: true });
  }
}

export async function previewA4Invoice({ invoice, branch, customer, items, payments = [], cashierName }) {
  const logoBase64 = await getLogoBase64();
  const html = buildA4InvoiceHtml({ invoice, branch, customer, items, payments, cashierName, logoBase64 });
  await Print.printAsync({ html });
}

export async function previewThermalReceipt({ invoice, branch, customer, items, payments = [], cashierName }) {
  const logoBase64 = await getLogoBase64();
  const html = buildThermalReceiptHtml({ invoice, branch, customer, items, payments, cashierName, logoBase64 });
  await Print.printAsync({ html });
}

export async function generateInvoicePdf({ invoice, branch, customer, items, payments = [], cashierName }) {
  const logoBase64 = await getLogoBase64();
  const html = buildA4InvoiceHtml({ invoice, branch, customer, items, payments, cashierName, logoBase64 });
  const { uri } = await Print.printToFileAsync({ html });

  await ensureInvoiceDir();
  const fileName = `${invoice?.invoiceNumber || invoice?.localId || 'invoice'}.pdf`;
  const destination = `${INVOICE_PDF_DIR}${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: destination });

  return destination;
}

/**
 * Unified BILL printing flow:
 * Builds thermal receipt, prints via BT if connected, else falls back to browser/system print dialog.
 */
export async function printBillOnly({ invoice, branch, customer, items, payments = [], cashierName }) {
  const logoBase64 = await getLogoBase64();
  const settings = await loadPrinterSettings();
  const html = buildThermalReceiptHtml({
    invoice,
    branch,
    customer,
    items,
    payments,
    cashierName,
    logoBase64,
    printerWidth: settings.printerWidth || 80,
  });

  if (settings.connectionStatus === 'Connected') {
    try {
      await printBill(html);
      return { success: true, method: 'bluetooth' };
    } catch (err) {
      console.warn('Bluetooth printing failed, falling back to system print:', err);
      await Print.printAsync({ html });
      return { success: true, method: 'system', warning: err.message };
    }
  } else {
    await Print.printAsync({ html });
    return { success: true, method: 'system' };
  }
}

/**
 * Single entry point for the two employee-facing formats: forced to BILL/receipt format.
 */
export async function printByFormat(format, data) {
  return printBillOnly(data);
}

export async function reprintInvoice(data, format = 'BILL') {
  return printBillOnly(data);
}

/**
 * Sharing isn't wired to a native share sheet yet (no share package in this
 * project's dependency set) - this is a placeholder so the UI action exists
 * without pretending the file was actually shared anywhere.
 */
export async function shareInvoicePlaceholder(pdfPath) {
  return { shared: false, path: pdfPath, message: 'Sharing is not yet configured for this build.' };
}

export default {
  DEFAULT_PRINT_FORMAT,
  previewA4Invoice,
  previewThermalReceipt,
  generateInvoicePdf,
  printBillOnly,
  printByFormat,
  reprintInvoice,
  shareInvoicePlaceholder,
};
