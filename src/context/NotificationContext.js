import React, { createContext, useCallback, useMemo, useState } from 'react';
import Toast from '../components/ui/Toast';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const notify = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hide = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const value = useMemo(
    () => ({
      notify,
      success: (message) => notify(message, 'success'),
      error: (message) => notify(message, 'error'),
      warning: (message) => notify(message, 'warning'),
      info: (message) => notify(message, 'info'),
    }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hide} />
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
