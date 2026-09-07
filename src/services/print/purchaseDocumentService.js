import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { buildPurchaseDocumentHtml } from './purchaseDocumentTemplate';

const LOGO_ASSET = require('../../../assets/logo.png');
const PURCHASE_PDF_DIR = `${FileSystem.documentDirectory}purchases/`;

/**
 * Standalone print/PDF service for the frontend Purchase document (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3, Part G). Mirrors the
 * existing printService.js Print.printAsync/printToFileAsync pattern but is
 * entirely separate from it and from Bluetooth thermal printing - purchase
 * documents never go through printService.js or bluetoothPrinterService.js.
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

export async function previewPurchaseDocument({ purchase, branch, supplier, totals }) {
  const logoBase64 = await getLogoBase64();
  const html = buildPurchaseDocumentHtml({ purchase, branch, supplier, totals, logoBase64 });
  await Print.printAsync({ html });
}

export async function exportPurchasePdf({ purchase, branch, supplier, totals }) {
  const logoBase64 = await getLogoBase64();
  const html = buildPurchaseDocumentHtml({ purchase, branch, supplier, totals, logoBase64 });
  const { uri } = await Print.printToFileAsync({ html });

  const dirInfo = await FileSystem.getInfoAsync(PURCHASE_PDF_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PURCHASE_PDF_DIR, { intermediates: true });
  }
  const fileName = `${purchase?.purchaseNumber || purchase?.id || 'purchase'}.pdf`;
  const destination = `${PURCHASE_PDF_DIR}${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export default { previewPurchaseDocument, exportPurchasePdf };
