import { authFetch } from '../lib/authFetch';

export type UserStateType = 'new_user' | 'exploring_user' | 'power_user' | 'inactive_user';

export interface UserState {
  type: UserStateType;
  commandsUsed: number;
  reviewsWritten: number;
  daysSinceLastActive: number;
  accountAgeDays: number;
  engagementScore: number;
  updatedAt: number;
}

export async function fetchUserState(): Promise<UserState | null> {
  try {
    const res = await authFetch('/api/v1/ui/user/state', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? data.state : null;
  } catch {
    return null;
  }
}
