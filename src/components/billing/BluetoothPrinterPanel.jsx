import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import { useNotification } from '../../hooks/useNotification';
import {
  subscribeToPrinterChanges,
  connectPrinter,
  disconnectPrinter,
  testPrint,
  savePrinterSettings,
} from '../../services/print/bluetoothPrinterService';

export default function BluetoothPrinterPanel({ visible, onClose }) {
  const { success, error: notifyError } = useNotification();
  const [state, setState] = useState({
    printerName: '',
    printerId: '',
    printerWidth: 80,
    connectionStatus: 'Not Connected',
  });
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [localWidth, setLocalWidth] = useState(80);

  useEffect(() => {
    if (visible) {
      const unsubscribe = subscribeToPrinterChanges((updatedState) => {
        setState(updatedState);
        setLocalWidth(updatedState.printerWidth || 80);
      });
      return unsubscribe;
    }
  }, [visible]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await connectPrinter();
      success(`Connected to ${result.printerName}`);
    } catch (err) {
      notifyError(err.message || 'Failed to connect printer.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPrinter();
      success('Printer disconnected');
    } catch (err) {
      notifyError('Failed to disconnect printer.');
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await testPrint();
      success('Test print sent to printer.');
    } catch (err) {
      notifyError(err.message || 'Test print failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await savePrinterSettings({ printerWidth: localWidth });
      success('Printer settings saved successfully.');
    } catch (err) {
      notifyError('Failed to save settings.');
    }
  };

  const isConnected = state.connectionStatus === 'Connected';

  return (
    <Modal visible={visible} onClose={onClose} title="Bluetooth Printer" width={420} scrollable={true}>
      <View style={styles.container}>
        {/* Connection Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={[styles.statusRow, isConnected ? styles.connectedBg : styles.disconnectedBg]}>
            <View style={[styles.statusIndicator, isConnected ? styles.connectedIndicator : styles.disconnectedIndicator]} />
            <Text style={[styles.statusText, isConnected ? styles.connectedText : styles.disconnectedText]}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>

        {/* Selected Printer Info */}
        {isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Printer</Text>
            <View style={styles.printerCard}>
              <Text style={styles.printerName}>{state.printerName}</Text>
              {state.printerId ? <Text style={styles.printerId}>{state.printerId}</Text> : null}
            </View>
          </View>
        )}

        {/* Printer Width Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Paper Width</Text>
          <View style={styles.widthSelectorRow}>
            <Pressable
              style={[styles.widthOption, localWidth === 58 && styles.widthOptionActive]}
              onPress={() => setLocalWidth(58)}
            >
              <Text style={[styles.widthText, localWidth === 58 && styles.widthTextActive]}>58mm</Text>
              <Text style={[styles.widthDesc, localWidth === 58 && styles.widthDescActive]}>Standard Receipt</Text>
            </Pressable>
            <Pressable
              style={[styles.widthOption, localWidth === 80 && styles.widthOptionActive]}
              onPress={() => setLocalWidth(80)}
            >
              <Text style={[styles.widthText, localWidth === 80 && styles.widthTextActive]}>80mm</Text>
              <Text style={[styles.widthDesc, localWidth === 80 && styles.widthDescActive]}>Wide Receipt (Default)</Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isConnected ? (
            <Button
              title="Connect Printer"
              onPress={handleConnect}
              loading={connecting}
              variant="primary"
              style={styles.actionBtn}
            />
          ) : (
            <View style={styles.btnRow}>
              <Button
                title="Test Print"
                onPress={handleTestPrint}
                loading={testing}
                variant="secondary"
                style={[styles.actionBtn, { flex: 1 }]}
              />
              <Button
                title="Disconnect"
                onPress={handleDisconnect}
                variant="danger"
                style={[styles.actionBtn, { flex: 1 }]}
              />
            </View>
          )}

          <Button
            title="Save Settings"
            onPress={handleSaveSettings}
            variant="primary"
            outline
            style={styles.actionBtn}
          />
          <Button
            title="Close"
            onPress={onClose}
            variant="ghost"
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  connectedBg: {
    backgroundColor: COLORS.successSoft,
  },
  disconnectedBg: {
    backgroundColor: COLORS.warningSoft,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectedIndicator: {
    backgroundColor: COLORS.success,
  },
  disconnectedIndicator: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
  },
  connectedText: {
    color: COLORS.success,
  },
  disconnectedText: {
    color: COLORS.warning,
  },
  printerCard: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  printerName: {
    ...TYPOGRAPHY.bodyStrong,
    color: COLORS.textPrimary,
  },
  printerId: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  widthSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  widthOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  widthOptionActive: {
    borderColor: COLORS.brandRed,
    backgroundColor: COLORS.dangerSoft,
  },
  widthText: {
    ...TYPOGRAPHY.bodyStrong,
    color: COLORS.textPrimary,
  },
  widthTextActive: {
    color: COLORS.brandRed,
  },
  widthDesc: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  widthDescActive: {
    color: COLORS.brandRed,
  },
  actionsContainer: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  actionBtn: {
    width: '100%',
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
});
