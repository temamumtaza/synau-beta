/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexQuery } from '@/lib/convex-server';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Clock,
  CheckCircle,
  TrendingUp,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  PageHeader,
  SectionLabel,
  EmptyState,
  StatCard,
  LoadingState,
} from '@/components/layout/primitives';

const difficultyLabel: Record<string, string> = {
  beginner: 'Pemula',
  intermediate: 'Menengah',
  advanced: 'Mahir',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const convexUser = await convexQuery<any>('users:getByEmail', {
    email: session.user.email,
  });

  if (!convexUser) {
    return <LoadingState message="Sinkronisasi akun… Sign out lalu sign in lagi jika berlarut." />;
  }

  // Single aggregated query — replaces ~32 sequential HTTP round-trips.
  // Short revalidate: course list / lesson stats change slowly; 10s staleness
  // is imperceptible but makes back/forward navigation near-instant.
  const rawCourses =
    (await convexQuery<any[]>('courses:listWithStats', {
      userId: convexUser._id,
    }, { revalidate: 10, tags: [`dashboard:${convexUser._id}`] })) ?? [];

  const coursesWithProgress = rawCourses.map((course) => ({
    id: course._id,
    title: course.title,
    difficulty: course.difficulty,
    progress: course.progress,
    lastActivity: course.lastActivityAt
      ? new Date(course.lastActivityAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        })
      : null,
    totalLessons: course.totalLessons,
    completedLessons: course.completedLessons,
  }));

  const inProgressCourse = coursesWithProgress.find(
    (c) => c.progress > 0 && c.progress < 100
  );
  const totalCompleted = coursesWithProgress.reduce(
    (a, c) => a + c.completedLessons,
    0
  );
  const avgProgress = coursesWithProgress.length
    ? Math.round(
        coursesWithProgress.reduce((a, c) => a + c.progress, 0) /
          coursesWithProgress.length
      )
    : 0;

  return (
    <div className="space-y-12">
      <PageHeader
        title={`Selamat datang, ${session.user.name?.split(' ')[0] ?? 'Murid'}`}
        description="Lanjutkan belajar atau mulai kursus baru."
      />

      {/* Empty state */}
      {coursesWithProgress.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada kursus"
          description="Buat kursus pertamamu — AI akan merancang roadmap lengkap dan lesson pertamamu."
          action={
            <Button render={<Link href="/dashboard/courses/new" />}>
              <Plus className="mr-1.5 h-4 w-4" />
              Buat Kursus
            </Button>
          }
        />
      ) : (
        <>
          {/* Continue learning hero */}
          {inProgressCourse && (
            <section className="space-y-4">
              <SectionLabel>Lanjutkan Belajar</SectionLabel>
              <Card className="shadow-none">
                <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {difficultyLabel[inProgressCourse.difficulty] ??
                          inProgressCourse.difficulty}
                      </span>
                      {inProgressCourse.lastActivity && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {inProgressCourse.lastActivity}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {inProgressCourse.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {inProgressCourse.completedLessons} dari{' '}
                      {inProgressCourse.totalLessons} pelajaran selesai
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={inProgressCourse.progress}
                        className="h-1.5 max-w-xs"
                      />
                      <span className="text-sm font-medium tabular-nums">
                        {inProgressCourse.progress}%
                      </span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    render={
                      <Link
                        href={`/dashboard/courses/${inProgressCourse.id}`}
                      />
                    }
                  >
                    Lanjutkan
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Active courses */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Kursus Aktif</SectionLabel>
              <span className="text-xs text-muted-foreground">
                {coursesWithProgress.length} kursus
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coursesWithProgress.map((course) => (
                <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                  <Card className="group h-full shadow-none transition-colors hover:border-foreground/30">
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground/70">
                          {course.title.charAt(0).toUpperCase()}
                        </span>
                        {course.lastActivity && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {course.lastActivity}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-foreground">
                        {course.title}
                      </h3>
                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {course.completedLessons}/{course.totalLessons}
                          </span>
                          <span className="font-medium tabular-nums">
                            {course.progress}%
                          </span>
                        </div>
                        <Progress value={course.progress} className="h-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Summary stats */}
      <section className="space-y-4">
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={BookOpen}
            value={coursesWithProgress.length}
            label="Kursus Aktif"
          />
          <StatCard
            icon={CheckCircle}
            value={totalCompleted}
            label="Lesson Siap"
          />
          <StatCard icon={TrendingUp} value={`${avgProgress}%`} label="Rata-rata Progress" />
        </div>
      </section>
    </div>
  );
}
