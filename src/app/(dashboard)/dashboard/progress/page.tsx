/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  BookOpen,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { convexQuery } from '@/lib/convex-server';
import {
  PageHeader,
  SectionLabel,
  EmptyState,
  StatCard,
  LoadingState,
} from '@/components/layout/primitives';

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const convexUser = await convexQuery<any>('users:getByEmail', {
    email: session.user.email,
  });

  if (!convexUser) {
    return <LoadingState message="Memuat data pengguna…" />;
  }

  const progressList =
    (await convexQuery<any[]>('progress.listByUser', {
      userId: convexUser._id,
    })) ?? [];

  const coursesData = await Promise.all(
    progressList.map(async (p) => {
      const course = await convexQuery<any>('courses.getById', {
        id: p.courseId,
      });
      const chapters = (await convexQuery<any[]>('chapters.listByCourse', {
        courseId: p.courseId,
      })) ?? [];
      let totalLessons = 0;
      let completedLessons = 0;
      for (const ch of chapters) {
        const lessons = (await convexQuery<any[]>('lessons.listByChapter', {
          chapterId: ch._id,
        })) ?? [];
        totalLessons += lessons.length;
        completedLessons += lessons.filter(
          (l) => l.status === 'ready'
        ).length;
      }
      const mastery =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      return {
        id: course?._id,
        title: course?.title ?? 'Untitled',
        mastery,
        completedLessons,
        totalLessons,
        timeSpentHours: Math.round(((p.totalTimeMinutes ?? 0) / 60) * 10) / 10,
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
    <div className="space-y-12">
      <PageHeader
        title="Progress Belajar"
        description="Pantau perkembangan dan identifikasi area yang perlu ditingkatkan."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          value={`${overallMastery}%`}
          label="Mastery Score"
        />
        <StatCard
          icon={CheckCircle}
          value={totalCompleted}
          label="Lesson Siap"
        />
        <StatCard
          icon={BookOpen}
          value={coursesData.length}
          label="Kursus Aktif"
        />
        <StatCard icon={TrendingUp} value={`${totalTime}j`} label="Total Waktu" />
      </div>

      {/* Per-course */}
      {coursesData.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada progress"
          description="Buat kursus pertamamu untuk mulai melacak progress belajar."
        />
      ) : (
        <section className="space-y-4">
          <SectionLabel>Progress per Kursus</SectionLabel>
          <div className="space-y-3">
            {coursesData.map((course) => (
              <Card key={course.id} className="shadow-none">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{course.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {course.mastery}%
                    </span>
                  </div>
                  <Progress value={course.mastery} className="h-1.5" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
