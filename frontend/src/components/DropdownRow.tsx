import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownRowProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function DropdownRow({ label, options, value, onChange }: DropdownRowProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { haptic } = useTelegram();

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const toggle = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const width = 192; // 48 rem (w-48)

    // Calculamos la posición protegiendo los bordes de la pantalla (min 16px de margen)
    setPos({
      top: rect.bottom + 6,
      left: Math.max(16, rect.right - width),
    });

    setOpen((prev) => !prev);
    haptic?.impactOccurred('soft');
  };

  // useEffect(() => {
  //   return () => {
  //     if (open) {
  //       document.body.style.overflow = 'hidden';
  //     } else {
  //       document.body.style.overflow = '';
  //     }
  //   };
  // }, [open]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      {/* ── Row Principal ── */}
      <button
        ref={buttonRef}
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors bg-transparent group"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[15px] text-tg-text leading-tight group-active:opacity-80 transition-opacity">
            {label}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[15px] font-medium text-tg-hint group-active:opacity-80 transition-opacity">
            {selectedLabel}
          </span>
          <ChevronDown
            size={16}
            className={`text-tg-hint/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* ── Menú Flotante (Portal) ── */}
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed w-48 rounded-[16px] bg-tg-secondary/85 backdrop-blur-xl border border-tg-border/40 shadow-2xl p-1.5 z-[9999] animate-scale-in origin-top-right"
        >
          <div className="flex flex-col max-h-[260px] overflow-y-auto no-scrollbar">
            {options.map((opt) => {
              const selected = opt.value === value;

              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    haptic?.selectionChanged();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-[14px] font-semibold transition-colors active:scale-[0.98] ${selected
                      ? 'bg-tg-accent/10 text-tg-accent'
                      : 'text-tg-text hover:bg-tg-hint/10 active:bg-tg-hint/15'
                    }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {selected && <Check size={16} strokeWidth={2.5} className="animate-scale-in" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}