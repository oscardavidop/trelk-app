import { useQuery } from '@tanstack/react-query';
import { fetchUserState } from '../services/userStateApi';
import type { UserStateType } from '../services/userStateApi';

/**
 * useUserState — adaptive UI based on user engagement level.
 *
 * Returns the user classification and helpers for conditional rendering.
 *
 * Usage:
 *   const { state, isNewUser, isPowerUser, isInactive } = useUserState();
 *
 *   {isNewUser && <OnboardingTips />}
 *   {isPowerUser && <AdvancedShortcuts />}
 *   {isInactive && <ReEngagement />}
 */
export function useUserState() {
  const { data: state, isLoading } = useQuery({
    queryKey: ['user-state'],
    queryFn: fetchUserState,
    staleTime: 5 * 60_000, // 5 min
    retry: 1,
  });

  const type: UserStateType = state?.type ?? 'exploring_user';

  return {
    state,
    type,
    isLoading,
    isNewUser: type === 'new_user',
    isExploring: type === 'exploring_user',
    isPowerUser: type === 'power_user',
    isInactive: type === 'inactive_user',
    engagementScore: state?.engagementScore ?? 0,
  };
}
