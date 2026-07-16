/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mastra } from '@/mastra';
import { z } from 'zod';
import { convexQuery, convexMutation } from '@/lib/convex-server';

const generateLessonSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  lessonObjective: z.string(),
  courseTitle: z.string(),
  courseDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  chapterTitle: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const { lessonId } = parsed.data;

    // Ambil lesson dari Convex untuk dapat course & chapter context
    const lesson = await convexQuery<any>('lessons.getById', { id: lessonId });
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Set status generating
    await convexMutation('lessons:setGenerating', { id: lessonId });

    // Jalankan lesson workflow
    const workflow = mastra.getWorkflow('lessonWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({ inputData: parsed.data });

    // Extract output dari step terakhir
    const steps = (result as any).steps ?? {};
    const finalStep = steps.citeLesson ?? Object.values(steps).pop();
    const output = finalStep?.output ?? {};

    const lessonContent = output.lessonContent;
    const citations = output.citations ?? [];
    const lqsScore = output.lqsScore ?? 0;

    if (!lessonContent) {
      await convexMutation('lessons:setFailed', { id: lessonId });
      throw new Error('Workflow did not produce lesson content');
    }

    // Persist ke Convex
    await convexMutation('lessons:setReady', { id: lessonId, lqs: lqsScore });

    await convexMutation('lessons:saveContent', {
      lessonId,
      objective: lessonContent.objective ?? parsed.data.lessonObjective,
      explanation: lessonContent.explanation,
      examples: lessonContent.examples ?? [],
      summary: lessonContent.summary ?? '',
      keyPoints: lessonContent.keyPoints ?? [],
      version: 1,
    });

    if (citations.length > 0) {
      await convexMutation('lessons:saveCitations', {
        lessonId,
        citations: citations.map((c: any) => {
          const entry: Record<string, unknown> = {
            title: c.title,
            publisher: c.publisher,
            url: c.url,
            confidenceScore: c.confidenceScore ?? 0.5,
            sourceRank: c.sourceRank ?? 8,
            citation: c.citation,
          };
          if (typeof c.accessedAt === 'string' && c.accessedAt) {
            entry.accessedAt = c.accessedAt;
          }
          return entry;
        }),
      });
    }

    return NextResponse.json(
      { data: { lessonId, lessonContent, citations, lqsScore } },
      { status: 200 }
    );
  } catch (err) {
    console.error('[POST /api/lessons] error:', err);
    return NextResponse.json(
      { error: 'Lesson generation failed', message: (err as Error).message },
      { status: 500 }
    );
  }
}
