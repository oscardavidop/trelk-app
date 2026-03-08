import { useTelegram } from '../hooks/useTelegram';

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export default function Toggle({ enabled, onChange }: ToggleProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic?.impactOccurred('light');
    onChange(!enabled);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`tm-toggle ${enabled ? 'on' : ''}`}
      role="switch"
      aria-checked={enabled}
    />
  );
}
