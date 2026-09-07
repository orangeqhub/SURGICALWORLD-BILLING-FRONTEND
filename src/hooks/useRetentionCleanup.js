import { useCallback, useState } from 'react';
import { runRetentionCleanup } from '../services/cleanup/cleanupService';

export function useRetentionCleanup() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const runCleanup = useCallback(async (options) => {
    setRunning(true);
    try {
      const result = await runRetentionCleanup(options);
      setLastResult(result);
      return result;
    } finally {
      setRunning(false);
    }
  }, []);

  return { running, lastResult, runCleanup };
}

export default useRetentionCleanup;
