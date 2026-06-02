import { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    options,
    placeholder,
    containerClassName,
    className,
    id,
    ...props
  },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#1E0A3C]">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-[#1E0A3C]',
            'transition-colors duration-150 outline-none',
            'focus:ring-2 focus:ring-offset-0',
            hasError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-gray-200 focus:border-[#8B3FD4] focus:ring-[#8B3FD4]/20',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            className
          )}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Select;
