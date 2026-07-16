import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
  },
});

export const getById = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    provider: v.union(v.literal('email'), v.literal('google')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        image: args.image,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
