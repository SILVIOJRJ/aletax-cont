'use client';

import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Receipt,
  UserCog,
  BarChart3,
} from 'lucide-react';

type UserRole = 'admin' | 'funcionario';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  modulo: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',          path: '/dashboard',       icon: <LayoutDashboard className="h-5 w-5" />, modulo: 'dashboard' },
  { label: 'Clientes',           path: '/clientes',        icon: <Users className="h-5 w-5" />,          modulo: 'clientes' },
  { label: 'Contratos',          path: '/contratos',       icon: <FileText className="h-5 w-5" />,       modulo: 'contratos' },
  { label: 'Ordens de Serviço',  path: '/ordens-servico',  icon: <ClipboardList className="h-5 w-5" />,  modulo: 'ordens-servico' },
  { label: 'Boletos',            path: '/boletos',         icon: <Receipt className="h-5 w-5" />,        modulo: 'boletos' },
  { label: 'Usuários',           path: '/usuarios',        icon: <UserCog className="h-5 w-5" />,        modulo: 'usuarios' },
  { label: 'Relatórios',         path: '/relatorios',      icon: <BarChart3 className="h-5 w-5" />,      modulo: 'relatorios' },
];

interface SidebarProps {
  userRole: UserRole;
  modulos: string[];
  currentPath: string;
  /** Called when overlay is clicked (mobile close) */
  onClose?: () => void;
}

function canSeeModule(
  modulo: string,
  userRole: UserRole,
  modulos: string[]
): boolean {
  if (userRole === 'admin') return true;
  return modulos.includes(modulo);
}

export function Sidebar({ userRole, modulos, currentPath, onClose }: SidebarProps) {
  const visibleItems = NAV_ITEMS.filter((item) =>
    canSeeModule(item.modulo, userRole, modulos)
  );

  return (
    <aside className="flex h-full w-64 flex-col bg-[#1E0A3C]">
      {/* Logo */}
      <div className="flex h-16 flex-shrink-0 items-center px-5">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <Image
              src="/logo-cont.png"
              alt="ALETAX CONT"
              fill
              className="object-contain"
              onError={(e) => {
                // Hide broken image; fallback text is shown below
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-base font-bold tracking-wide text-white">
            ALETAX CONT
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path !== '/dashboard' && currentPath.startsWith(item.path));

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-[#8B3FD4] text-white shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={clsx(
                      'flex-shrink-0',
                      isActive ? 'text-white' : 'text-white/60'
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-4">
        <div className="h-px bg-white/10" />
        <p className="mt-3 text-center text-[10px] text-white/30">
          &copy; {new Date().getFullYear()} Aletax
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
