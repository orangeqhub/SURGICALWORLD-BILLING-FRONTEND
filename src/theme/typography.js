import { COLORS } from './colors';

export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  h2: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  h4: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 14, fontWeight: '400', color: COLORS.textPrimary },
  bodyStrong: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  caption: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  small: { fontSize: 11, fontWeight: '400', color: COLORS.textMuted },
};

export default TYPOGRAPHY;
