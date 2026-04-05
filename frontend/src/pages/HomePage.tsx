import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../components/SectionHeader';
import MenuRow from '../components/MenuRow';
import LiveActivitySection from '../components/home/LiveActivitySection';
import ForYouSection from '../components/home/ForYouSection';
import SmartEmptyState from '../components/home/SmartEmptyState';
import StreakSection from '../components/home/StreakSection';
import FeatureSpotlight from '../components/home/FeatureSpotlight';
import QuickLearn from '../components/home/QuickLearn';
import {
  User,
  CreditCard,
  Star,
  Crown,
  ArrowRightLeft,
  Trash2,
  Sliders,
  Heart,
} from 'lucide-react';

// TODO: replace with real data from /api/v1/ui/me or a dashboard endpoint
const IS_ACTIVE_USER = true; // flip to true once backend provides activity data

export default function HomePage() {
  const { userId } = useParams();
  const { user } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation('ui');

  const photoUrl = user?.photo_url;
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';
  const username = user?.username ? `@${user.username}` : '';

  return (
    <div className="tm-main animate-fade-in">
      {/* User Profile Section */}
      <div className="tm-intro animate-scale-in">
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} className="tm-avatar" />
        ) : (
          <div className="tm-avatar bg-tg-accent flex items-center justify-center text-white text-3xl font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-xl font-semibold mt-4 mb-1">{displayName}</h1>
        {username && (
          <p className="text-tg-hint text-[15px]">{username}</p>
        )}
      </div>

      {/* ── Dynamic sections (conditional) ── */}
      {IS_ACTIVE_USER ? (
        <>
          <LiveActivitySection />
          <StreakSection />
          <FeatureSpotlight />
        </>
      ) : (
        <>
          <SmartEmptyState />
          <ForYouSection />
          <QuickLearn />
        </>
      )}

      <SectionHeader title={t('i_love_trelk')} />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={Star}
          label={t('premium_commands')}
          description={t('custom_commands')}
          to={`/users/ui/${userId}/premium`}
        />
        <MenuRow
          icon={Heart}
          iconBg="#e5545e"
          label={t('favorites:title')}
          description={t('your_favorites_gallery')}
          to={`/users/ui/${userId}/favorites`}
        />
      </div>

      {/* Ajustes Section */}
      <SectionHeader title={t('settings:title')} />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={User}
          label={t('profile:my_account')}
          to={`/users/ui/${userId}/profile`}
        />
        <MenuRow
          icon={Sliders}
          label={t('settings:preferences')}
          description={t('bot_settings')}
          to={`/users/ui/${userId}/settings`}
        />
      </div>

      {/* Monetization Section */}
      <SectionHeader title={t('plan')} />
      <div className="mx-4 animate-stagger">
        <MenuRow icon={Crown} iconBg="#f5a623" label={t('payments:subscription')} description={t('your_plan_limits')} to={`/users/ui/${userId}/subscription`} />
        <MenuRow icon={CreditCard} iconBg="#50b85d" label={t('payments:title')} to={`/users/ui/${userId}/payments`} />
      </div>

      {/* Actions Section */}
      <SectionHeader title={t('common:actions', { defaultValue: 'Actions' })} />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={ArrowRightLeft}
          iconBg="#7d8b97"
          label={t('transfer_ownership')}
          to={`/users/ui/${userId}/transfer`}
        />
        <MenuRow
          icon={Trash2}
          iconBg="#e5545e"
          label={t('delete_bot')}
          destructive
          onClick={() => {
            // Placeholder - will show confirm dialog
          }}
        />
      </div>
    </div>
  );
}
