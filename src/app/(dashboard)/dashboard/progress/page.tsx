/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, BookOpen, Target, AlertCircle } from 'lucide-react';
import { convexQuery } from '@/lib/convex-server';

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const convexUser = await convexQuery<any>('users:getByEmail', {
    email: session.user.email,
  });

  if (!convexUser) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Memuat data pengguna...</p>
      </div>
    );
  }

  const progressList = await convexQuery<any[]>('progress.listByUser', {
    userId: convexUser._id,
  });

  // Ambil course info + chapter/lesson counts per progress
  const coursesData = await Promise.all(
    (progressList ?? []).map(async (p) => {
      const course = await convexQuery<any>('courses.getById', {
        id: p.courseId,
      });
      const chapters = await convexQuery<any[]>('chapters.listByCourse', {
        courseId: p.courseId,
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
      const mastery =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // Cari weak topics dari lesson yang LQS-nya rendah
      const weakLessons: string[] = [];
      for (const ch of chapters ?? []) {
        const lessons = await convexQuery<any[]>('lessons.listByChapter', {
          chapterId: ch._id,
        });
        for (const l of lessons ?? []) {
          if (l.status === 'ready' && (l.lqs ?? 100) < 90) {
            weakLessons.push(l.title);
          }
        }
      }

      return {
        id: course?._id,
        title: course?.title ?? 'Untitled',
        mastery,
        completedLessons,
        totalLessons,
        weakTopics: weakLessons.slice(0, 5),
        timeSpentHours: Math.round((p.totalTimeMinutes ?? 0) / 60 * 10) / 10,
      };
    })
  );

  const overallMastery =
    coursesData.length > 0
      ? Math.round(
          coursesData.reduce((a, c) => a + c.mastery, 0) / coursesData.length
        )
      : 0;
  const totalCompleted = coursesData.reduce(
    (a, c) => a + c.completedLessons,
    0
  );
  const totalTime = coursesData.reduce((a, c) => a + c.timeSpentHours, 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress Belajar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pantau perkembangan dan identifikasi area yang perlu ditingkatkan
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <Target className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{overallMastery}%</p>
              <p className="text-xs text-gray-500">Mastery Score</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalCompleted}</p>
              <p className="text-xs text-gray-500">Lesson Siap</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <BookOpen className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{coursesData.length}</p>
              <p className="text-xs text-gray-500">Kursus Aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <TrendingUp className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalTime}j</p>
              <p className="text-xs text-gray-500">Total Waktu</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-course progress */}
      {coursesData.length === 0 ? (
        <Card className="border border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-600">Belum ada progress</p>
            <p className="mt-1 text-sm text-gray-400">
              Buat kursus pertamamu untuk mulai melacak progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">
            Progress per Kursus
          </h2>
          <div className="space-y-4">
            {coursesData.map((course) => (
              <Card key={course.id} className="border border-gray-200">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </p>
                    </div>
                    <span className="text-lg font-semibold">
                      {course.mastery}%
                    </span>
                  </div>
                  <Progress value={course.mastery} className="h-1.5" />

                  {course.weakTopics.length > 0 && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <AlertCircle className="h-3 w-3" />
                        Topik dengan LQS rendah
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {course.weakTopics.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="border-gray-300 text-xs font-normal text-gray-600"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
