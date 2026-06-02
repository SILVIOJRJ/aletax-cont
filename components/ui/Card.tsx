import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Card({ title, description, children, className, headerClassName }: CardProps) {
  const hasHeader = title || description;

  return (
    <div
      className={clsx(
        'rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100',
        className
      )}
    >
      {hasHeader && (
        <div className={clsx('mb-4', headerClassName)}>
          {title && (
            <h3 className="text-base font-semibold leading-6 text-[#1E0A3C]">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
