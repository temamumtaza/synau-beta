/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexQuery } from '@/lib/convex-server';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, CheckCircle, TrendingUp, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';

const difficultyVariant: Record<string, 'outline' | 'secondary' | 'default'> = {
  beginner: 'outline',
  intermediate: 'secondary',
  advanced: 'default',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  // Ambil user dari Convex
  const convexUser = await convexQuery<any>('users:getByEmail', {
    email: session.user.email,
  });

  if (!convexUser) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">
          Sinkronisasi akun... Sign out lalu sign in lagi jika berlarut.
        </p>
      </div>
    );
  }

  // Ambil courses aktif
  const activeCourses = await convexQuery<any[]>('courses:listActiveByUser', {
    userId: convexUser._id,
  });

  // Ambil progress untuk setiap course
  const coursesWithProgress = await Promise.all(
    (activeCourses ?? []).map(async (course) => {
      const progress = await convexQuery<any>('progress.getByUserCourse', {
        userId: convexUser._id,
        courseId: course._id,
      });
      const chapters = await convexQuery<any[]>('chapters.listByCourse', {
        courseId: course._id,
      });
      let totalLessons = 0;
      let completedLessons = 0;
      for (const ch of chapters ?? []) {
        const lessons = await convexQuery<any[]>('lessons.listByChapter', {
          chapterId: ch._id,
        });
        totalLessons += (lessons ?? []).length;
        completedLessons += (lessons ?? []).filter(
          (l) => l.status === 'ready'
        ).length;
      }
      const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const lastActivity = progress?.lastActivityAt
        ? new Date(progress.lastActivityAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          })
        : null;
      return {
        id: course._id,
        title: course.title,
        difficulty: course.difficulty,
        progress: progressPct,
        lastActivity,
        totalLessons,
        completedLessons,
      };
    })
  );

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
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Selamat datang, {session.user.name?.split(' ')[0] ?? 'Murid'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Lanjutkan belajar atau mulai kursus baru
          </p>
        </div>
        <Button render={<Link href="/dashboard/courses/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Kursus Baru
        </Button>
      </div>

      {/* Continue Learning */}
      {inProgressCourse && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">
            Lanjutkan Belajar
          </h2>
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    {inProgressCourse.difficulty}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {inProgressCourse.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {inProgressCourse.completedLessons} dari{' '}
                    {inProgressCourse.totalLessons} pelajaran selesai
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/dashboard/courses/${inProgressCourse.id}`} />}
                >
                  Lanjutkan
                </Button>
              </div>
              <div className="mt-4 space-y-1">
                <Progress value={inProgressCourse.progress} className="h-1.5" />
                <p className="text-right text-xs text-gray-400">
                  {inProgressCourse.progress}%
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Active Courses */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
            Kursus Aktif
          </h2>
          <span className="text-sm text-gray-400">
            {coursesWithProgress.length} kursus
          </span>
        </div>

        {coursesWithProgress.length === 0 ? (
          <Card className="border border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-4 h-8 w-8 text-gray-300" />
              <p className="font-medium text-gray-600">Belum ada kursus</p>
              <p className="mt-1 text-sm text-gray-400">
                Buat kursus pertamamu dengan AI
              </p>
              <Button className="mt-6" render={<Link href="/dashboard/courses/new" />}>
                <Plus className="mr-2 h-4 w-4" />
                Buat Kursus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coursesWithProgress.map((course) => (
              <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                <Card className="group cursor-pointer border border-gray-200 transition-colors hover:border-gray-400">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <Badge variant={difficultyVariant[course.difficulty] ?? 'outline'}>
                        {course.difficulty}
                      </Badge>
                      {course.lastActivity && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {course.lastActivity}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold leading-snug group-hover:underline">
                      {course.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {course.completedLessons}/{course.totalLessons} lessons
                      </span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="mt-2 h-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Summary */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">
          Ringkasan
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <BookOpen className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{coursesWithProgress.length}</p>
                  <p className="text-xs text-gray-500">Kursus Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalCompleted}</p>
                  <p className="text-xs text-gray-500">Lesson Siap</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgProgress}%</p>
                  <p className="text-xs text-gray-500">Rata-rata Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
