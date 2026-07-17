import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByChapter = query({
  args: { chapterId: v.id('chapters') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('lessons')
      .withIndex('by_chapter_order', (q) => q.eq('chapterId', args.chapterId))
      .order('asc')
      .collect();
  },
});

export const getById = query({
  args: { id: v.id('lessons') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getContentByLesson = query({
  args: { lessonId: v.id('lessons') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('lessonContents')
      .withIndex('by_lesson', (q) => q.eq('lessonId', args.lessonId))
      .order('desc')
      .first();
  },
});

export const getCitationsByLesson = query({
  args: { lessonId: v.id('lessons') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('citations')
      .withIndex('by_lesson', (q) => q.eq('lessonId', args.lessonId))
      .collect();
  },
});

// Lesson page: returns lesson + course + chapter + (optional) content &
// citations + prev/next lesson ids in a single query. Replaces 4-8 sequential
// round-trips and removes the sequential per-chapter prev/next scan.
export const getLessonPage = query({
  args: { lessonId: v.id('lessons') },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;

    const [course, chapter, chapters, allLessons] = await Promise.all([
      ctx.db.get(lesson.courseId),
      ctx.db.get(lesson.chapterId),
      ctx.db
        .query('chapters')
        .withIndex('by_course_order', (q) =>
          q.eq('courseId', lesson.courseId)
        )
        .take(100),
      ctx.db
        .query('lessons')
        .withIndex('by_course', (q) => q.eq('courseId', lesson.courseId))
        .take(500),
    ]);

    // Flatten all lessons in chapter->order sequence to compute prev/next.
    const lessonsByChapter = new Map<string, typeof allLessons>();
    for (const l of allLessons) {
      const arr = lessonsByChapter.get(l.chapterId);
      if (arr) arr.push(l);
      else lessonsByChapter.set(l.chapterId, [l]);
    }
    const orderedLessonIds: string[] = [];
    for (const ch of chapters) {
      const ls = (lessonsByChapter.get(ch._id) ?? []).sort(
        (a, b) => a.order - b.order
      );
      for (const l of ls) orderedLessonIds.push(l._id);
    }
    const currentIdx = orderedLessonIds.indexOf(lesson._id);
    const prevLessonId =
      currentIdx > 0 ? orderedLessonIds[currentIdx - 1] : null;
    const nextLessonId =
      currentIdx >= 0 && currentIdx < orderedLessonIds.length - 1
        ? orderedLessonIds[currentIdx + 1]
        : null;

    let content: Doc<'lessonContents'> | null = null;
    let citations: Doc<'citations'>[] = [];
    if (lesson.status === 'ready') {
      const [contentDoc, citationDocs] = await Promise.all([
        ctx.db
          .query('lessonContents')
          .withIndex('by_lesson', (q) => q.eq('lessonId', lesson._id))
          .order('desc')
          .first(),
        ctx.db
          .query('citations')
          .withIndex('by_lesson', (q) => q.eq('lessonId', lesson._id))
          .take(50),
      ]);
      content = contentDoc;
      citations = citationDocs;
    }

    return {
      lesson,
      course,
      chapter,
      content,
      citations,
      prevLessonId,
      nextLessonId,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const createMany = mutation({
  args: {
    lessons: v.array(
      v.object({
        chapterId: v.id('chapters'),
        courseId: v.id('courses'),
        title: v.string(),
        objective: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const lesson of args.lessons) {
      const id = await ctx.db.insert('lessons', {
        ...lesson,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const setGenerating = mutation({
  args: { id: v.id('lessons') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'generating',
      updatedAt: Date.now(),
    });
  },
});

export const setReady = mutation({
  args: { id: v.id('lessons') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'ready',
      updatedAt: Date.now(),
    });
  },
});

export const setFailed = mutation({
  args: { id: v.id('lessons') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'failed',
      updatedAt: Date.now(),
    });
  },
});

export const saveContent = mutation({
  args: {
    lessonId: v.id('lessons'),
    objective: v.string(),
    // Dynamic blocks (primary content shape). Mutually tolerant with the
    // legacy flat fields below — at least one representation is expected.
    blocks: v.optional(
      v.array(
        v.union(
          v.object({
            type: v.literal('text'),
            title: v.optional(v.string()),
            content: v.string(),
          }),
          v.object({
            type: v.literal('definition'),
            term: v.string(),
            content: v.string(),
          }),
          v.object({
            type: v.literal('example'),
            title: v.optional(v.string()),
            content: v.string(),
          }),
          v.object({
            type: v.literal('analogy'),
            content: v.string(),
          }),
          v.object({
            type: v.literal('steps'),
            title: v.optional(v.string()),
            steps: v.array(v.string()),
          }),
          v.object({
            type: v.literal('table'),
            title: v.optional(v.string()),
            headers: v.array(v.string()),
            rows: v.array(v.array(v.string())),
          }),
          v.object({
            type: v.literal('code'),
            language: v.optional(v.string()),
            content: v.string(),
            caption: v.optional(v.string()),
          }),
          v.object({
            type: v.literal('callout'),
            variant: v.union(
              v.literal('info'),
              v.literal('tip'),
              v.literal('warning'),
              v.literal('success')
            ),
            title: v.optional(v.string()),
            content: v.string(),
          }),
          v.object({
            type: v.literal('quote'),
            content: v.string(),
            attribution: v.optional(v.string()),
          }),
          v.object({
            type: v.literal('keyPoints'),
            title: v.optional(v.string()),
            points: v.array(v.string()),
          }),
          v.object({
            type: v.literal('summary'),
            content: v.string(),
          })
        )
      )
    ),
    // Legacy flat fields (optional — for back-compat only).
    explanation: v.optional(v.string()),
    examples: v.optional(
      v.array(
        v.object({
          title: v.string(),
          content: v.string(),
        })
      )
    ),
    summary: v.optional(v.string()),
    keyPoints: v.optional(v.array(v.string())),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('lessonContents', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const saveCitations = mutation({
  args: {
    lessonId: v.id('lessons'),
    citations: v.array(
      v.object({
        title: v.string(),
        publisher: v.string(),
        url: v.string(),
        accessedAt: v.optional(v.string()),
        confidenceScore: v.number(),
        sourceRank: v.number(),
        citation: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const citation of args.citations) {
      await ctx.db.insert('citations', {
        lessonId: args.lessonId,
        ...citation,
        createdAt: now,
      });
    }
  },
});
