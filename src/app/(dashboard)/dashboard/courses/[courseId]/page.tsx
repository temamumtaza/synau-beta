/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, CheckCircle, Clock, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { convexQuery } from '@/lib/convex-server';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await convexQuery<any>('courses.getById', { id: courseId });
  if (!course) notFound();

  const roadmap = await convexQuery<any>('roadmaps.getByCourse', { courseId });
  const chapters = await convexQuery<any[]>('chapters.listByCourse', { courseId });

  // Ambil lessons per chapter
  const chaptersWithLessons = await Promise.all(
    (chapters ?? []).map(async (ch) => {
      const lessons = await convexQuery<any[]>('lessons.listByChapter', {
        chapterId: ch._id,
      });
      return { ...ch, lessons: lessons ?? [] };
    })
  );

  const totalLessons = chaptersWithLessons.reduce(
    (a, c) => a + c.lessons.length,
    0
  );
  const completedLessons = chaptersWithLessons.reduce(
    (a, c) => a + c.lessons.filter((l: any) => l.status === 'ready').length,
    0
  );
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Cari lesson pertama yang available (status pending atau ready)
  let nextLesson: { id: string; chapterId: string } | null = null;
  for (const ch of chaptersWithLessons) {
    const available = ch.lessons.find(
      (l: any) => l.status === 'pending' || l.status === 'ready'
    );
    if (available) {
      nextLesson = { id: available._id, chapterId: ch._id };
      break;
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft className="h-3 w-3" />
          Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{course.difficulty}</Badge>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {course.estimatedDuration}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm text-gray-500">{course.goal}</p>
          </div>
          {nextLesson && (
            <Button
              render={
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}
                />
              }
            >
              {completedLessons > 0 ? 'Lanjutkan' : 'Mulai Belajar'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalLessons > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {completedLessons} dari {totalLessons} lesson siap
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Prerequisites */}
      {course.prerequisites?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Prasyarat:</span>
          {course.prerequisites.map((p: string) => (
            <Badge key={p} variant="outline">
              {p}
            </Badge>
          ))}
        </div>
      )}

      {/* Empty state: belum ada chapter */}
      {chaptersWithLessons.length === 0 && (
        <Card className="border border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-4 h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-600">Roadmap sedang disiapkan</p>
            <p className="mt-1 text-sm text-gray-400">
              Refresh halaman ini dalam beberapa saat.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chapters + Lessons */}
      <div className="space-y-4">
        {chaptersWithLessons.map((chapter, ci) => (
          <Card
            key={chapter._id}
            className={`border ${
              chapter.status === 'locked' ? 'opacity-50' : 'border-gray-200'
            }`}
          >
            <CardContent className="p-0">
              {/* Chapter header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold">
                  {ci + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{chapter.title}</p>
                  <p className="text-xs text-gray-500">{chapter.description}</p>
                </div>
                {chapter.status === 'locked' && (
                  <Lock className="h-4 w-4 text-gray-300" />
                )}
                {chapter.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-black" />
                )}
              </div>

              {/* Lessons list */}
              {chapter.lessons.length === 0 ? (
                <div className="px-5 py-4 text-xs text-gray-400">
                  Belum ada lesson dibuat untuk chapter ini.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {chapter.lessons.map((lesson: any, li: number) => {
                    const isReady = lesson.status === 'ready';
                    const isPending = lesson.status === 'pending';
                    const isGenerating = lesson.status === 'generating';

                    return (
                      <li key={lesson._id}>
                        {isPending || isReady ? (
                          <Link
                            href={`/dashboard/courses/${courseId}/lessons/${lesson._id}`}
                            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50"
                          >
                            {isReady ? (
                              <CheckCircle className="h-4 w-4 text-black" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-black" />
                            )}
                            <span
                              className={`text-sm ${
                                isReady ? 'text-gray-800' : 'text-gray-700'
                              }`}
                            >
                              {li + 1}. {lesson.title}
                            </span>
                            {isPending && (
                              <span className="ml-auto text-xs text-gray-400">
                                Klik untuk generate
                              </span>
                            )}
                            {isReady && (
                              <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-3.5">
                            {isGenerating ? (
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                            ) : (
                              <Lock className="h-3 w-3 text-gray-300" />
                            )}
                            <span className="text-sm text-gray-400">
                              {li + 1}. {lesson.title}
                            </span>
                            {isGenerating && (
                              <span className="ml-auto text-xs text-gray-400">
                                Generating...
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

      {/* Roadmap info */}
      {roadmap?.approvedAt && (
        <p className="text-center text-xs text-gray-400">
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
