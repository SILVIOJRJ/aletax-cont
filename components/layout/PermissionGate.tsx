import { ReactNode } from 'react';

type UserRole = 'admin' | 'funcionario';

interface PermissionGateProps {
  /** The module slug to check access for */
  modulo: string;
  userRole: UserRole;
  userModulos: string[];
  children: ReactNode;
  /** If true, renders a "Sem permissão" message instead of null when access is denied */
  showDenied?: boolean;
}

/**
 * Renders `children` only when the user has access to `modulo`.
 * Admins always have access. Funcionários need `modulo` in their `userModulos` list.
 */
export function PermissionGate({
  modulo,
  userRole,
  userModulos,
  children,
  showDenied = false,
}: PermissionGateProps) {
  const hasAccess =
    userRole === 'admin' || userModulos.includes(modulo);

  if (!hasAccess) {
    if (showDenied) {
      return (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-10 text-sm text-gray-400">
          Sem permissão para acessar este módulo.
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

export default PermissionGate;
