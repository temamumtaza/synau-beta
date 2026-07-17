/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexQuery } from '@/lib/convex-server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonView } from '@/features/lessons/lesson-view';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  // Single aggregated query — replaces 4-8 sequential HTTP round-trips and the
  // sequential per-chapter prev/next scan. Kept fresh (no revalidate) because
  // lesson status (pending/generating/ready) is time-sensitive.
  const page = await convexQuery<any>('lessons:getLessonPage', { id: lessonId });
  if (!page) notFound();

  const { lesson, course, chapter } = page;

  return (
    <div className="space-y-8">
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Kursus
      </Link>

      <LessonView
        lessonId={lessonId}
        courseId={courseId}
        lessonTitle={lesson.title}
        lessonObjective={lesson.objective}
        courseTitle={course?.title ?? ''}
        courseDifficulty={course?.difficulty ?? 'beginner'}
        chapterTitle={chapter?.title ?? ''}
        prevLessonId={page.prevLessonId ?? undefined}
        nextLessonId={page.nextLessonId ?? undefined}
        existingContent={page.content}
        existingCitations={page.citations ?? []}
        lqsScore={lesson.lqs}
        initialStatus={lesson.status}
      />
    </div>
  );
}
