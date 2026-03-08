import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../components/SectionHeader';
import MenuRow from '../components/MenuRow';
import {
  User,
  UserIcon,
  Settings,
  Terminal,
  AppWindow,
  Gamepad2,
  CreditCard,
  Star,
  Crown,
  ArrowRightLeft,
  Trash2,
  Sliders,
  Heart,
} from 'lucide-react';

export default function HomePage() {
  const { userId } = useParams();
  const { user } = useTelegram();
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  
      <SectionHeader title='I love Trelk' />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={Star}
          label="Comandos Premium"
          description="Comandos personalizados"
          to={`/users/ui/${userId}/premium`}
        />
        <MenuRow
          icon={Heart}
          iconBg="#e5545e"
          label="Favoritos"
          description="Tu galería de favoritos"
          to={`/users/ui/${userId}/favorites`}
        />
      </div>

         {/* Ajustes Section */}
      <SectionHeader title="Ajustes" />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={User}
          label="Mi cuenta"
          to={`/users/ui/${userId}/profile`}
        />
        <MenuRow
          icon={Sliders}
          label="Preferencias"
          description="Ajustes del bot"
          to={`/users/ui/${userId}/settings`}
        />
      </div>

      {/* Monetization Section */}
      <SectionHeader title="Plan" />
      <div className="mx-4 animate-stagger">
        <MenuRow icon={Crown} iconBg="#f5a623" label="Suscripción" description="Tu plan y límites" to={`/users/ui/${userId}/subscription`} />
        <MenuRow icon={CreditCard} iconBg="#50b85d" label="Payments" to={`/users/ui/${userId}/payments`} />
      </div>

      {/* Actions Section */}
      <SectionHeader title="Actions" />
      <div className="mx-4 animate-stagger">
        <MenuRow
          icon={ArrowRightLeft}
          iconBg="#7d8b97"
          label="Transfer Ownership"
          to={`/users/ui/${userId}/transfer`}
        />
        <MenuRow
          icon={Trash2}
          iconBg="#e5545e"
          label="Delete Bot"
          destructive
          onClick={() => {
            // Placeholder - will show confirm dialog
          }}
        />
      </div>
    </div>
  );
}
