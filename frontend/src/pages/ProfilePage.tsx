import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores';
import { useFavoritesStore } from '../stores/favorites';
import { useEffect, useState } from 'react';
import {
    Heart,
    Terminal,
    Image as ImageIcon,
    Sparkles,
    Calendar,
    User,
    DownloadCloud,
    Share2,
    LifeBuoy,
    Crown,
    ChevronRight
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';

interface StatItem {
    label: string;
    value: string;
    icon: React.ReactNode;
}

interface ActivityItem {
    label: string;
    time: string;
    icon: React.ReactNode;
}

export default function ProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation('profile');
    const { user: tgUser, haptic, webApp } = useTelegram();
    const appUser = useUserStore((s) => s.user);
    const { items, total, load: loadFavs } = useFavoritesStore();
    const [showHeader, setShowHeader] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    const firstName = tgUser?.first_name || 'User';
    const lastName = tgUser?.last_name || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ');
    const username = tgUser?.username ? `@${tgUser.username}` : '';
    const photoUrl = tgUser?.photo_url;
    const tgId = appUser?.authTelegram?.id || appUser?.id;
    const isPremium = (tgUser as any)?.is_premium;

    useEffect(() => {
        requestAnimationFrame(() => setShowHeader(true));
    }, []);

    const go = (path: string) => {
        haptic?.impactOccurred('light');
        navigate(`/users/ui/${userId}${path}`);
    };

    const stats: StatItem[] = [
        {
            label: t('favorites'),
            value: String(total || items.length || 0),
            icon: <Heart size={18} className="text-pink-500 fill-pink-500/20" />,
        },
        {
            label: t('commands'),
            value: String((appUser?.authUser?.config as any)?.commands ? Object.keys((appUser?.authUser?.config as any).commands).length : 0),
            icon: <Terminal size={18} className="text-sky-500" />,
        },
        {
            label: t('images'),
            value: '—',
            icon: <ImageIcon size={18} className="text-purple-500" />,
        },
    ];

    const activity: ActivityItem[] = [
        {
            label: t('last_generation'),
            time: t('recently'),
            icon: <Sparkles size={18} className="text-purple-500" />,
        },
        {
            label: t('last_favorite'),
            time: items[0]?.createdAt
                ? new Date(items[0].createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                : '—',
            icon: <Heart size={18} className="text-pink-500" />,
        },
        {
            label: t('member_since'),
            time: '—',
            icon: <Calendar size={18} className="text-emerald-500" />,
        },
    ];

    return (
        <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto overflow-x-hidden">

            {/* ── Profile Header ── */}
            <div className={`flex flex-col items-center pt-8 pb-6 px-5 transition-all duration-500 ease-out ${showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="relative" onContextMenu={(e) => e.preventDefault()}>
                    {photoUrl ? (
                        <img src={photoUrl} alt="" draggable="false" onContextMenu={(e) => e.preventDefault()} onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                            className="w-[90px] h-[90px] rounded-full object-cover ring-[3px] ring-tg-bg shadow-sm z-10 relative select-none pointer-events-none"
                        />
                    ) : (
                        <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-[32px] font-bold ring-[3px] ring-tg-bg shadow-sm z-10 relative">
                            {firstName.charAt(0)}
                        </div>
                    )}
                    <div className="absolute inset-0 z-30 rounded-full" onContextMenu={(e) => e.preventDefault()} />

                    {/* Anillo de fondo decorativo */}
                    <div className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-tg-accent/30 to-purple-500/30 blur-lg z-0 transition-opacity duration-1000 opacity-80" />

                    {/* Insignia Premium */}
                    {isPremium && (
                        <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-[3px] ring-tg-bg shadow-sm z-20">
                            <Crown size={14} className="text-white fill-white/30 drop-shadow-sm" />
                        </div>
                    )}
                </div>

                <h1 className="text-[22px] font-bold text-tg-text mt-4 leading-tight tracking-tight">{displayName}</h1>
                {username && <p className="text-[14px] font-medium text-tg-hint mt-0.5">{username}</p>}

                <div className="flex items-center gap-2 mt-3.5">
                    <span className="text-[12px] font-mono font-medium text-tg-hint bg-tg-secondary border border-tg-border/40 px-3 py-1.5 rounded-full shadow-sm">
                        ID: {tgId}
                    </span>
                    {isPremium && (
                        <span className="text-[12px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full shadow-sm">
                            Premium
                        </span>
                    )}
                </div>
            </div>

            {/* ── Stats (Bento Grid) ── */}
            <section className="px-5 mt-2">
                <div className="grid grid-cols-3 gap-3">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-tg-secondary border border-tg-border/40 rounded-[20px] p-3.5 flex flex-col items-center justify-center shadow-sm">
                            <div className="w-9 h-9 rounded-[12px] bg-tg-hint/10 flex items-center justify-center mb-2">
                                {s.icon}
                            </div>
                            <div className="text-[18px] font-bold text-tg-text leading-none">{s.value}</div>
                            <div className="text-[11px] font-medium text-tg-hint mt-1.5 uppercase tracking-wider">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Activity Timeline ── */}
            <section className="mt-8 px-5">
                <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('activity')}</h2>
                <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
                    <div className="flex flex-col">
                        {activity.map((a) => (
                            <div key={a.label} className="flex items-center gap-3.5 p-3.5 border-b border-tg-border/20 last:border-0">
                                <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-hint/10 flex items-center justify-center flex-shrink-0">
                                    {a.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[15px] font-semibold text-tg-text leading-tight">{a.label}</div>
                                </div>
                                <span className="text-[13px] font-medium text-tg-hint">{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Actions ── */}
            <section className="mt-8 px-5 pb-6">
                <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('actions')}</h2>
                <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
                    <div className="flex flex-col">

                        <button onClick={() => go('/profile')} className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
                            <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-accent/10 flex items-center justify-center flex-shrink-0">
                                <User size={18} className="text-tg-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('edit_profile')}</div>
                                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('edit_profile_desc')}</div>
                            </div>
                            <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
                        </button>

                        <button onClick={() => go('/favorites')} className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
                            <div className="w-[34px] h-[34px] rounded-[10px] bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                                <DownloadCloud size={18} className="text-pink-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('export_favorites')}</div>
                                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('export_desc')}</div>
                            </div>
                            <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
                        </button>

                        <button
                            onClick={async () => {
                                haptic?.impactOccurred('light');
                                const shareData = {
                                    title: 'Trelk Bot',
                                    text: t('share_text'),
                                    url: 'https://t.me/TrelkBot',
                                };
                                try {
                                    await navigator.share(shareData);
                                } catch (error) {
                                    setShareOpen(true);
                                }
                            }}
                            className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                        >
                            <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                                <Share2 size={18} className="text-sky-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('share_bot')}</div>
                                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('share_bot_desc')}</div>
                            </div>
                            <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
                        </button>

                        <button
                            onClick={() => {
                                haptic?.impactOccurred('light');
                                webApp?.openTelegramLink('https://t.me/TrelkSupportBot');
                            }}
                            className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                        >
                            <div className="w-[34px] h-[34px] rounded-[10px] bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <LifeBuoy size={18} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('support')}</div>
                                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('support_desc')}</div>
                            </div>
                            <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
                        </button>

                    </div>
                </div>
            </section>
            <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />

        </div>

    );
}