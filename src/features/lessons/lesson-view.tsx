'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Star,
  CheckCircle,
  Loader2,
  BookOpen,
  Target,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuizView } from '@/features/quiz/quiz-view';
import { SectionLabel } from '@/components/layout/primitives';
import { LessonBlocks, type LessonBlockData } from '@/features/lessons/lesson-blocks';

interface LessonContentData {
  objective?: string;
  blocks?: LessonBlockData[];
  // Legacy flat fields (pre-migration documents). Renderer synthesizes
  // blocks from these when `blocks` is absent.
  explanation?: string;
  examples?: { title: string; content: string }[];
  summary?: string;
  keyPoints?: string[];
}

/** Convert any lesson content (blocks-based or legacy) into renderable blocks. */
function toBlocks(content: LessonContentData): LessonBlockData[] {
  if (content.blocks && content.blocks.length > 0) return content.blocks;
  // Legacy fallback — rebuild the old section order from flat fields.
  const blocks: LessonBlockData[] = [];
  if (content.explanation) blocks.push({ type: 'text', content: content.explanation });
  for (const ex of content.examples ?? []) {
    blocks.push({ type: 'example', title: ex.title, content: ex.content });
  }
  if (content.keyPoints && content.keyPoints.length > 0) {
    blocks.push({ type: 'keyPoints', points: content.keyPoints });
  }
  if (content.summary) blocks.push({ type: 'summary', content: content.summary });
  return blocks;
}

interface CitationData {
  title: string;
  publisher: string;
  url: string;
  sourceRank: number;
  confidenceScore: number;
  citation: string;
}

interface LessonViewProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  lessonObjective: string;
  courseTitle: string;
  courseDifficulty: 'beginner' | 'intermediate' | 'advanced';
  chapterTitle: string;
  nextLessonId?: string;
  prevLessonId?: string;
  existingContent: LessonContentData | null;
  existingCitations: CitationData[];
  lqsScore: number | null;
  initialStatus: string;
}

export function LessonView({
  lessonId,
  courseId,
  lessonTitle,
  lessonObjective,
  courseTitle,
  courseDifficulty,
  chapterTitle,
  nextLessonId,
  prevLessonId,
  existingContent,
  existingCitations,
  lqsScore: initialLqs,
  initialStatus,
}: LessonViewProps) {
  const router = useRouter();
  const [content, setContent] = useState<LessonContentData | null>(
    existingContent
  );
  const [citations, setCitations] = useState<CitationData[]>(existingCitations);
  const [lqsScore, setLqsScore] = useState<number | null>(initialLqs);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const generateLesson = async () => {
    setIsLoading(true);
    setError(null);

    const steps = [
      'Riset referensi…',
      'Memverifikasi sumber…',
      'Membuat konten…',
      'Mengecek fakta…',
    ];

    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) setLoadingStep(steps[stepIdx]);
    }, 5000);

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          lessonTitle,
          lessonObjective,
          courseTitle,
          courseDifficulty,
          chapterTitle,
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Gagal generate lesson');
      }

      const result = await res.json();
      const data = result.data;
      setContent(data.lessonContent);
      setCitations(data.citations ?? []);
      setLqsScore(data.lqsScore ?? null);
      toast.success('Lesson berhasil dibuat!');
    } catch (err) {
      clearInterval(interval);
      setError((err as Error).message);
      toast.error('Gagal membuat lesson');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    toast.success('Lesson diselesaikan!');
    setTimeout(() => {
      if (nextLessonId) {
        router.push(
          `/dashboard/courses/${courseId}/lessons/${nextLessonId}`
        );
      } else {
        router.push(`/dashboard/courses/${courseId}`);
      }
    }, 600);
  };

  // Empty state — lesson not yet generated
  if (!content && !isLoading) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{lessonTitle}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {lessonObjective}
        </p>
        {error && (
          <div className="mt-5 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button size="lg" className="mt-8" onClick={generateLesson}>
          {initialStatus === 'pending' ? 'Generate Lesson' : 'Generate Ulang'}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <Loader2 className="mb-6 h-8 w-8 animate-spin text-foreground" />
        <p className="text-base font-medium">{loadingStep}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          AI sedang menyiapkan materi berkualitas tinggi…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{chapterTitle}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Lesson</span>
          {lqsScore !== null && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="h-3 w-3 fill-current" />
                LQS {lqsScore}/100
              </span>
            </>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{lessonTitle}</h1>
        {content!.objective && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Target className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{content!.objective ?? lessonObjective}</span>
          </p>
        )}
      </header>

      {/* Dynamic content blocks (or legacy fields, normalized to blocks) */}
      <LessonBlocks blocks={toBlocks(content!)} />

      {/* Citations */}
      {citations.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Referensi ({citations.length})</SectionLabel>
          <div className="space-y-2">
            {citations.map((cite, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:border-foreground/30"
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 font-mono text-xs font-normal"
                >
                  [{i + 1}]
                </Badge>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium">{cite.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {cite.publisher}
                  </p>
                  {cite.citation && (
                    <p className="text-xs text-muted-foreground italic">
                      {cite.citation}
                    </p>
                  )}
                </div>
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Check — inline quiz */}
      {showQuiz ? (
        <section className="space-y-4">
          <Separator />
          <QuizView
            sourceId={lessonId}
            sourceType="lesson"
            courseId={courseId}
            courseTitle={courseTitle}
            lessonContent={content}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground/70">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cek Pemahaman</p>
                <p className="text-xs text-muted-foreground">
                  5 pertanyaan · nilai lulus ≥60%
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowQuiz(true)}>
              Mulai Kuis
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Prev / Next nav */}
      <div className="flex items-center justify-between border-t pt-6">
        <div>
          {prevLessonId && (
            <Button
              variant="ghost"
              size="lg"
              render={
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${prevLessonId}`}
                />
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Sebelumnya
            </Button>
          )}
        </div>
        <Button size="lg" onClick={handleComplete} disabled={isCompleted}>
          {isCompleted ? (
            <CheckCircle className="mr-1.5 h-4 w-4" />
          ) : null}
          {nextLessonId ? 'Lesson Berikutnya' : 'Selesai'}
          {!isCompleted && <ChevronRight className="ml-1.5 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
