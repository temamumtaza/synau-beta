/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CheckCircle,
  Clock,
  Lock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { convexQuery } from '@/lib/convex-server';
import {
  PageHeader,
  SectionLabel,
  EmptyState,
} from '@/components/layout/primitives';

const difficultyLabel: Record<string, string> = {
  beginner: 'Pemula',
  intermediate: 'Menengah',
  advanced: 'Mahir',
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // Single aggregated query — replaces 2 + N sequential HTTP round-trips.
  const detail = await convexQuery<any>('courses:getFullDetail', { id: courseId });
  if (!detail) notFound();

  const { course, roadmap } = detail;
  const chaptersWithLessons: any[] = detail.chaptersWithLessons;
  const totalLessons: number = detail.totalLessons;
  const completedLessons: number = detail.completedLessons;
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let nextLesson: { id: string } | null = null;
  for (const ch of chaptersWithLessons) {
    const available = ch.lessons.find(
      (l: any) => l.status === 'pending' || l.status === 'ready'
    );
    if (available) {
      nextLesson = { id: available._id };
      break;
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={course.title}
        description={course.goal}
        back={{ href: '/dashboard', label: 'Dashboard' }}
        action={
          nextLesson ? (
            <Button
              size="lg"
              render={
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}
                />
              }
            >
              {completedLessons > 0 ? 'Lanjutkan' : 'Mulai Belajar'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
          {difficultyLabel[course.difficulty] ?? course.difficulty}
        </span>
        {course.estimatedDuration && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {course.estimatedDuration}
          </span>
        )}
        {course.prerequisites?.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Prasyarat:</span>
            {course.prerequisites.map((p: string) => (
              <Badge key={p} variant="outline" className="font-normal">
                {p}
              </Badge>
            ))}
          </span>
        )}
      </div>

      {/* Progress */}
      {totalLessons > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedLessons} dari {totalLessons} lesson siap
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Empty state: chapters still generating */}
      {chaptersWithLessons.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Roadmap sedang disiapkan"
          description="AI sedang merancang kurikulummu. Refresh halaman ini dalam beberapa saat."
        />
      ) : (
        <section className="space-y-4">
          <SectionLabel>Kurikulum</SectionLabel>
          <div className="space-y-3">
            {chaptersWithLessons.map((chapter, ci) => (
              <Card
                key={chapter._id}
                className={`shadow-none ${chapter.status === 'locked' ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-0">
                  {/* Chapter header */}
                  <div className="flex items-center gap-3 border-b px-5 py-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold tabular-nums">
                      {ci + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">
                        {chapter.title}
                      </p>
                      {chapter.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {chapter.description}
                        </p>
                      )}
                    </div>
                    {chapter.status === 'locked' && (
                      <Lock className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    {chapter.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-foreground" />
                    )}
                  </div>

                  {/* Lessons */}
                  {chapter.lessons.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-muted-foreground">
                      Belum ada lesson dibuat untuk chapter ini.
                    </div>
                  ) : (
                    <ul>
                      {chapter.lessons.map((lesson: any, li: number) => {
                        const isReady = lesson.status === 'ready';
                        const isPending = lesson.status === 'pending';
                        const isGenerating = lesson.status === 'generating';
                        const available = isPending || isReady;

                        return (
                          <li key={lesson._id} className="border-b last:border-b-0">
                            {available ? (
                              <Link
                                href={`/dashboard/courses/${courseId}/lessons/${lesson._id}`}
                                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/50"
                              >
                                {isReady ? (
                                  <CheckCircle className="h-4 w-4 text-foreground" />
                                ) : (
                                  <span className="h-4 w-4 rounded-full border-2 border-foreground" />
                                )}
                                <span
                                  className={`text-sm ${isReady ? 'text-foreground' : 'text-foreground/80'}`}
                                >
                                  <span className="text-muted-foreground">
                                    {li + 1}.
                                  </span>{' '}
                                  {lesson.title}
                                </span>
                                {isPending && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    Klik untuk generate
                                  </span>
                                )}
                                {isReady && (
                                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                )}
                              </Link>
                            ) : (
                              <div className="flex items-center gap-3 px-5 py-3.5">
                                {isGenerating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                ) : (
                                  <Lock className="h-3 w-3 text-muted-foreground/40" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  <span className="text-muted-foreground/60">
                                    {li + 1}.
                                  </span>{' '}
                                  {lesson.title}
                                </span>
                                {isGenerating && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    Generating…
                                  </span>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Roadmap meta */}
      {roadmap?.approvedAt && (
        <p className="text-center text-xs text-muted-foreground">
          Roadmap disetujui pada{' '}
          {new Date(roadmap.approvedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}
