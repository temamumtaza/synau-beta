import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByUser = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc');

    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('notifications', {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { id: v.id('notifications') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllRead = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    for (const n of notifications) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});
