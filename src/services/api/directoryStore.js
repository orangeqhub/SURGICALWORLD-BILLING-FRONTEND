import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small AsyncStorage-backed list persistence for mock directory data (added
 * employees/admins) that isn't part of the SQLite schema. Works identically
 * on web (localStorage) and native so added records survive a refresh.
 */
export async function loadDirectoryList(key, seed = []) {
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return seed;
    }
  }
  await AsyncStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export async function saveDirectoryList(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

export default { loadDirectoryList, saveDirectoryList };
