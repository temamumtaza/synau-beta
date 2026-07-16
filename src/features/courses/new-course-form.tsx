'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Loader2, BookOpen, Zap, Target } from 'lucide-react';

const newCourseSchema = z.object({
  goal: z.string().min(3, 'Masukkan tujuan belajarmu').max(500),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

type NewCourseFormData = z.infer<typeof newCourseSchema>;

const exampleGoals = [
  'Belajar Kubernetes dari dasar',
  'Kuasai React dan Next.js',
  'Pahami Machine Learning untuk pemula',
  'Belajar sistem desain dan arsitektur software',
];

type Step = 'form' | 'generating' | 'reviewing' | 'done';

const generationSteps = [
  { id: 'planning', label: 'Merancang roadmap...', icon: Target },
  { id: 'reviewing', label: 'Mengulas kurikulum...', icon: BookOpen },
  { id: 'researching', label: 'Riset materi pelajaran 1...', icon: Zap },
  { id: 'generating', label: 'Menghasilkan konten lesson...', icon: BookOpen },
  { id: 'validating', label: 'Validasi kualitas (LQS)...', icon: Target },
];

export function NewCourseForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [currentGenStep, setCurrentGenStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<NewCourseFormData>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: {
      goal: '',
      difficulty: 'beginner',
    },
  });

  const onSubmit = async (data: NewCourseFormData) => {
    setError(null);
    setStep('generating');

    // Simulate step progress while API call runs
    let stepInterval: ReturnType<typeof setInterval> | null = null;
    let stepIdx = 0;
    stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < generationSteps.length) {
        setCurrentGenStep(stepIdx);
      } else {
        if (stepInterval) clearInterval(stepInterval);
      }
    }, 4000);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (stepInterval) clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Gagal membuat kursus');
      }

      const result = await res.json();
      const courseId = result?.data?.courseId;
      const firstLessonId = result?.data?.firstLessonId;

      if (!courseId) {
        throw new Error('Tidak menerima course ID dari server');
      }

      setStep('done');
      setTimeout(() => {
        if (firstLessonId) {
          router.push(`/dashboard/courses/${courseId}/lessons/${firstLessonId}`);
        } else {
          router.push(`/dashboard/courses/${courseId}`);
        }
        router.refresh();
      }, 1000);
    } catch (err) {
      if (stepInterval) clearInterval(stepInterval);
      setError((err as Error).message);
      setStep('form');
      setCurrentGenStep(0);
    }
  };

  if (step === 'generating' || step === 'done') {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-8 space-y-4">
          {generationSteps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentGenStep;
            const isDone = i < currentGenStep || step === 'done';

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                  isActive
                    ? 'bg-black text-white'
                    : isDone
                    ? 'text-gray-400 line-through'
                    : 'text-gray-300'
                }`}
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-sm">{s.label}</span>
              </div>
            );
          })}
        </div>
        {step === 'done' && (
          <p className="text-sm text-gray-500">Mengarahkan ke kursus...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Goal input */}
        <div className="space-y-2">
          <Label htmlFor="goal" className="text-base font-medium">
            Apa yang ingin kamu pelajari?
          </Label>
          <p className="text-sm text-gray-500">
            Jelaskan tujuanmu — AI akan merancang kurikulum lengkap untukmu.
          </p>
          <Input
            id="goal"
            placeholder="Contoh: Belajar Kubernetes dari dasar sampai bisa deploy production"
            className="h-12 text-base"
            {...form.register('goal')}
          />
          {form.formState.errors.goal && (
            <p className="text-sm text-red-500">
              {form.formState.errors.goal.message}
            </p>
          )}
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Tingkat Kesulitan</Label>
          <Tabs
            defaultValue="beginner"
            onValueChange={(v) =>
              form.setValue(
                'difficulty',
                v as 'beginner' | 'intermediate' | 'advanced'
              )
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="beginner">Pemula</TabsTrigger>
              <TabsTrigger value="intermediate">Menengah</TabsTrigger>
              <TabsTrigger value="advanced">Mahir</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Buat Kursus dengan AI
        </Button>
      </form>

      {/* Example goals */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Contoh tujuan belajar
        </p>
        <div className="flex flex-wrap gap-2">
          {exampleGoals.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => form.setValue('goal', goal)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-black hover:text-black"
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
