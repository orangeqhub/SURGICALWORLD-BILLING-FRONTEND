import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 900;
const DESKTOP_BREAKPOINT = 1200;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isPhone: width < TABLET_BREAKPOINT,
    isTablet: width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    isLandscape: width > height,
  };
}

export default useResponsiveLayout;
