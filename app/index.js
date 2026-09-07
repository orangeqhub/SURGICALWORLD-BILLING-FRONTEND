import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { ROLE_HOME_ROUTE } from '../src/constants/roles';
import LoadingState from '../src/components/ui/LoadingState';

export default function Index() {
  const { user, restoring } = useAuth();

  if (restoring) {
    return <LoadingState fullscreen label="Loading Surgical World..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login-selection" />;
  }

  return <Redirect href={ROLE_HOME_ROUTE[user.role]} />;
}
