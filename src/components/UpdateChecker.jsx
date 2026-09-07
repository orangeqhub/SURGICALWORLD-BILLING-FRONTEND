import { useEffect } from 'react';
import { promptForUpdateIfAvailable } from '../utils/updateHelper';

export default function UpdateChecker() {
  useEffect(() => {
    if (__DEV__) return;
    promptForUpdateIfAvailable().catch((error) => {
      console.log('Update check failed:', error);
    });
  }, []);

  return null;
}
