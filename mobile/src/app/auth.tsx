import { router } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';

// Target of the Microsoft sign-in redirect (misterdil://auth). The auth session reads
// the URL itself; if the system opens it as a route instead, go back to the app.
export default function AuthRedirect() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/'), 50);
    return () => clearTimeout(timer);
  }, []);
  return <Loading />;
}
