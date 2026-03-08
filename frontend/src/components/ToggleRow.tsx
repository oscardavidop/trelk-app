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
    <div className="tm-row cursor-pointer" onClick={handleClick}>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-tg-text">{label}</div>
        {description && (
          <div className="text-[13px] text-tg-hint mt-0.5">{description}</div>
        )}
      </div>
      <div
        className={`tm-toggle ${enabled ? 'on' : ''}`}
        role="switch"
        aria-checked={enabled}
      />
    </div>
  );
}
