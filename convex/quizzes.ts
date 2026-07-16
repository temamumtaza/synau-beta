import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Queries ──────────────────────────────────────────────────────────────

export const getByLesson = query({
  args: { lessonId: v.id('lessons') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('quizzes')
      .withIndex('by_lesson', (q) => q.eq('lessonId', args.lessonId))
      .first();
  },
});

export const getByChapter = query({
  args: { chapterId: v.id('chapters') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('quizzes')
      .withIndex('by_chapter', (q) => q.eq('chapterId', args.chapterId))
      .first();
  },
});

export const getQuestions = query({
  args: { quizId: v.id('quizzes') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', args.quizId))
      .order('asc')
      .collect();
  },
});

export const getAttemptsByUser = query({
  args: { userId: v.id('users'), quizId: v.id('quizzes') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('attempts')
      .withIndex('by_user_quiz', (q) =>
        q.eq('userId', args.userId).eq('quizId', args.quizId)
      )
      .order('desc')
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    lessonId: v.optional(v.id('lessons')),
    chapterId: v.optional(v.id('chapters')),
    courseId: v.id('courses'),
    type: v.union(
      v.literal('lesson'),
      v.literal('chapter'),
      v.literal('final')
    ),
    passingScore: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('quizzes', {
      ...args,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveQuestions = mutation({
  args: {
    quizId: v.id('quizzes'),
    questions: v.array(
      v.object({
        text: v.string(),
        options: v.array(
          v.object({
            id: v.string(),
            text: v.string(),
          })
        ),
        correctOptionId: v.string(),
        explanation: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const q of args.questions) {
      await ctx.db.insert('questions', {
        quizId: args.quizId,
        ...q,
        createdAt: now,
      });
    }
    await ctx.db.patch(args.quizId, {
      status: 'ready',
      updatedAt: now,
    });
  },
});

export const submitAttempt = mutation({
  args: {
    userId: v.id('users'),
    quizId: v.id('quizzes'),
    answers: v.array(
      v.object({
        questionId: v.id('questions'),
        selectedOptionId: v.string(),
        isCorrect: v.boolean(),
      })
    ),
    score: v.number(),
    passed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('attempts', {
      ...args,
      completedAt: now,
      createdAt: now,
    });
  },
});
