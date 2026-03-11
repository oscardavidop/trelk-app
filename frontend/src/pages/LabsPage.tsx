import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { EXPERIMENTAL_COMMANDS } from '../data/commandMocks';
import { FlaskConical, Zap, AlertTriangle, Sparkles } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

const BADGE_STYLES: Record<string, string> = {
    alpha: 'text-red-500 bg-red-500/10 border-red-500/20 shadow-sm',
    beta: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-sm',
    'coming-soon': 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-sm',
};

export default function LabsPage() {
    useHideIsland();
    const { userId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation('labs');
    const { haptic } = useTelegram();

    return (
        <div className="pb-24 animate-fade-in relative">
            <StickyHeader title={t('title')} subtitle={t('subtitle')} icon={<FlaskConical className="w-6 h-6 text-purple-500 fill-purple-500/20" />} />

            {/* ── Advertencia ── */}
            <div className="mx-5 mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-[20px] flex items-start gap-3 shadow-sm">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium text-amber-600 dark:text-amber-300 leading-relaxed">
                    {t('warning')}
                </p>
            </div>

            {/* ── Lista de Experimentos ── */}
            <section className="px-5 mt-6">
                <div className="space-y-4">
                    {EXPERIMENTAL_COMMANDS.map((exp, index) => {
                        const progress = exp.status === 'coming-soon' ? 20 : exp.status === 'alpha' ? 55 : 80;
                        const isComingSoon = exp.status === 'coming-soon';

                        return (
                            <div
                                key={exp.id}
                                className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="p-4.5 p-5">

                                    {/* Título y Badge */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-purple-500" />
                                            <span className="text-[16px] font-extrabold font-mono text-tg-text ">/{exp.id}</span>
                                        </div>
                                        <span
                                            className={`text-[10px] font-extrabold uppercase  px-2.5 py-1 rounded-full border ${BADGE_STYLES[exp.status]}`}
                                        >
                                            {isComingSoon ? t('soon') : exp.status}
                                        </span>
                                    </div>

                                    {/* Descripción */}
                                    <p className="text-[13px] font-medium text-tg-hint/90 leading-relaxed mb-4">
                                        {exp.description}
                                    </p>

                                    {/* Barra de Progreso */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-1 h-2 bg-tg-text/[0.05] border border-tg-border/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000 ease-out relative"
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20" />
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-tg-text/80 tracking-wide w-8 text-right">
                                            {progress}%
                                        </span>
                                    </div>

                                    {/* Botón de Acción */}
                                    <button
                                        onClick={() => {
                                            if (!isComingSoon) {
                                                haptic?.impactOccurred('light');
                                                navigate(`/users/ui/${userId}/bot-commands/${exp.id}`);
                                            }
                                        }}
                                        disabled={isComingSoon}
                                        className={`w-full py-3 rounded-[14px] text-[14px] font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isComingSoon
                                                ? 'bg-tg-text/[0.03] border border-tg-border/30 text-tg-hint/50 cursor-not-allowed opacity-80'
                                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 shadow-sm'
                                            }`}
                                    >
                                        {isComingSoon ? (
                                            <>{t('in_development')}</>
                                        ) : (
                                            <>
                                                <Zap size={16} className="fill-purple-500/20" /> {t('try_experiment')}
                                            </>
                                        )}
                                    </button>

                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

        </div>
    );
}