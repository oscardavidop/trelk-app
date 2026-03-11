import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

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
                // Pequeño timeout para asegurar que el input se ha renderizado antes de enfocarlo
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

    // Buscar la opción seleccionada para mostrar su label
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className={`relative w-auto ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
            {/* Botón principal (Trigger) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-tg-bg rounded-lg px-3 py-2 text-[15px] outline-none border transition-all duration-200 cursor-pointer ${
                    isOpen ? 'border-tg-accent shadow-sm' : 'border-tg-border hover:border-tg-text/30'
                } ${!selectedOption ? 'text-tg-hint' : 'text-tg-text'}`}
            >
                <span className="truncate pr-2">
                    {selectedOption ? selectedOption.label : resolvedPlaceholder}
                </span>

                {/* Ícono de flecha (Chevron) */}
                <svg
                    className={`w-4 h-4 flex-shrink-0 text-tg-text opacity-50 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Menú desplegable */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-tg-bg border border-tg-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">
                    
                    {/* Campo de búsqueda opcional con x para borrar */}
                    {searchable && (
                        <div className="p-2 border-b border-tg-border bg-tg-bg">
                            <div className="relative flex items-center">
                                <Search className="w-4 h-4 absolute left-2.5 text-tg-hint" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full pl-8 pr-3 py-1.5 bg-tg-bg text-tg-text text-[14px] outline-none transition-colors"
                                    placeholder={resolvedSearchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()} // Prevenir que el clic cierre el select
                                    autoComplete="off"
                                    spellCheck={false}
                                    autoFocus={!isOpen}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 text-tg-hint hover:text-tg-text transition-colors"
                                    >
                                        <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lista de opciones */}
                    <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
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
                                        className={`px-3 py-2.5 text-[15px] cursor-pointer flex items-center justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                                            isSelected ? 'text-tg-accent font-medium' : 'text-tg-text'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>

                                        {/* Ícono de Check para la opción seleccionada */}
                                        {isSelected && (
                                            <svg
                                                className="w-4 h-4 flex-shrink-0 text-tg-accent ml-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </li>
                                );
                            })
                        ) : (
                            <li className="px-3 py-4 text-[14px] text-center text-tg-hint">
                                No se encontraron resultados
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

