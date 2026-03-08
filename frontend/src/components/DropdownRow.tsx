import { useState, useRef, useEffect } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const { haptic } = useTelegram();

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`tm-row cursor-pointer relative ${open ? 'z-50' : 'z-10'}`} onClick={() => { setOpen(!open); haptic?.impactOccurred('soft'); }}>      <div className="flex-1 min-w-0">
      <div className="text-[15px] text-tg-text">{label}</div>
    </div>
      <div className="text-[14px] text-tg-accent flex-shrink-0">{selectedLabel}</div>
      {open && (
        <div className="tm-dropdown-menu" onClick={(e) => e.stopPropagation()}>
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`tm-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                haptic?.selectionChanged();
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
