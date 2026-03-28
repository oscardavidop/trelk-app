
import { ReactNode } from 'react';

interface StickyHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    icon?: ReactNode; // Por si queremos añadir un icono o elemento extra en el header
    border?: boolean; // Para controlar si queremos borde o no (útil para el header principal vs secciones)
}

export default function StickyHeader({ title, subtitle, children, icon, border }: StickyHeaderProps) {
    return (
        // <div className="min-h-[160px]">
        <div
            className={`sticky z-30 bg-tg-bg backdrop-blur-md ${border ? 'border-b border-tg-border/50' : ''} pb-4`}
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
                    <h1 className="text-[26px] font-extrabold text-tg-text  leading-none">{title}</h1>
                    {subtitle && <p className="text-[14px] font-medium text-tg-hint/80 mt-1">{subtitle}</p>}
                </div>
            </div>
            {children && children}
        </div>
        // </div>
    );

}

interface StickySectionHeaderProps {
    className?: string;
    subtitle?: string;
    icon?: ReactNode;
    children?: ReactNode;
    bgClass?: string; // Para controlar el fondo específico de cada sección (útil para diferenciar visualmente)
    catColor?: string; // Color específico para el gradiente de relleno, si se quiere usar
}



export function StickySectionHeader({ icon, children, className, bgClass }: StickySectionHeaderProps) {
    return (
        <div className={`sticky-header sticky z-30 ${bgClass || className || 'bg-tg-bg'} backdrop-blur-md border-b border-tg-border/50 transition-[border-color,background-color] duration-200`}
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

