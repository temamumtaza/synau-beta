/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mastra } from '@/mastra';
import { z } from 'zod';

const createCourseSchema = z.object({
  goal: z.string().min(3).max(500),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const CONVEX_SITE_URL = CONVEX_URL.replace('.cloud', '.site');

async function convexMutation(path: string, args: unknown) {
  const res = await fetch(`${CONVEX_SITE_URL}/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${path} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.value;
}

async function convexQuery(path: string, args: unknown) {
  const res = await fetch(`${CONVEX_SITE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${path} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.value;
}

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

  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { goal, difficulty } = parsed.data;

  // Ambil Convex user ID dari email
  const convexUser = (await convexQuery('users:getByEmail', {
    email: session.user.email,
  })) as { _id: string } | null;

  if (!convexUser) {
    return NextResponse.json(
      { error: 'User not found in database. Please sign out and sign in again.' },
      { status: 403 }
    );
  }

  try {
    // ─── Jalankan course generation workflow ──────────────────────────
    const workflow = mastra.getWorkflow('courseGenerationWorkflow');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { goal, difficulty },
    });

    // ─── Extract workflow output ──────────────────────────────────────
    // Mastra workflow result shape: { status, steps: { stepName: { status, output, ... } } }
    // Walk through steps to find the deepest output containing our data.
    const steps = (result as any).steps ?? {};
    const stepNames = Object.keys(steps);
    console.log('[POST /api/courses] workflow status:', (result as any).status);
    console.log('[POST /api/courses] steps:', stepNames);
    for (const name of stepNames) {
      const sd = steps[name];
      console.log(
        `[POST /api/courses] step "${name}" status=${sd?.status} hasOutput=${!!sd?.output} keys=${sd?.output ? Object.keys(sd.output).join(',') : '-'}`
      );
    }

    // The final step (buildCitations) outputs { roadmap, firstLesson, lessonContent, citations }
    // But if that step failed, walk backwards to find latest step with roadmap.
    const buildCitationsStep = steps.buildCitations;
    const output = buildCitationsStep?.output ?? {};

    const roadmap = output.roadmap;
    const firstLesson = output.firstLesson;
    const lessonContent = output.lessonContent;
    const citations = output.citations ?? [];

    if (!roadmap) {
      console.error('[POST /api/courses] No roadmap in final output. Full output:', JSON.stringify(output).substring(0, 500));
      throw new Error('Workflow finished but did not produce a roadmap. Check server logs.');
    }
    if (!lessonContent) {
      console.error('[POST /api/courses] No lessonContent in final output. Output keys:', Object.keys(output));
      throw new Error(
        'Workflow produced a roadmap but the lesson was rejected (fact check failed). Try a different goal.'
      );
    }

    // ─── Persist ke Convex ────────────────────────────────────────────
    // 1. Create course
    const courseId = (await convexMutation('courses:create', {
      userId: convexUser._id,
      title: roadmap.title,
      goal: roadmap.goal,
      difficulty: roadmap.difficulty,
      estimatedDuration: roadmap.estimatedDuration,
      prerequisites: roadmap.prerequisites ?? [],
    })) as string;

    // 2. Create roadmap
    const roadmapChapters = (roadmap.chapters ?? []).map((c: any, i: number) => ({
      id: c.id ?? `ch-${i + 1}`,
      title: c.title,
      description: c.description ?? '',
      order: c.order ?? i,
      dependsOn: c.dependsOn ?? [],
      estimatedDuration: c.estimatedDuration ?? '1 day',
    }));

    const roadmapId = (await convexMutation('roadmaps:create', {
      courseId,
      chapters: roadmapChapters,
    })) as string;

    // 3. Create chapters
    const chaptersWithConvexId = [];
    for (const ch of roadmapChapters) {
      const ids = (await convexMutation('chapters:createMany', {
        chapters: [
          {
            courseId,
            roadmapId,
            title: ch.title,
            description: ch.description,
            order: ch.order,
          },
        ],
      })) as string[];
      chaptersWithConvexId.push({ ...ch, convexId: ids[0] });
    }

    // 4. Create lessons for each chapter (with first lesson marked ready)
    let firstLessonConvexId: string | null = null;
    for (const ch of chaptersWithConvexId) {
      const originalChapter = roadmap.chapters.find((rc: any) => rc.id === ch.id);
      const lessons = originalChapter?.lessons ?? [];
      if (lessons.length === 0) continue;

      const lessonInputs = lessons.map((l: any, i: number) => ({
        chapterId: ch.convexId,
        courseId,
        title: l.title,
        objective: l.objective,
        order: l.order ?? i,
      }));

      const lessonIds = (await convexMutation('lessons:createMany', {
        lessons: lessonInputs,
      })) as string[];

      // Mark first lesson of first chapter as ready + save content
      if (firstLessonConvexId === null && lessonIds.length > 0) {
        firstLessonConvexId = lessonIds[0];
      }
    }

    // 5. Save first lesson content + citations
    if (firstLessonConvexId) {
      await convexMutation('lessons:setReady', {
        id: firstLessonConvexId,
      });

      await convexMutation('lessons:saveContent', {
        lessonId: firstLessonConvexId,
        objective: lessonContent.objective ?? firstLesson.objective,
        blocks: lessonContent.blocks ?? [],
        version: 1,
      });

      if (citations.length > 0) {
        await convexMutation('lessons:saveCitations', {
          lessonId: firstLessonConvexId,
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
    }

    // 6. Init progress
    await convexMutation('progress:init', {
      userId: convexUser._id,
      courseId,
    });

    // 7. Activate course
    await convexMutation('courses:activate', { id: courseId });

    return NextResponse.json(
      {
        data: {
          courseId,
          firstLessonId: firstLessonConvexId,
          roadmap,
          lessonContent,
          citations,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/courses] error:', err);
    return NextResponse.json(
      { error: 'Course generation failed', message: (err as Error).message },
      { status: 500 }
    );
  }
}
