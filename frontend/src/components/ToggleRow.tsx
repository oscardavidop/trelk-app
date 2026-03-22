import { useTelegram } from '../hooks/useTelegram';

interface ToggleRowProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleRow({ label, description, enabled, onChange }: ToggleRowProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic?.impactOccurred('light');
    onChange(!enabled);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-between p-4 text-left cursor-pointer active:bg-tg-hint/10 transition-colors bg-transparent group"
      role="switch"
      aria-checked={enabled}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-[15px] text-tg-text leading-tight group-active:opacity-80 transition-opacity">
          {label}
        </div>
        {description && (
          <div className="text-[13px] font-medium text-tg-hint/80 mt-0.5 leading-snug group-active:opacity-80 transition-opacity">
            {description}
          </div>
        )}
      </div>
      
      {/* ── Toggle Switch Nativo de Tailwind ── */}
      <div
        className={`flex-shrink-0 w-[46px] h-[26px] rounded-full p-1 transition-colors duration-300 ease-in-out relative ${
          enabled ? 'bg-tg-accent' : 'bg-tg-hint/30'
        }`}
      >
        <div
          className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}