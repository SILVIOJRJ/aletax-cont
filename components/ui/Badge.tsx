import { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 ring-green-200',
  warning: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  danger:  'bg-red-100 text-red-700 ring-red-200',
  info:    'bg-blue-100 text-blue-800 ring-blue-200',
  default: 'bg-gray-100 text-gray-700 ring-gray-200',
  purple:  'bg-[#F3EAFE] text-[#8B3FD4] ring-[#ddd0f5]',
};

const dotColorClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  default: 'bg-gray-500',
  purple:  'bg-[#8B3FD4]',
};

export function Badge({ variant = 'default', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColorClasses[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
