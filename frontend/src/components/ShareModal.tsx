import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';

export default function ShareModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {

    const [copied, setCopied] = useState(false);
    const { haptic } = useTelegram();
    const { t } = useTranslation('common');

    const shareData = {
        title: 'Trelk Bot',
        text: t('share_text'),
        url: 'https://t.me/TrelkBot',
    };

    const pageUrl = shareData.url;

    /* -------------------------
       Bloquear scroll body
    --------------------------*/
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    /* -------------------------
       Compartir nativo
    --------------------------*/
    const handleNativeShare = async () => {
        try {

            if (navigator.share) {
                await navigator.share(shareData);
                haptic?.notificationOccurred('success');
            } else {
                handleCopyLink();
            }

        } catch (err) {
            console.log(err);
        }
    };

    /* -------------------------
       Copiar enlace
    --------------------------*/
    const handleCopyLink = async () => {
        try {

            await navigator.clipboard.writeText(pageUrl);

            haptic?.notificationOccurred('success');

            setCopied(true);

            setTimeout(() => setCopied(false), 2000);

        } catch (err) {
            haptic?.notificationOccurred('error');
        }
    };

    /* -------------------------
       Links de compartir
    --------------------------*/

    const encodedUrl = encodeURIComponent(pageUrl);
    const encodedText = encodeURIComponent(shareData.text);

    const shareApps = [
        {
            name: 'X',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
            color: 'text-[#000000] dark:text-[#ffffff]',
            bg: 'bg-[#e7e7e7] dark:bg-[#ffffff]/15',
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            name: 'Facebook',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            color: 'text-[#1877F2]',
            bg: 'bg-[#1877F2]/15',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            name: 'WhatsApp',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            ),
            color: 'text-[#25D366]',
            bg: 'bg-[#25D366]/15',
            url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        },
        {
            name: 'Telegram',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
            ),
            color: 'text-[#2AABEE]',
            bg: 'bg-[#2AABEE]/15',
            url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            name: 'Messenger',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.29-.21.69-.21.98 0l2.8 2.1c.88.66 2.13.37 2.65-.6l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87a.795.795 0 01-.98 0l-2.8-2.1a1.59 1.59 0 00-2.65.6z"/>
                </svg>
            ),
            color: 'text-[#0084FF]',
            bg: 'bg-[#0084FF]/15',
            url: `fb-messenger://share?link=${encodedUrl}`,
        },
        {
            name: 'Email',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
            ),
            color: 'text-[#D44638]',
            bg: 'bg-[#D44638]/15',
            url: `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodedText}%20${encodedUrl}`,
        },
        {
            name: 'LinkedIn',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
            ),
            color: 'text-[#0077B5]',
            bg: 'bg-[#0077B5]/15',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        },
        {
            name: t('share'),
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
            ),
            color: 'text-tg-text',
            bg: 'bg-tg-surface/50',
            url: '#',
            onClick: handleNativeShare,
        }
    ];

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => onClose()}
        >
            {/* Fondo */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full sm:max-w-sm bg-tg-secondary/90 backdrop-blur-xl rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-tg-border/30 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
                </div>

                {/* Header */}
                <div className="px-6 pt-3 pb-4 flex justify-between items-center border-b border-tg-border/20">

                    <h2 className="text-[18px] font-extrabold text-tg-text">
                        {t('share')}
                    </h2>

                    <button
                        onClick={() => {
                            onClose();
                            haptic?.impactOccurred('light');
                        }}
                        className="w-8 h-8 rounded-full bg-tg-surface/60 flex items-center justify-center text-tg-hint"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>

                </div>


                {/* Apps */}

                <div className="px-6 py-6">

                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">

                        {shareApps.map((app) => (
                            <button
                                key={app.name}
                                onClick={() => {
                                    if (app.onClick) {
                                        app.onClick();
                                    } else {
                                        window.open(app.url, '_blank');
                                    }
                                    haptic?.impactOccurred('light');
                                }}
                                className="flex flex-col items-center gap-2 active:scale-90 transition"
                            >

                                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${app.bg} ${app.color}`}>
                                    {app.icon}
                                </div>

                                <span className="text-[11px] text-tg-hint">
                                    {app.name}
                                </span>

                            </button>
                        ))}

                    </div>

                </div>

                {/* Copy section */}

                <div className="px-5 pb-8">

                    <div className="flex items-center justify-between mb-2 px-1">

                        <h3 className="text-[13px] font-bold text-tg-hint uppercase ">
                            {t('link')}
                        </h3>

                        {copied && (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {t('copied')}
                            </span>
                        )}

                    </div>

                    <div className="flex items-center bg-tg-surface/50 rounded-[16px] p-1.5 border border-tg-border/20">

                        <input
                            type="text"
                            readOnly
                            value={pageUrl}
                            className="bg-transparent text-tg-text/90 font-mono text-[13px] flex-1 px-3 outline-none truncate"
                        />

                        <button
                            onClick={handleCopyLink}
                            className={`flex items-center justify-center w-10 h-10 rounded-[12px] transition ${copied
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-tg-secondary text-tg-text'
                                }`}
                        >
                            {copied ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            )}
                        </button>

                    </div>

                </div>

            </div>
        </div>
    );
}