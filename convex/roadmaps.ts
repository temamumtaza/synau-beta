import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Queries ──────────────────────────────────────────────────────────────

export const getByCourse = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('roadmaps')
      .withIndex('by_course', (q) => q.eq('courseId', args.courseId))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    courseId: v.id('courses'),
    chapters: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        dependsOn: v.array(v.string()),
        estimatedDuration: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('roadmaps', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approve = mutation({
  args: { id: v.id('roadmaps') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('roadmaps'),
    chapters: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        dependsOn: v.array(v.string()),
        estimatedDuration: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      chapters: args.chapters,
      updatedAt: Date.now(),
    });
  },
});
