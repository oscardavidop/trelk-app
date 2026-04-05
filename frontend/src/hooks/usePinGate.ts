import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPinStatus } from '../services/securityApi';
import { useSecurityStore } from '../stores/security';
import { hasSessionToken } from '../lib/authFetch';

/**
 * Hook that checks PIN security status on mount.
 * Returns { needsPin, checking } so App can show PinLockScreen.
 * Only fetches when the session token is available (auth complete).
 */
export function usePinGate(isAuthenticated: boolean) {
  const {
    pinEnabled, verified, checking,
    setPinEnabled, setVerified, setIsLocked,
    setLockAfterMinutes, setChecking,
  } = useSecurityStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pin-status'],
    queryFn: fetchPinStatus,
    staleTime: 30_000,
    retry: 1,
    enabled: isAuthenticated && hasSessionToken(),
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isLoading) return;

    if (data) {
      setPinEnabled(data.pinEnabled);
      setVerified(data.verified);
      setIsLocked(data.isLocked);
      setLockAfterMinutes(data.lockAfterMinutes);
    }

    // If the query errored (e.g. 401), don't block the UI — treat as no PIN
    if (isError) {
      setPinEnabled(false);
    }

    setChecking(false);
  }, [data, isLoading, isError, isAuthenticated, setPinEnabled, setVerified, setIsLocked, setLockAfterMinutes, setChecking]);

  return {
    needsPin: !checking && pinEnabled && !verified,
    checking: isAuthenticated ? (checking || isLoading) : false,
  };
}
