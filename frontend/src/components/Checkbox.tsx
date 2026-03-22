import { useTelegram } from '../hooks/useTelegram';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  isFirst?: boolean;
}

export default function Checkbox({ checked, onChange, label, description, isFirst }: CheckboxProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic?.selectionChanged();
    onChange(!checked);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3.5 p-4 text-left active:bg-tg-hint/10 transition-colors bg-transparent group ${
        isFirst ? 'rounded-t-[20px]' : ''
      }`}
      role="checkbox"
      aria-checked={checked}
    >
      {/* ── Indicador Visual del Checkbox ── */}
      <div
        className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center flex-shrink-0 transition-all duration-200 border-[1.5px] ${
          checked
            ? 'bg-tg-accent border-tg-accent shadow-sm'
            : 'border-tg-hint/40 bg-transparent group-active:border-tg-hint/60'
        }`}
      >
        <Check 
          size={14} 
          strokeWidth={3} 
          className={`text-white transition-transform duration-200 ease-out ${
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`} 
        />
      </div>

      {/* ── Textos ── */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[15px] text-tg-text leading-tight group-active:opacity-80 transition-opacity">
          {label}
        </div>
        {description && (
          <div className="text-[13px] font-medium text-tg-hint/80 mt-0.5 leading-snug group-active:opacity-80 transition-opacity">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}