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

  const lesson = await convexQuery<any>('lessons.getById', { id: lessonId });
  if (!lesson) notFound();

  const course = await convexQuery<any>('courses.getById', { id: courseId });
  const chapter = await convexQuery<any>('chapters.getById', {
    id: lesson.chapterId,
  });

  // Cari prev/next lesson dalam course yang sama
  const chapters = await convexQuery<any[]>('chapters.listByCourse', { courseId });
  let prevLessonId: string | null = null;
  let nextLessonId: string | null = null;

  for (const ch of chapters ?? []) {
    const lessons = await convexQuery<any[]>('lessons.listByChapter', {
      chapterId: ch._id,
    });
    const sortedLessons = (lessons ?? []).sort((a, b) => a.order - b.order);
    const currentIdx = sortedLessons.findIndex((l) => l._id === lessonId);
    if (currentIdx >= 0) {
      if (currentIdx > 0) {
        prevLessonId = sortedLessons[currentIdx - 1]._id;
      } else {
        // Cari lesson terakhir dari chapter sebelumnya
        const chIdx = (chapters ?? []).findIndex((c) => c._id === ch._id);
        if (chIdx > 0) {
          const prevCh = (chapters ?? [])[chIdx - 1];
          const prevLessons = await convexQuery<any[]>('lessons.listByChapter', {
            chapterId: prevCh._id,
          });
          const sortedPrev = (prevLessons ?? []).sort((a, b) => a.order - b.order);
          if (sortedPrev.length > 0) {
            prevLessonId = sortedPrev[sortedPrev.length - 1]._id;
          }
        }
      }
      if (currentIdx < sortedLessons.length - 1) {
        nextLessonId = sortedLessons[currentIdx + 1]._id;
      } else {
        // Cari lesson pertama dari chapter berikutnya
        const chIdx = (chapters ?? []).findIndex((c) => c._id === ch._id);
        if (chIdx >= 0 && chIdx < (chapters ?? []).length - 1) {
          const nextCh = (chapters ?? [])[chIdx + 1];
          const nextLessons = await convexQuery<any[]>('lessons.listByChapter', {
            chapterId: nextCh._id,
          });
          const sortedNext = (nextLessons ?? []).sort((a, b) => a.order - b.order);
          if (sortedNext.length > 0) {
            nextLessonId = sortedNext[0]._id;
          }
        }
      }
      break;
    }
  }

  // Ambil lesson content jika sudah ready
  const existingContent =
    lesson.status === 'ready'
      ? await convexQuery<any>('lessons.getContentByLesson', { lessonId })
      : null;
  const existingCitations =
    lesson.status === 'ready'
      ? await convexQuery<any[]>('lessons.getCitationsByLesson', { lessonId })
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft className="h-3 w-3" />
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
        prevLessonId={prevLessonId ?? undefined}
        nextLessonId={nextLessonId ?? undefined}
        existingContent={existingContent}
        existingCitations={existingCitations ?? []}
        lqsScore={lesson.lqs}
        initialStatus={lesson.status}
      />
    </div>
  );
}
