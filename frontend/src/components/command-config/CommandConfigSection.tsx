import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { staggerItem } from '../../design';

interface CommandConfigSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function CommandConfigSection({ title, description, children }: CommandConfigSectionProps) {
  return (
    <motion.section variants={staggerItem} className="mb-5">
      <div className="flex items-center gap-2 mb-2.5 pl-1">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">{title}</h2>
        {description && (
          <span className="text-[11px] text-tg-hint/50 font-medium">· {description}</span>
        )}
      </div>
      <div className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 overflow-hidden shadow-sm divide-y divide-tg-border/15">
        {children}
      </div>
    </motion.section>
  );
}
