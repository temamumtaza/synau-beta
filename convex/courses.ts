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

// ─── Aggregated queries (eliminate N+1 HTTP round-trips) ───────────────────

// Dashboard: returns active courses + per-course lesson stats + last activity
// in a single query. Replaces ~32 sequential HTTP round-trips with one.
export const listWithStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const [courses, progressDocs] = await Promise.all([
      ctx.db
        .query('courses')
        .withIndex('by_user_status', (q) =>
          q.eq('userId', args.userId).eq('status', 'active')
        )
        .order('desc')
        .take(100),
      ctx.db
        .query('progress')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(100),
    ]);

    const progressByCourse = new Map(progressDocs.map((p) => [p.courseId, p]));

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const lessons = await ctx.db
          .query('lessons')
          .withIndex('by_course', (q) => q.eq('courseId', course._id))
          .take(500);
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter(
          (l) => l.status === 'ready'
        ).length;
        const progressPct =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;
        const progress = progressByCourse.get(course._id);
        return {
          _id: course._id,
          title: course.title,
          difficulty: course.difficulty,
          progress: progressPct,
          lastActivityAt: progress?.lastActivityAt ?? null,
          totalLessons,
          completedLessons,
        };
      })
    );
    return coursesWithStats;
  },
});

// Course detail: returns course + roadmap + chapters (with nested lessons) +
// aggregated counts in a single query. Replaces 2 + N sequential round-trips.
export const getFullDetail = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, args) => {
    const [course, roadmap, chapters, allLessons] = await Promise.all([
      ctx.db.get(args.courseId),
      ctx.db
        .query('roadmaps')
        .withIndex('by_course', (q) => q.eq('courseId', args.courseId))
        .first(),
      ctx.db
        .query('chapters')
        .withIndex('by_course_order', (q) => q.eq('courseId', args.courseId))
        .take(100),
      ctx.db
        .query('lessons')
        .withIndex('by_course', (q) => q.eq('courseId', args.courseId))
        .take(500),
    ]);

    if (!course) return null;

    const lessonsByChapter = new Map<string, typeof allLessons>();
    for (const lesson of allLessons) {
      const arr = lessonsByChapter.get(lesson.chapterId);
      if (arr) arr.push(lesson);
      else lessonsByChapter.set(lesson.chapterId, [lesson]);
    }

    const chaptersWithLessons = chapters.map((ch) => ({
      ...ch,
      lessons: (lessonsByChapter.get(ch._id) ?? []).sort(
        (a, b) => a.order - b.order
      ),
    }));

    return {
      course,
      roadmap,
      chaptersWithLessons,
      totalLessons: allLessons.length,
      completedLessons: allLessons.filter((l) => l.status === 'ready').length,
    };
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
