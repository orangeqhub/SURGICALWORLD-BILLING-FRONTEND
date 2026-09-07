import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { buildPayslipHtml } from './payslipTemplate';

const LOGO_ASSET = require('../../../assets/logo.png');
const PAYSLIP_PDF_DIR = `${FileSystem.documentDirectory}payslips/`;

/**
 * Standalone print/PDF service for Payroll payslips, mirroring
 * purchaseDocumentService.js's Print.printAsync/printToFileAsync pattern.
 * Entirely separate from printService.js/bluetoothPrinterService.js
 * (thermal invoice printing only).
 */
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

export async function previewPayslip({ payroll, branch }) {
  const logoBase64 = await getLogoBase64();
  const html = buildPayslipHtml({ payroll, branch, logoBase64 });
  await Print.printAsync({ html });
}

export async function exportPayslipPdf({ payroll, branch }) {
  const logoBase64 = await getLogoBase64();
  const html = buildPayslipHtml({ payroll, branch, logoBase64 });
  const { uri } = await Print.printToFileAsync({ html });

  const dirInfo = await FileSystem.getInfoAsync(PAYSLIP_PDF_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PAYSLIP_PDF_DIR, { intermediates: true });
  }
  const fileName = `${payroll.employeeId}_${payroll.month}.pdf`;
  const destination = `${PAYSLIP_PDF_DIR}${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export default { previewPayslip, exportPayslipPdf };
