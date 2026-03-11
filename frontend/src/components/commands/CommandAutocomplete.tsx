import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug } from '../../data/botCommands';
import type { BotCommand } from '../../data/botCommands';

/** Fuzzy-ish search: prefix match on all aliases */
function getSuggestions(input: string, limit = 6): BotCommand[] {
  const q = input.replace(/^\//, '').toLowerCase().trim();
  if (!q) return [];
  return BOT_COMMANDS.filter((cmd) =>
    cmd.name.some((alias) => alias.toLowerCase().includes(q)),
  ).slice(0, limit);
}

interface CommandAutocompleteProps {
  onSelect: (cmd: BotCommand) => void;
  placeholder?: string;
}

export default function CommandAutocomplete({ onSelect, placeholder }: CommandAutocompleteProps) {
  const { t } = useTranslation('commandDetail');
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => getSuggestions(value), [value]);

  useEffect(() => { setActiveIdx(0); }, [suggestions]);

  const select = useCallback((cmd: BotCommand) => {
    setValue('');
    setOpen(false);
    onSelect(cmd);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); select(suggestions[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-tg-hint/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t('type_a_command')}
          className="w-full bg-tg-secondary border border-tg-border/20 rounded-[14px] py-3 pl-11 pr-4 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none focus:border-tg-accent/40 transition-colors"
        />
        {value && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setValue(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-tg-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-tg-secondary rounded-[16px] border border-tg-border/20 shadow-xl shadow-black/20 overflow-hidden max-h-[280px] overflow-y-auto">
          <div className="px-3.5 py-2">
            <span className="text-[10px] font-bold text-tg-hint uppercase ">{t('suggestions')}</span>
          </div>
          {suggestions.map((cmd, i) => {
            const slug = cmdSlug(cmd);
            const cat = CATEGORY_META[cmd.category];
            const CatIcon = cat?.icon;
            return (
              <button
                key={slug}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(cmd)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  i === activeIdx ? 'bg-tg-surface/40' : 'hover:bg-tg-surface/20'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cat?.color}15` }}
                >
                  {CatIcon && <CatIcon size={15} style={{ color: cat?.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-tg-text font-mono">/{slug}</div>
                  <div className="text-[11px] text-tg-hint truncate">{cmd.description}</div>
                </div>
                {i === activeIdx && (
                  <span className="text-[10px] text-tg-hint/50 flex-shrink-0">↵</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
