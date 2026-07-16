'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ChevronRight, Loader2, Trophy, RefreshCcw } from 'lucide-react';

interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  order: number;
}

interface QuizProps {
  sourceId: string;
  sourceType: 'lesson' | 'chapter' | 'final';
  courseId: string;
  lessonContent?: unknown;
  courseTitle: string;
}

type QuizState = 'idle' | 'generating' | 'active' | 'reviewing' | 'result';

export function QuizView({
  sourceId,
  sourceType,
  courseId,
  lessonContent,
  courseTitle,
}: QuizProps) {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    weakTopics: string[];
    adaptiveContent: unknown;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questionCount =
    sourceType === 'lesson' ? 5 : sourceType === 'chapter' ? 10 : 20;
  const passingScore = sourceType === 'lesson' ? 60 : 70;

  const startQuiz = async () => {
    setQuizState('generating');
    setError(null);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          sourceType,
          content: lessonContent,
          courseTitle,
          answers: [], // no answers yet — this generates the quiz
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Gagal membuat kuis');
      }

      const data = await res.json();
      // Extract questions from workflow result
      const quiz = data?.data?.quiz;
      if (quiz?.questions) {
        setQuestions(quiz.questions);
        setCurrentQ(0);
        setAnswers({});
        setQuizState('active');
      } else {
        throw new Error('Format kuis tidak valid');
      }
    } catch (err) {
      setError((err as Error).message);
      setQuizState('idle');
    }
  };

  const selectAnswer = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
  };

  const confirmAnswer = () => {
    if (!selectedOption) return;
    const q = questions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: selectedOption }));
    setIsAnswered(true);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setQuizState('reviewing');
    const answerList = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    // Calculate score locally
    const correct = answerList.filter((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return q?.correctOptionId === a.selectedOptionId;
    }).length;

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passingScore;

    // Find weak topics from incorrect answers
    const weakTopics = answerList
      .filter((a) => {
        const q = questions.find((q) => q.id === a.questionId);
        return q?.correctOptionId !== a.selectedOptionId;
      })
      .map((a) => {
        const q = questions.find((q) => q.id === a.questionId);
        return q?.text.substring(0, 50) ?? 'Unknown';
      })
      .slice(0, 3);

    setResult({ score, passed, weakTopics, adaptiveContent: null });
    setQuizState('result');
  };

  const retryQuiz = () => {
    setQuizState('idle');
    setQuestions([]);
    setAnswers({});
    setSelectedOption(null);
    setIsAnswered(false);
    setResult(null);
    setCurrentQ(0);
  };

  // ─── Idle state ─��─────────────────────────────────────────────────────────
  if (quizState === 'idle') {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Trophy className="h-8 w-8 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold">
          {sourceType === 'lesson' ? 'Kuis Lesson' : sourceType === 'chapter' ? 'Kuis Chapter' : 'Ujian Final'}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {questionCount} pertanyaan · Nilai lulus ≥{passingScore}%
        </p>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Button className="mt-8" onClick={startQuiz}>
          Mulai Kuis
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ─── Generating state ─────────────────────────────────────────────────────
  if (quizState === 'generating' || quizState === 'reviewing') {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin" />
        <p className="text-sm text-gray-500">
          {quizState === 'generating' ? 'Membuat pertanyaan...' : 'Menilai jawaban...'}
        </p>
      </div>
    );
  }

  // ─── Active quiz ──────────────────────────────────────────────────────────
  if (quizState === 'active') {
    const q = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Pertanyaan {currentQ + 1} dari {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Question */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <p className="text-base font-medium leading-relaxed">{q.text}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isCorrect = isAnswered && opt.id === q.correctOptionId;
            const isWrong = isAnswered && isSelected && opt.id !== q.correctOptionId;

            return (
              <button
                key={opt.id}
                onClick={() => selectAnswer(opt.id)}
                disabled={isAnswered}
                className={`w-full rounded-lg border px-4 py-3.5 text-left text-sm transition-all ${
                  isCorrect
                    ? 'border-black bg-black text-white'
                    : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : isSelected
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs opacity-60">{opt.id.toUpperCase()}</span>
                  <span>{opt.text}</span>
                  {isCorrect && <CheckCircle className="ml-auto h-4 w-4 shrink-0" />}
                  {isWrong && <XCircle className="ml-auto h-4 w-4 shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation (after answering) */}
        {isAnswered && (
          <Card className="border border-gray-100 bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Penjelasan
              </p>
              <p className="mt-2 text-sm text-gray-700">{q.explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!isAnswered ? (
            <Button onClick={confirmAnswer} disabled={!selectedOption}>
              Konfirmasi Jawaban
            </Button>
          ) : (
            <Button onClick={nextQuestion}>
              {currentQ < questions.length - 1 ? (
                <>
                  Berikutnya
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                'Lihat Hasil'
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Result state ─────────────────────────────────────────────────────────
  if (quizState === 'result' && result) {
    return (
      <div className="space-y-8">
        {/* Score card */}
        <Card
          className={`border-2 ${
            result.passed ? 'border-black' : 'border-gray-300'
          }`}
        >
          <CardContent className="p-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                result.passed ? 'bg-black' : 'bg-gray-100'
              }`}
            >
              {result.passed ? (
                <Trophy className="h-8 w-8 text-white" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <p className="text-4xl font-bold">{result.score}%</p>
            <p className="mt-2 text-sm text-gray-500">
              Nilai lulus: {passingScore}%
            </p>
            <Badge
              className={`mt-3 ${
                result.passed
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              variant="outline"
            >
              {result.passed ? 'LULUS' : 'TIDAK LULUS'}
            </Badge>
          </CardContent>
        </Card>

        {/* Weak topics */}
        {!result.passed && result.weakTopics.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Topik yang perlu diperkuat:</p>
            <ul className="space-y-2">
              {result.weakTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!result.passed && (
            <Button variant="outline" onClick={retryQuiz}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          )}
          <Button
            onClick={() => {
              window.location.href = `/dashboard/courses/${courseId}`;
            }}
          >
            {result.passed ? 'Lanjut ke Lesson Berikutnya' : 'Pelajari Ulang'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
