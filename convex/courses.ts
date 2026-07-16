import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Queries ──────────────────────────────────────────────────────────────

export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();
  },
});

export const listActiveByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('courses')
      .withIndex('by_user_status', (q) =>
        q.eq('userId', args.userId).eq('status', 'active')
      )
      .order('desc')
      .collect();
  },
});

export const getById = query({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    goal: v.string(),
    difficulty: v.union(
      v.literal('beginner'),
      v.literal('intermediate'),
      v.literal('advanced')
    ),
    estimatedDuration: v.string(),
    prerequisites: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('courses', {
      ...args,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const activate = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'active',
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('courses'), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'archived',
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const markCompleted = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'completed',
      updatedAt: Date.now(),
    });
  },
});
