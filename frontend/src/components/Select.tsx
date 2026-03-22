import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const resolvedPlaceholder = placeholder ?? t('select');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search');

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Posicionar dropdown (PORTAL FIX)
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();

            setDropdownStyle({
                position: 'absolute',
                top: rect.bottom + window.scrollY + 6,
                left: rect.left + window.scrollX,
                width: rect.width,
                zIndex: 9999,
            });
        }
    }, [isOpen]);

    // Focus input
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            if (searchable && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    }, [isOpen, searchable]);

    // Filtrar opciones
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lower = searchTerm.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(lower));
    }, [options, searchTerm]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <>
            <div ref={containerRef} className="relative w-full">

                {/* Trigger */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between rounded-[14px] px-4 py-3.5 text-[14px] font-medium transition-all duration-200 ${isOpen
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
                        className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-tg-accent' : 'text-tg-hint'
                            }`}
                    />
                </button>
            </div>

            {/* PORTAL DROPDOWN */}
            {isOpen && createPortal(
                <div ref={dropdownRef} style={dropdownStyle}>
                    <div className="bg-tg-secondary border border-tg-border/50 rounded-[16px] shadow-2xl overflow-hidden flex flex-col animate-fade-in">

                        {/* Search */}
                        {searchable && (
                            <div className="p-2 border-b border-tg-border/30 bg-tg-text/[0.02]">
                                <div className="relative flex items-center bg-tg-text/[0.03] border border-tg-border/30 rounded-[10px] focus-within:border-tg-accent/40">
                                    <Search size={14} className="absolute left-3 text-tg-hint" />

                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="w-full pl-9 pr-8 py-2.5 bg-transparent text-tg-text text-[13px] outline-none"
                                        placeholder={resolvedSearchPlaceholder}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        autoComplete="off"
                                    />

                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2.5 w-5 h-5 rounded-full bg-tg-text/[0.08] flex items-center justify-center"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options */}
                        <ul className="max-h-60 overflow-y-auto py-1.5">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(option => {
                                    const isSelected = value === option.value;

                                    return (
                                        <li
                                            key={option.value}
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={`mx-1.5 my-0.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer flex justify-between ${isSelected
                                                    ? 'bg-tg-accent/10 text-tg-accent font-bold'
                                                    : 'hover:bg-tg-text/[0.04]'
                                                }`}
                                        >
                                            <span>{option.label}</span>
                                            {isSelected && <Check size={16} />}
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="px-4 py-6 text-center text-tg-hint text-sm">
                                    No se encontraron resultados
                                </li>
                            )}
                        </ul>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}