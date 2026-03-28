import type { ReactNode } from 'react';

interface CommandConfigSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function CommandConfigSection({ title, description, children }: CommandConfigSectionProps) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2.5 pl-1">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">{title}</h2>
        {description && (
          <span className="text-[11px] text-tg-hint/50 font-medium">· {description}</span>
        )}
      </div>
      <div className="rounded-[18px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm divide-y divide-tg-border/20">
        {children}
      </div>
    </section>
  );
}
