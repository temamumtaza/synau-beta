import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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
  args: { id: v.id('lessons'), lqs: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'ready',
      lqs: args.lqs,
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
    explanation: v.string(),
    examples: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
      })
    ),
    summary: v.string(),
    keyPoints: v.array(v.string()),
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
