import type { ReactNode } from 'react';

interface CommandConfigSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function CommandConfigSection({ title, description, children }: CommandConfigSectionProps) {
  return (
    <section className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm">
      <header className="px-4 py-3.5 border-b border-tg-border/30 bg-tg-text/[0.02]">
        <h2 className="text-[15px] font-bold text-tg-text">{title}</h2>
        {description && (
          <p className="text-[12px] text-tg-hint mt-1">{description}</p>
        )}
      </header>
      <div className="divide-y divide-tg-border/20">{children}</div>
    </section>
  );
}
