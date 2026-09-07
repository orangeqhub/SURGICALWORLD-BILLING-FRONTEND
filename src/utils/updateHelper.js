import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

async function downloadAndReload() {
  try {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    Alert.alert(
      'Update Failed',
      'Bill app could not update now. Please close and reopen the app.'
    );
  }
}

function showUpdateAvailableAlert() {
  Alert.alert(
    'Update Available',
    'A new version of Surgical World Billing is available. Please update to continue with latest fixes.',
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Update Now', onPress: downloadAndReload },
    ]
  );
}

// Silent check used on app startup. Never throws; caller may still catch for logging.
export async function promptForUpdateIfAvailable() {
  if (__DEV__) return;
  const result = await Updates.checkForUpdateAsync();
  if (result.isAvailable) {
    showUpdateAvailableAlert();
  }
}

// Manual check used from Settings screens. Always surfaces a result to the user.
export async function checkForUpdatesManually() {
  if (__DEV__) {
    Alert.alert('Updates Disabled', 'Update checks are disabled in development mode.');
    return;
  }
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      showUpdateAvailableAlert();
    } else {
      Alert.alert('No Updates', 'You are already using the latest version.');
    }
  } catch (error) {
    Alert.alert('Update Check Failed', 'Could not check updates now. Please try again later.');
  }
}
