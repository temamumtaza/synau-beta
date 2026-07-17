import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';

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
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar userName={session.user.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
