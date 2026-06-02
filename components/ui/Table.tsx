import { ReactNode } from 'react';
import { clsx } from 'clsx';

// ---- Generic typed columns API ----
export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T = Record<string, unknown>> {
  columns?: TableColumn<T>[];
  data?: T[];
  loading?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  className?: string;
}

// Loading skeleton row
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}

export function Table<T = Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  children,
  className,
}: TableProps<T>) {
  // If children are provided, render raw table markup
  if (children) {
    return (
      <div className={clsx('overflow-x-auto rounded-xl ring-1 ring-gray-100', className)}>
        <table className="min-w-full divide-y divide-gray-100">{children}</table>
      </div>
    );
  }

  // Columns + data API
  if (!columns) return null;

  const SKELETON_ROWS = 5;

  return (
    <div className={clsx('overflow-x-auto rounded-xl ring-1 ring-gray-100', className)}>
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-[#F3EAFE]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8B3FD4]',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50 bg-white">
          {loading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : !data || data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={clsx(
                  'transition-colors hover:bg-[#F3EAFE]/40',
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                )}
              >
                {columns.map((col) => {
                  const rawValue = (row as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      className={clsx(
                        'whitespace-nowrap px-4 py-3 text-sm text-gray-700',
                        col.className
                      )}
                    >
                      {col.render ? col.render(rawValue, row) : String(rawValue ?? '-')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Named sub-components for children API
export function Thead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={clsx('bg-[#F3EAFE]', className)}>
      {children}
    </thead>
  );
}

export function Tbody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tbody className={clsx('divide-y divide-gray-50 bg-white', className)}>
      {children}
    </tbody>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={clsx(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8B3FD4]',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={clsx('whitespace-nowrap px-4 py-3 text-sm text-gray-700', className)}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  zebra = false,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  zebra?: boolean;
  index?: number;
}) {
  return (
    <tr
      className={clsx(
        'transition-colors hover:bg-[#F3EAFE]/40',
        zebra && index % 2 !== 0 ? 'bg-gray-50/50' : 'bg-white',
        className
      )}
    >
      {children}
    </tr>
  );
}

export default Table;
