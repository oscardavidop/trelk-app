import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function Select<T extends string>({
    options,
    value,
    onChange,
    searchable = false,
    placeholder,
    searchPlaceholder,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
    searchable?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
}) {
    const { t } = useTranslation('ui');
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedPlaceholder = placeholder ?? t('select');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search');

    // Efecto para cerrar el select si el usuario hace clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Limpiar el término de búsqueda y enfocar el input cuando se abre
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            if (searchable && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    }, [isOpen, searchable]);

    // Filtrar las opciones basado en el término de búsqueda
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(lowerSearchTerm)
        );
    }, [options, searchTerm]);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
            
            {/* ── Botón principal (Trigger) ── */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between rounded-[14px] px-4 py-3.5 text-[14px] font-medium outline-none transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isOpen 
                      ? 'bg-tg-text/[0.01] border-tg-accent/50 shadow-inner' 
                      : 'bg-tg-text/[0.03] border-tg-border/30 hover:bg-tg-text/[0.05]'
                } border ${!selectedOption ? 'text-tg-hint' : 'text-tg-text'}`}
            >
                <span className="truncate pr-2">
                    {selectedOption ? selectedOption.label : resolvedPlaceholder}
                </span>

                <ChevronDown 
                  size={16} 
                  strokeWidth={2.5}
                  className={`flex-shrink-0 text-tg-hint transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-tg-accent' : ''
                  }`} 
                />
            </button>

            {/* ── Menú desplegable ── */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-tg-secondary border border-tg-border/50 rounded-[16px] shadow-lg overflow-hidden flex flex-col animate-fade-in">
                    
                    {/* Campo de búsqueda opcional */}
                    {searchable && (
                        <div className="p-2 border-b border-tg-border/30 bg-tg-text/[0.02]">
                            <div className="relative flex items-center bg-tg-text/[0.03] border border-tg-border/30 rounded-[10px] focus-within:border-tg-accent/40 transition-colors">
                                <Search size={14} className="absolute left-3 text-tg-hint" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full pl-9 pr-8 py-2.5 bg-transparent text-tg-text text-[13px] outline-none placeholder:text-tg-hint/60"
                                    placeholder={resolvedSearchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                                        className="absolute right-2.5 w-5 h-5 rounded-full bg-tg-text/[0.08] flex items-center justify-center text-tg-text hover:bg-tg-text/[0.15] active:scale-90 transition-all"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lista de opciones */}
                    <ul className="max-h-60 overflow-y-auto py-1.5 no-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <li
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`mx-1.5 my-0.5 px-3.5 py-2.5 rounded-[10px] text-[14px] cursor-pointer flex items-center justify-between transition-colors active:scale-[0.98] ${
                                            isSelected 
                                              ? 'bg-tg-accent/10 text-tg-accent font-extrabold' 
                                              : 'text-tg-text font-medium hover:bg-tg-text/[0.04]'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && (
                                            <Check size={16} strokeWidth={3} className="flex-shrink-0 text-tg-accent ml-2" />
                                        )}
                                    </li>
                                );
                            })
                        ) : (
                            <li className="px-4 py-6 text-[13px] font-medium text-center text-tg-hint">
                                No se encontraron resultados
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}