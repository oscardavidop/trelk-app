import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import type { LucideIcon } from 'lucide-react';

interface MenuRowProps {
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
  icon?: LucideIcon;
  iconBg?: string;
  value?: string;
}

export default function MenuRow({ label, description, to, onClick, rightContent, destructive, icon: Icon, iconBg, value }: MenuRowProps) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic?.impactOccurred('soft');
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`tm-row ${to ? 'tm-row-link' : ''} cursor-pointer z-10`}
      onClick={handleClick}
    >
      {Icon && (
        <div className="tm-menu-icon">
          <Icon className="text-white" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] ${destructive ? 'text-tg-destructive' : 'text-tg-text'}`}>
          {label}
        </div>
       
        {description && (
          <div className="text-[13px] text-tg-hint mt-0.5">{description}</div>
        )}
      </div>
       {value && (
          <div className="text-[13px] text-tg-hint mt-0.5">{value}</div>
        )}
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
    </motion.div>
  );
}
