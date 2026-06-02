'use client';

import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Pesquisar...',
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if controlled value changes externally
  useEffect(() => {
    if (isControlled) setInternalValue(controlledValue ?? '');
  }, [controlledValue, isControlled]);

  const handleChange = (raw: string) => {
    setInternalValue(raw);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange?.(raw);
    }, debounceMs);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInternalValue('');
    onChange?.('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const displayValue = isControlled ? controlledValue : internalValue;
  const hasValue = (displayValue ?? '').length > 0;

  return (
    <div className={clsx('relative', containerClassName)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <Search className="h-4 w-4" />
      </span>

      <input
        type="search"
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-9 text-sm text-[#1E0A3C] placeholder-gray-400',
          'outline-none transition-colors duration-150',
          'focus:border-[#8B3FD4] focus:ring-2 focus:ring-[#8B3FD4]/20',
          '[&::-webkit-search-cancel-button]:hidden',
          className
        )}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar pesquisa"
          className="absolute inset-y-0 right-2.5 flex items-center rounded text-gray-400 transition-colors hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
