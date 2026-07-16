import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mastra } from '@/mastra';
import { z } from 'zod';

const quizSchema = z.object({
  sourceId: z.string(),
  sourceType: z.enum(['lesson', 'chapter', 'final']),
  content: z.any(),
  courseTitle: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = quizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const workflow = mastra.getWorkflow('quizWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: {
        sourceId: parsed.data.sourceId,
        sourceType: parsed.data.sourceType,
        content: parsed.data.content,
        courseTitle: parsed.data.courseTitle,
      },
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/quiz] workflow error:', err);
    return NextResponse.json(
      { error: 'Quiz workflow failed', message: (err as Error).message },
      { status: 500 }
    );
  }
}
