import { Platform } from 'react-native';

export const SHADOWS = {
  card: Platform.select({
    web: { boxShadow: '0 2px 10px rgba(32, 36, 99, 0.08)' },
    default: {
      shadowColor: '#202463',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
  }),
  raised: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(32, 36, 99, 0.12)' },
    default: {
      shadowColor: '#202463',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
  }),
  none: {},
};

export default SHADOWS;
