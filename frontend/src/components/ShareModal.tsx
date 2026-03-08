import React, { useState, useEffect } from 'react';
import {
    X,
    Copy,
    Check,
    Twitter,
    Facebook,
    MessageCircle,
    Linkedin,
    Messenger,
    Mail,
    Send,
    Share2
} from 'lucide-react';
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

    const shareData = {
        title: 'Trelk Bot',
        text: '¡Echa un vistazo a este increíble bot de Telegram!',
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
            icon: Twitter,
            color: 'text-[#1DA1F2]',
            bg: 'bg-[#1DA1F2]/15',
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            name: 'Facebook',
            icon: Facebook,
            color: 'text-[#1877F2]',
            bg: 'bg-[#1877F2]/15',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            name: 'Whatsapp',
            icon: MessageCircle,
            color: 'text-[#25D366]',
            bg: 'bg-[#25D366]/15',
            url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        },
        {
            name: 'Telegram',
            icon: Send,
            color: 'text-[#2AABEE]',
            bg: 'bg-[#2AABEE]/15',
            url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            name: 'Messenger',
            icon: Messenger,
            color: 'text-[#0084FF]',
            bg: 'bg-[#0084FF]/15',
            url: `fb-messenger://share?link=${encodedUrl}&app_id=123456789`, // Reemplaza con tu app_id de Facebook
        },
        // other social
        {
            name: 'Email',
            icon: Mail,
            color: 'text-[#D44638]',
            bg: 'bg-[#D44638]/15',
            url: `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodedText}%20${encodedUrl}`,
        },
        {
            name: "Linkedin",
            icon: Linkedin,
            color: 'text-[#0077B5]',
            bg: 'bg-[#0077B5]/15',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        },
        {
            name: 'Enlace',
            icon: Copy,
            color: copied ? 'text-emerald-400' : 'text-tg-text',
            bg: copied ? 'bg-emerald-500/20' : 'bg-white/10',
            url: '#',
            onClick: handleCopyLink,
        }, {
            name: 'Compartir',
            icon: Share2,
            color: 'text-tg-text',
            bg: 'bg-white/10',
            url: '#',
            onClick: handleNativeShare,
        }
    ];

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 mb-[-25px]"
            onClick={() => onClose()}
        >
            {/* Fondo */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full sm:max-w-sm bg-tg-secondary rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-tg-border/50 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-12 h-1.5 rounded-full bg-white/20" />
                </div>

                {/* Header */}
                <div className="px-6 pt-3 pb-4 flex justify-between items-center border-b border-white/5">

                    <h2 className="text-[18px] font-extrabold text-tg-text">
                        Compartir
                    </h2>

                    <button
                        onClick={() => {
                            onClose();
                            haptic?.impactOccurred('light');
                        }}
                        className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>

                </div>


                {/* Apps */}

                <div className="px-6 py-6">

                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">

                        {shareApps.map((app) => {

                            const Icon = app.icon;

                            return (
                                <button
                                    key={app.name}
                                    onClick={() => {
                                        window.open(app.url, '_blank');
                                        haptic?.impactOccurred('light');
                                    }}
                                    className="flex flex-col items-center gap-2 active:scale-90 transition"
                                >

                                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${app.bg} ${app.color}`}>
                                        <Icon size={26} />
                                    </div>

                                    <span className="text-[11px] text-tg-hint">
                                        {app.name}
                                    </span>

                                </button>
                            );
                        })}

                    </div>

                </div>

                {/* Copy section */}

                <div className="px-5 pb-8">

                    <div className="flex items-center justify-between mb-2 px-1">

                        <h3 className="text-[13px] font-bold text-tg-hint uppercase tracking-widest">
                            Enlace
                        </h3>

                        {copied && (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <Check size={12} />
                                Copiado
                            </span>
                        )}

                    </div>

                    <div className="flex items-center bg-black/20 rounded-[16px] p-1.5 border border-white/5">

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
                                : 'bg-white/10 text-tg-text'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>

                    </div>

                </div>

            </div>
        </div>
    );
}