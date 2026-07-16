import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Queries ──────────────────────────────────────────────────────────────

export const getByUserCourse = query({
  args: { userId: v.id('users'), courseId: v.id('courses') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('progress')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', args.userId).eq('courseId', args.courseId)
      )
      .first();
  },
});

export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('progress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const init = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('progress')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', args.userId).eq('courseId', args.courseId)
      )
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert('progress', {
      userId: args.userId,
      courseId: args.courseId,
      lessonsCompleted: [],
      chaptersCompleted: [],
      totalTimeMinutes: 0,
      masteryScore: 0,
      weakTopics: [],
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeLesson = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    lessonId: v.id('lessons'),
    timeSpentMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query('progress')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', args.userId).eq('courseId', args.courseId)
      )
      .first();

    if (!progress) return;

    const lessonsCompleted = [
      ...new Set([...progress.lessonsCompleted, args.lessonId]),
    ];

    const now = Date.now();
    await ctx.db.patch(progress._id, {
      lessonsCompleted,
      totalTimeMinutes: progress.totalTimeMinutes + args.timeSpentMinutes,
      lastActivityAt: now,
      updatedAt: now,
    });
  },
});

export const updateMastery = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    masteryScore: v.number(),
    weakTopics: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query('progress')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', args.userId).eq('courseId', args.courseId)
      )
      .first();

    if (!progress) return;

    const now = Date.now();
    await ctx.db.patch(progress._id, {
      masteryScore: args.masteryScore,
      weakTopics: args.weakTopics,
      lastActivityAt: now,
      updatedAt: now,
    });
  },
});

export const setCurrentLesson = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    lessonId: v.id('lessons'),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query('progress')
      .withIndex('by_user_course', (q) =>
        q.eq('userId', args.userId).eq('courseId', args.courseId)
      )
      .first();

    if (!progress) return;

    await ctx.db.patch(progress._id, {
      currentLessonId: args.lessonId,
      lastActivityAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
