import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SETTINGS_KEY = 'sw_bluetooth_printer_settings_v1';

let internalState = {
  printerName: '',
  printerId: '',
  printerWidth: 80, // default 80
  connectionStatus: 'Not Connected',
};

// Listeners for state changes
const listeners = new Set();
function notifyListeners() {
  listeners.forEach((cb) => cb({ ...internalState }));
}

export function subscribeToPrinterChanges(callback) {
  listeners.add(callback);
  callback({ ...internalState });
  return () => {
    listeners.delete(callback);
  };
}

export async function loadPrinterSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      internalState = { ...internalState, ...parsed };
      notifyListeners();
    }
  } catch (e) {
    console.error('Failed to load printer settings', e);
  }
  return internalState;
}

export async function savePrinterSettings(settings) {
  internalState = { ...internalState, ...settings };
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(internalState));
  } catch (e) {
    console.error('Failed to save printer settings', e);
  }
  notifyListeners();
}

export async function connectPrinter() {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      throw new Error(
        'Bluetooth printing is not supported in this browser. Use Chrome/Edge on supported device or use system print.'
      );
    }
    try {
      // Connect requires user click
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      const settings = {
        printerName: device.name || 'Bluetooth Printer',
        printerId: device.id,
        connectionStatus: 'Connected',
      };
      await savePrinterSettings(settings);
      return settings;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new Error('User cancelled printer selection.');
      }
      throw new Error(`Web Bluetooth connection failed: ${err.message}`);
    }
  } else {
    // Native Fallback / Stub
    try {
      const settings = {
        printerName: 'Demo Native Thermal Printer',
        printerId: 'BT:DE:AD:BE:EF:00',
        connectionStatus: 'Connected',
      };
      await savePrinterSettings(settings);
      return settings;
    } catch (err) {
      throw new Error(`Native Bluetooth connection failed: ${err.message}`);
    }
  }
}

export async function disconnectPrinter() {
  const settings = {
    printerName: '',
    printerId: '',
    connectionStatus: 'Not Connected',
  };
  await savePrinterSettings(settings);
  return settings;
}

export async function getConnectionStatus() {
  await loadPrinterSettings();
  return internalState.connectionStatus;
}

export async function testPrint() {
  if (internalState.connectionStatus !== 'Connected') {
    throw new Error('Printer not connected');
  }
  console.log('Simulated BT Print: Test print text sent to printer.');
  return true;
}

export async function printBill(receiptHtml) {
  console.log(`Sending bill print to BT printer width ${internalState.printerWidth}mm:`, receiptHtml.substring(0, 100) + '...');
  return true;
}

// Initial load
if (typeof window !== 'undefined') {
  loadPrinterSettings();
}

export default {
  subscribeToPrinterChanges,
  loadPrinterSettings,
  savePrinterSettings,
  connectPrinter,
  disconnectPrinter,
  getConnectionStatus,
  testPrint,
  printBill,
};
