import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getAllSettings, setSetting } from '../services/api/settingsApi';

export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    invoiceRetentionDays: '30',
    invoicePdfRetentionDays: '15',
    syncLogRetentionDays: '7',
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAllSettings()
      .then(setSettings)
      .finally(() => setLoaded(true));
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    await setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: String(value) }));
  }, []);

  const value = useMemo(() => ({ settings, loaded, updateSetting }), [settings, loaded, updateSetting]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export default SettingsContext;
