import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ─── Users ───────────────────────────────────────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()), // Unix timestamp
    provider: v.union(v.literal('email'), v.literal('google')),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_email', ['email']),

  // ─── Courses ─────────────────────────────────────────────────────────────
  courses: defineTable({
    userId: v.id('users'),
    title: v.string(),
    goal: v.string(), // original user input
    difficulty: v.union(
      v.literal('beginner'),
      v.literal('intermediate'),
      v.literal('advanced')
    ),
    estimatedDuration: v.string(), // e.g. "4 weeks"
    prerequisites: v.array(v.string()),
    status: v.union(
      v.literal('draft'),
      v.literal('active'),
      v.literal('archived'),
      v.literal('completed')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status']),

  // ─── Roadmaps ─────────────────────────────────────────────────────────────
  roadmaps: defineTable({
    courseId: v.id('courses'),
    chapters: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        dependsOn: v.array(v.string()), // chapter ids
        estimatedDuration: v.string(),
      })
    ),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_course', ['courseId']),

  // ─── Chapters ─────────────────────────────────────────────────────────────
  chapters: defineTable({
    courseId: v.id('courses'),
    roadmapId: v.id('roadmaps'),
    title: v.string(),
    description: v.string(),
    order: v.number(),
    status: v.union(
      v.literal('locked'),
      v.literal('available'),
      v.literal('in_progress'),
      v.literal('completed')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_course', ['courseId'])
    .index('by_course_order', ['courseId', 'order']),

  // ─── Lessons ──────────────────────────────────────────────────────────────
  lessons: defineTable({
    chapterId: v.id('chapters'),
    courseId: v.id('courses'),
    title: v.string(),
    objective: v.string(),
    order: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('generating'),
      v.literal('ready'),
      v.literal('failed')
    ),
    lqs: v.optional(v.number()), // Learning Quality Score 0-100
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_chapter', ['chapterId'])
    .index('by_course', ['courseId'])
    .index('by_chapter_order', ['chapterId', 'order']),

  // ─── Lesson Contents ──────────────────────────────────────────────────────
  lessonContents: defineTable({
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
    version: v.number(), // increments on regeneration
    createdAt: v.number(),
  }).index('by_lesson', ['lessonId']),

  // ─── Citations ────────────────────────────────────────────────────────────
  citations: defineTable({
    lessonId: v.id('lessons'),
    title: v.string(),
    publisher: v.string(),
    url: v.string(),
    accessedAt: v.optional(v.string()),
    confidenceScore: v.number(), // 0-1
    sourceRank: v.number(), // 1-8 (official docs = 1, blogs = 8)
    citation: v.string(), // formatted citation string
    createdAt: v.number(),
  }).index('by_lesson', ['lessonId']),

  // ─── Quizzes ──────────────────────────────────────────────────────────────
  quizzes: defineTable({
    lessonId: v.optional(v.id('lessons')),
    chapterId: v.optional(v.id('chapters')),
    courseId: v.id('courses'),
    type: v.union(
      v.literal('lesson'),   // 5 Qs, pass ≥60%
      v.literal('chapter'),  // 10 Qs, pass ≥70%
      v.literal('final')     // 20 Qs, pass ≥70%
    ),
    passingScore: v.number(), // 0-100
    status: v.union(v.literal('generating'), v.literal('ready'), v.literal('failed')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_lesson', ['lessonId'])
    .index('by_chapter', ['chapterId'])
    .index('by_course', ['courseId']),

  // ─── Questions ────────────────────────────────────────────────────────────
  questions: defineTable({
    quizId: v.id('quizzes'),
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
    createdAt: v.number(),
  }).index('by_quiz', ['quizId']),

  // ─── Attempts ─────────────────────────────────────────────────────────────
  attempts: defineTable({
    userId: v.id('users'),
    quizId: v.id('quizzes'),
    answers: v.array(
      v.object({
        questionId: v.id('questions'),
        selectedOptionId: v.string(),
        isCorrect: v.boolean(),
      })
    ),
    score: v.number(), // 0-100
    passed: v.boolean(),
    completedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_quiz', ['userId', 'quizId']),

  // ─── Progress ──���──────────────────────────────────────────────────────────
  progress: defineTable({
    userId: v.id('users'),
    courseId: v.id('courses'),
    lessonsCompleted: v.array(v.id('lessons')),
    chaptersCompleted: v.array(v.id('chapters')),
    totalTimeMinutes: v.number(),
    masteryScore: v.number(), // 0-100
    weakTopics: v.array(v.string()),
    currentLessonId: v.optional(v.id('lessons')),
    completedAt: v.optional(v.number()),
    lastActivityAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_course', ['userId', 'courseId']),

  // ─── Notifications ────────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // ─── Settings ─────────────────────────────────────────────────────────────
  settings: defineTable({
    userId: v.id('users'),
    language: v.string(), // 'id' | 'en'
    dailyGoalMinutes: v.number(),
    emailNotifications: v.boolean(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
});
