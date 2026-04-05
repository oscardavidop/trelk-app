import type { ReviewBadge } from '../../services/commandStatsApi';

interface UserBadgeProps {
  badge?: ReviewBadge;
  isAdmin?: boolean;
  isVerified?: boolean;
  isTrustedUser?: boolean;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  admin: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  verified: { label: 'Verified', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  power_user: { label: 'Power', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  trusted: { label: 'Trusted', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  active_user: { label: 'Active', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

/**
 * UserBadge — displays the highest-priority badge for a user.
 * Priority: admin > verified > power_user > trusted > active_user
 */
export default function UserBadge({ badge, isAdmin, isVerified, isTrustedUser, size = 'sm' }: UserBadgeProps) {
  const key = isAdmin
    ? 'admin'
    : isVerified
      ? 'verified'
      : badge === 'power_user'
        ? 'power_user'
        : isTrustedUser
          ? 'trusted'
          : badge === 'active_user'
            ? 'active_user'
            : null;

  if (!key) return null;

  const cfg = BADGE_CONFIG[key];
  const sizeClass = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} ${sizeClass}`}
    >
      {cfg.label}
    </span>
  );
}
