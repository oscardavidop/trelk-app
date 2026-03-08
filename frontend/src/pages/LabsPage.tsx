import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { EXPERIMENTAL_COMMANDS } from '../data/commandMocks';
import { FlaskConical, Zap, AlertTriangle, Sparkles } from 'lucide-react';

const BADGE_STYLES: Record<string, string> = {
  alpha: 'text-red-400 bg-red-500/10 border-red-500/20',
  beta: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'coming-soon': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function LabsPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <div className="pb-16 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-[12px] bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
            <FlaskConical size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight">Labs</h1>
            <p className="text-[12px] text-tg-hint">Comandos experimentales</p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mx-5 mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-[14px] flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-200/80 leading-relaxed">
          Estos comandos están en desarrollo activo. Pueden cambiar, tener errores o ser retirados sin previo aviso.
        </p>
      </div>

      {/* Experiments list */}
      <section className="px-5 mt-5">
        <div className="space-y-3">
          {EXPERIMENTAL_COMMANDS.map((exp) => {
            const progress = exp.status === 'coming-soon' ? 20 : exp.status === 'alpha' ? 55 : 80;
            return (
            <div
              key={exp.id}
              className="bg-tg-secondary rounded-[18px] border border-tg-border/20 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-[15px] font-bold font-mono text-tg-text">/{exp.id}</span>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${BADGE_STYLES[exp.status]}`}
                  >
                    {exp.status === 'coming-soon' ? 'Pronto' : exp.status}
                  </span>
                </div>
                <p className="text-[12px] text-tg-hint leading-relaxed mb-3">{exp.description}</p>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-tg-surface/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-tg-hint">{progress}%</span>
                </div>

                {/* Try button */}
                <button
                  onClick={() => {
                    haptic?.impactOccurred('light');
                    if (exp.status !== 'coming-soon') {
                      navigate(`/users/ui/${userId}/bot-commands/${exp.id}`);
                    }
                  }}
                  disabled={exp.status === 'coming-soon'}
                  className={`w-full py-2.5 rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    exp.status === 'coming-soon'
                      ? 'bg-tg-surface/20 text-tg-hint/40 cursor-not-allowed'
                      : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                  }`}
                >
                  {exp.status === 'coming-soon' ? (
                    <>Próximamente</>
                  ) : (
                    <>
                      <Zap size={13} /> Probar
                    </>
                  )}
                </button>
              </div>
            </div>
          ); })}
        </div>
      </section>
    </div>
  );
}
