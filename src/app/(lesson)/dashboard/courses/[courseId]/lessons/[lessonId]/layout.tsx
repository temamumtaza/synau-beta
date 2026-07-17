/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { convexQuery } from '@/lib/convex-server';
import { LessonSidebar, type TreeNode } from '@/components/layout/lesson-sidebar';

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { courseId, lessonId } = await params;

  const course = await convexQuery<any>('courses.getById', { id: courseId });
  if (!course) redirect('/dashboard');

  const chapters =
    (await convexQuery<any[]>('chapters.listByCourse', { courseId })) ?? [];

  const tree: TreeNode[] = await Promise.all(
    chapters.map(async (ch) => {
      const lessons =
        (await convexQuery<any[]>('lessons.listByChapter', {
          chapterId: ch._id,
        })) ?? [];
      return {
        _id: ch._id,
        title: ch.title,
        status: ch.status,
        order: ch.order,
        lessons: lessons.map((l) => ({
          _id: l._id,
          title: l.title,
          status: l.status,
          order: l.order,
        })),
      };
    })
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LessonSidebar
        courseTitle={course.title}
        courseId={courseId}
        difficulty={course.difficulty}
        tree={tree}
        activeLessonId={lessonId}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
