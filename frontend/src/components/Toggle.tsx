import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { BRAND } from '../design';

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
      className={`relative w-[42px] h-[26px] rounded-full flex-shrink-0 transition-colors duration-200 ${enabled ? 'bg-tg-accent' : 'bg-tg-hint/40'}`}
      role="switch"
      aria-checked={enabled}
    >
      <motion.div
        className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm"
        animate={{ x: enabled ? 19 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
