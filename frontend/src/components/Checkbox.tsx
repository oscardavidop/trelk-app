import { useTelegram } from '../hooks/useTelegram';

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
    <label className={`${isFirst ? '!rounded-t-none' : ''} tm-row cursor-pointer`} onClick={handleClick}>
      <div className={`tm-checkbox ${checked ? 'checked' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-tg-text">{label}</div>
        {description && (
          <div className="text-[13px] text-tg-hint mt-0.5">{description}</div>
        )}
      </div>
    </label>
  );
}
