'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/actions/auth';

const navItems = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/subscriptions', label: '구독 관리' },
];

interface SidebarProps {
  userEmail: string;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ userEmail, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* 로고 */}
        <div className="flex h-14 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            SubTrack AI
          </Link>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 유저 정보 + 로그아웃 */}
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 text-sm text-gray-600 hover:text-gray-900"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
