import { ReactNode } from 'react';
import { clsx } from 'clsx';

type StatsCardVariant = 'purple' | 'red' | 'green' | 'blue' | 'yellow';

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: StatsCardVariant;
  className?: string;
}

const variantConfig: Record<
  StatsCardVariant,
  { icon: string; badge: string; value: string }
> = {
  purple: {
    icon: 'bg-[#F3EAFE] text-[#8B3FD4]',
    badge: 'bg-[#F3EAFE] text-[#8B3FD4]',
    value: 'text-[#1E0A3C]',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    badge: 'bg-red-50 text-red-600',
    value: 'text-red-700',
  },
  green: {
    icon: 'bg-green-50 text-green-600',
    badge: 'bg-green-50 text-green-600',
    value: 'text-green-700',
  },
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    badge: 'bg-blue-50 text-blue-600',
    value: 'text-blue-700',
  },
  yellow: {
    icon: 'bg-yellow-50 text-yellow-600',
    badge: 'bg-yellow-50 text-yellow-600',
    value: 'text-yellow-700',
  },
};

export function StatsCard({
  icon,
  title,
  value,
  subtitle,
  variant = 'purple',
  className,
}: StatsCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={clsx(
        'flex items-start gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100',
        className
      )}
    >
      <div
        className={clsx(
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
          config.icon
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-500">{title}</p>
        <p className={clsx('mt-0.5 text-2xl font-bold leading-tight', config.value)}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 truncate text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
