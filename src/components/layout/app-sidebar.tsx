'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Plus, LineChart, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/progress', label: 'Progress', icon: LineChart },
];

export function AppSidebar({ userName }: { userName: string | null | undefined }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight"
        >
          synau
        </Link>
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
          v0.1
        </span>
      </div>

      {/* Primary CTA */}
      <div className="px-3 pt-3">
        <Button
          size="lg"
          className="w-full justify-start"
          render={<Link href="/dashboard/courses/new" />}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Kursus Baru
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="px-2 pb-1.5 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
          Belajar
        </p>
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName ?? 'Murid'}</p>
            <p className="truncate text-xs text-muted-foreground">Akun</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="Keluar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
