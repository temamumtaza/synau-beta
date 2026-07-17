import Link from 'next/link';
import { ArrowLeft, CheckCircle, Circle, CircleDot, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TreeNode {
  _id: string;
  title: string;
  status?: string;
  order: number;
  lessons: {
    _id: string;
    title: string;
    status: string;
    order: number;
  }[];
}

export function LessonSidebar({
  courseTitle,
  courseId,
  difficulty,
  tree,
  activeLessonId,
}: {
  courseTitle: string;
  courseId: string;
  difficulty?: string;
  tree: TreeNode[];
  activeLessonId: string;
}) {
  const totalLessons = tree.reduce((a, c) => a + c.lessons.length, 0);

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r bg-sidebar">
      {/* Course header — escape back to course detail (global shell) */}
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="flex items-center gap-3 border-b px-4 py-4 transition-colors hover:bg-secondary/50"
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {courseTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {difficulty ? `${difficulty} · ` : ''}
            {totalLessons} lesson
          </p>
        </div>
      </Link>

      {/* Course tree */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {tree.map((chapter, ci) => (
          <div key={chapter._id} className="space-y-0.5">
            <p className="flex items-center gap-2 px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground/80 uppercase">
              <span className="tabular-nums">{String(ci + 1).padStart(2, '0')}</span>
              <span className="truncate">{chapter.title}</span>
            </p>
            {chapter.lessons
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((lesson) => {
                const isActive = lesson._id === activeLessonId;
                const isReady = lesson.status === 'ready';
                const isPending = lesson.status === 'pending';
                const isGenerating = lesson.status === 'generating';
                const available = isPending || isReady;

                const Icon = isActive
                  ? CircleDot
                  : isReady
                    ? CheckCircle
                    : isGenerating
                      ? Clock
                      : Circle;

                const inner = (
                  <span
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-secondary font-medium text-foreground'
                        : available
                          ? 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                          : 'text-muted-foreground/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        isActive
                          ? 'text-foreground'
                          : isReady
                            ? 'text-foreground/60'
                            : 'text-muted-foreground/60'
                      )}
                    />
                    <span className="truncate">{lesson.title}</span>
                    {!available && !isGenerating && (
                      <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/40" />
                    )}
                  </span>
                );

                return available ? (
                  <Link
                    key={lesson._id}
                    href={`/dashboard/courses/${courseId}/lessons/${lesson._id}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={lesson._id} className="cursor-default">
                    {inner}
                  </div>
                );
              })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
