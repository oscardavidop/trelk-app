
import { ReactNode } from 'react';

interface StickyHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    icon?: ReactNode; // Por si queremos añadir un icono o elemento extra en el header
}

export default function StickyHeader({ title, subtitle, children, icon }: StickyHeaderProps) {
    return (
        <div
            className="sticky z-30 bg-tg-bg backdrop-blur-md border-b border-tg-border/50 pb-4"
            style={{
                top: 'var(--tg-top-offset, var(--tg-top-offset, env(--tg-top2-offset, 0px)))'
            }}
        >
            <div className="absolute left-0 right-0 bottom-full h-[150px] bg-tg-bg backdrop-blur-md pointer-events-none z-0" />
            <div className="px-4 pt-4 flex items-center gap-3">
                {
                    icon && (
                        icon 
                    )
                }

                <div>
                    <h1 className="text-[24px] font-extrabold text-tg-text  leading-none">{title}</h1>
                    {subtitle && <p className="text-[13px] font-medium text-tg-hint/80 mt-1">{subtitle}</p>}
                </div>
            </div>
            {/* <div className="px-4 pt-4 relative z-10">
                <h1 className="text-xl font-bold text-tg-text">{title}</h1>
                {subtitle && <p className="text-xs text-tg-hint mt-0.5">{subtitle}</p>}
            </div> */}
            {children && children}
        </div>
    );

}

interface StickySectionHeaderProps {
    className?: string;
    subtitle?: string;
    icon?: ReactNode;
    children?: ReactNode;
}

export function StickySectionHeader({ icon, children, className }: StickySectionHeaderProps) {
    return (
        <div className={`sticky-header sticky z-30 ${className || 'bg-tg-bg'} backdrop-blur-md border-b border-tg-border/50 pb-3 transition-all duration-300`}
            style={{
                top: 'var(--tg-top-offset, var(--tg-top-offset, env(--tg-top2-offset, 0px)))'
            }}>
            <div className="absolute left-0 right-0 bottom-full h-[150px] bg-tg-bg backdrop-blur-md pointer-events-none z-0" />

            {
                icon && (
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        {icon}
                    </div>
                )
            }
            {children && children}
        </div>
    );
}

