import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

type InputVariant = 'default' | 'error';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: InputVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    variant,
    leftIcon,
    rightIcon,
    containerClassName,
    className,
    id,
    ...props
  },
  ref
) {
  // Derive variant from error presence if not explicitly set
  const resolvedVariant: InputVariant = variant ?? (error ? 'error' : 'default');
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={clsx('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#1E0A3C]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1E0A3C] placeholder-gray-400',
            'transition-colors duration-150 outline-none',
            'focus:ring-2 focus:ring-offset-0',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            resolvedVariant === 'error'
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-gray-200 focus:border-[#8B3FD4] focus:ring-[#8B3FD4]/20',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            className
          )}
          aria-invalid={resolvedVariant === 'error' ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />

        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
            {rightIcon}
          </span>
        )}
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

export default Input;
