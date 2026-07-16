import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByCourse = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('chapters')
      .withIndex('by_course_order', (q) => q.eq('courseId', args.courseId))
      .order('asc')
      .collect();
  },
});

export const getById = query({
  args: { id: v.id('chapters') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const createMany = mutation({
  args: {
    chapters: v.array(
      v.object({
        courseId: v.id('courses'),
        roadmapId: v.id('roadmaps'),
        title: v.string(),
        description: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const chapter of args.chapters) {
      const id = await ctx.db.insert('chapters', {
        ...chapter,
        status: chapter.order === 0 ? 'available' : 'locked',
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('chapters'),
    status: v.union(
      v.literal('locked'),
      v.literal('available'),
      v.literal('in_progress'),
      v.literal('completed')
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
