import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/context/AppProviders';
import UpdateChecker from '../src/components/UpdateChecker';
import GlobalFocusStyles from '../src/components/GlobalFocusStyles';

export default function RootLayout() {
  return (
    <AppProviders>
      <GlobalFocusStyles />
      <UpdateChecker />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
