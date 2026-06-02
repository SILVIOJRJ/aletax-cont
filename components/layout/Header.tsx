'use client';

import { Menu, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

type UserRole = 'admin' | 'funcionario';

interface HeaderProps {
  userName: string;
  userRole: UserRole;
  onMenuClick: () => void;
}

const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  funcionario: 'Funcionário',
};

export function Header({ userName, userRole, onMenuClick }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm">
      {/* Left: hamburger (mobile only) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Spacer on desktop so header content doesn't shift */}
        <span className="hidden lg:block" aria-hidden="true" />
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-medium text-[#1E0A3C] sm:block">
            {userName}
          </span>
          <Badge variant={userRole === 'admin' ? 'purple' : 'info'} dot>
            {roleLabel[userRole]}
          </Badge>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair"
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
