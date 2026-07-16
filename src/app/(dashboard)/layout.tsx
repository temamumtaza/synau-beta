import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">
            synau
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-black">
              Dashboard
            </Link>
            <Link href="/dashboard/courses/new" className="hover:text-black">
              New Course
            </Link>
            <Link href="/dashboard/progress" className="hover:text-black">
              Progress
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-700">{session.user.name}</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/signout"
              className="text-sm text-gray-500 hover:text-black"
            >
              Sign out
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
