import { useToastStore } from '../stores';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast() {
  const { message, type, visible } = useToastStore();

  // Si no hay mensaje, no renderizamos nada
  if (!message) return null;

  // Configuración visual basada en el tipo de Toast
  const getToastConfig = () => {
    switch (type) {
      case 'error':
        return { icon: AlertCircle, iconColor: 'text-red-400' };
      case 'success':
        return { icon: CheckCircle2, iconColor: 'text-emerald-400' };
      default: // 'info' o 'surface'
        return { icon: Info, iconColor: 'text-blue-400' };
    }
  };

  const { icon: Icon, iconColor } = getToastConfig();

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <div
        className={`
          flex items-center gap-3 px-4 py-3 max-w-sm w-max
          bg-black/80 backdrop-blur-xl border border-white/10
          rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)]
          transition-all duration-300 ease-out
          ${visible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-6 scale-95'
          }
        `}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <span className="text-[14.5px] font-medium text-white/95 leading-snug ">
          {message}
        </span>
      </div>
    </div>
  );
}