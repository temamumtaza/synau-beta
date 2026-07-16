'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface LessonContentData {
  objective: string;
  explanation: string;
  examples: { title: string; content: string }[];
  summary: string;
  keyPoints: string[];
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
  const [content, setContent] = useState<LessonContentData | null>(existingContent);
  const [citations, setCitations] = useState<CitationData[]>(existingCitations);
  const [lqsScore, setLqsScore] = useState<number | null>(initialLqs);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const generateLesson = async () => {
    setIsLoading(true);
    setError(null);

    const steps = [
      'Riset referensi...',
      'Memverifikasi sumber...',
      'Membuat konten...',
      'Mengecek fakta...',
      'Evaluasi kualitas (LQS)...',
    ];

    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setLoadingStep(steps[stepIdx]);
      }
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

  // Empty state — lesson not yet generated
  if (!content && !isLoading) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <BookOpen className="mb-4 h-10 w-10 text-gray-200" />
        <h2 className="text-lg font-semibold">{lessonTitle}</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">{lessonObjective}</p>
        {error && (
          <div className="mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Button className="mt-8" onClick={generateLesson}>
          {initialStatus === 'pending' ? 'Generate Lesson' : 'Generate Ulang'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Loader2 className="mb-6 h-8 w-8 animate-spin text-black" />
        <p className="text-base font-medium">{loadingStep}</p>
        <p className="mt-1 text-sm text-gray-400">
          AI sedang menyiapkan materi berkualitas tinggi...
        </p>
      </div>
    );
  }

  // Lesson content view
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span>{chapterTitle}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Lesson</span>
          {lqsScore !== null && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                LQS {lqsScore}/100
              </span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{lessonTitle}</h1>
        <p className="text-sm text-gray-500">
          <span className="font-medium">Tujuan:</span>{' '}
          {content!.objective ?? lessonObjective}
        </p>
      </div>

      {/* Main explanation */}
      <div className="prose prose-sm prose-gray max-w-none">
        <div
          className="whitespace-pre-wrap leading-7 text-gray-800"
          dangerouslySetInnerHTML={{
            __html: content!.explanation.replace(/\n/g, '<br />'),
          }}
        />
      </div>

      {/* Examples */}
      {content!.examples.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
            Contoh
          </h2>
          {content!.examples.map((ex, i) => (
            <Card key={i} className="border border-gray-200">
              <CardContent className="p-5">
                <p className="mb-2 font-medium">{ex.title}</p>
                <div
                  className="whitespace-pre-wrap text-sm leading-6 text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: ex.content.replace(/\n/g, '<br />'),
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card className="border border-gray-900 bg-gray-50">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
            Ringkasan
          </p>
          <p className="text-sm leading-6 text-gray-800">{content!.summary}</p>
          {content!.keyPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {content!.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-black" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
            Referensi ({citations.length})
          </h2>
          <div className="space-y-2">
            {citations.map((cite, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-gray-100 px-4 py-3"
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 font-mono text-xs"
                >
                  [{i + 1}]
                </Badge>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">{cite.title}</p>
                  <p className="text-xs text-gray-400">{cite.publisher}</p>
                  <p className="text-xs italic text-gray-400">{cite.citation}</p>
                </div>
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-gray-400 hover:text-black"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {prevLessonId && (
            <Button variant="outline" render={
              <a href={`/dashboard/courses/${courseId}/lessons/${prevLessonId}`} />
            }>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Sebelumnya
            </Button>
          )}
        </div>
        <Button
          onClick={() => {
            setIsCompleted(true);
            toast.success('Lesson diselesaikan!');
            setTimeout(() => {
              if (nextLessonId) {
                window.location.href = `/dashboard/courses/${courseId}/lessons/${nextLessonId}`;
              } else {
                window.location.href = `/dashboard/courses/${courseId}`;
              }
            }, 800);
          }}
          disabled={isCompleted}
        >
          {isCompleted ? (
            <CheckCircle className="mr-2 h-4 w-4" />
          ) : (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
          {nextLessonId ? 'Lesson Berikutnya' : 'Selesai'}
        </Button>
      </div>
    </div>
  );
}
