import { z } from 'zod';

/**
 * Dynamic Lesson Blocks — replaces the old rigid
 * { explanation, examples[], keyPoints[], summary } shape.
 *
 * The Teacher Agent now chooses which blocks fit each lesson's pedagogical
 * needs. A simple concept might need only [text, keyPoints, summary];
 * a hands-on topic might need [text, definition, example, steps, callout,
 * summary]; a comparison-heavy topic might use a [table] block; etc.
 *
 * Design choice: a single object with a `type` enum + optional fields, rather
 * than a strict discriminated union. This is intentionally forgiving so that
 * smaller LLMs (gemini-flash-lite) can satisfy the schema reliably and the
 * renderer can degrade gracefully. Output is still Zod-validated (spec rule
 * #4 holds). The renderer reads fields defensively per `type`.
 */

export const lessonBlockSchema = z.object({
  type: z.enum([
    'text',       // prose body (markdown)
    'definition', // term + definition
    'example',    // worked example (title + markdown)
    'analogy',    // relatable analogy (markdown)
    'steps',      // ordered step-by-step procedure
    'table',      // headers + rows (comparisons, matrices)
    'code',       // code snippet (language + content)
    'callout',    // info / tip / warning / success (variant + markdown)
    'quote',      // notable quote / principle
    'keyPoints',  // Synau Note bullets
    'summary',    // recap
  ]),
  // Common optional fields — renderer uses whichever the block type needs.
  title: z.string().optional(),
  content: z.string().optional(),        // markdown body
  term: z.string().optional(),           // definition
  points: z.array(z.string()).optional(), // keyPoints bullets
  steps: z.array(z.string()).optional(), // ordered steps
  headers: z.array(z.string()).optional(), // table columns
  rows: z.array(z.array(z.string())).optional(), // table rows
  language: z.string().optional(),       // code language
  caption: z.string().optional(),        // code caption
  variant: z
    .enum(['info', 'tip', 'warning', 'success'])
    .optional(),                          // callout variant
  attribution: z.string().optional(),    // quote source
});

export type LessonBlock = z.infer<typeof lessonBlockSchema>;

/**
 * Full lesson payload produced by the Teacher Agent.
 * `blocks` is the primary content. Legacy flat fields are no longer produced
 * but old persisted documents may still carry them.
 */
export const lessonContentSchema = z.object({
  title: z.string(),
  objective: z.string(),
  blocks: z.array(lessonBlockSchema).min(1),
  citedSourceUrls: z.array(z.string()).optional().default([]),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;

/**
 * Wrapper emitted by the Teacher Agent: status + optional lesson payload.
 * Used by both workflows (course-generation + lesson) so the fact-check /
 * fallback logic stays consistent.
 */
export const teacherOutputSchema = z.object({
  status: z.enum(['ready', 'rejected']),
  rejectionReason: z.string().nullable(),
  lesson: lessonContentSchema.nullable(),
});

export type TeacherOutput = z.infer<typeof teacherOutputSchema>;

/**
 * Teacher Agent guidance text describing the block vocabulary and the
 * "choose what fits" philosophy. Imported by the agent definition so the
 * instructions stay in sync with this schema file.
 */
export const TEACHER_BLOCK_GUIDE = `
LESSON BLOCK VOCABULARY
You compose a lesson from ordered blocks. Pick ONLY the blocks that genuinely
help the learner — never force a block type just to fill a template. A short
foundational concept should be short; a dense practical topic should be rich.

Block types and when to use them:
- text        : the main explanation / prose. Markdown supported. Usually the
                opening block and the spine of the lesson. Use multiple text
                blocks to separate distinct sub-topics.
- definition  : a key term + its precise definition. Use for jargon the learner
                must lock in. { term, content }
- example     : a concrete worked example with optional title. { title, content }
- analogy     : a relatable real-world analogy that makes an abstract idea click. { content }
- steps       : an ordered procedure / how-to. { title, steps: [...] }
- table       : a structured comparison or matrix. { title, headers: [...], rows: [[...]] }
- code        : a code snippet. { language, content, caption }
- callout     : a highlighted note — variant: info | tip | warning | success.
                Use 'warning' for common pitfalls, 'tip' for pro-tips,
                'success' for reassurance. { variant, title, content }
- quote       : a notable principle or aphorism. { content, attribution }
- keyPoints   : the bullet-point insights ("Synau Note"). Condense the lesson's
                takeaways. Usually near the end. { points: [...] }
- summary     : a tight recap of the whole lesson. Almost always the LAST block. { content }

COMPOSITION RULES
1. Always begin with at least one 'text' block that frames the concept.
2. Almost always end with a 'summary' block. A 'keyPoints' block should
   precede or accompany the summary when the lesson has discrete takeaways.
3. Do NOT include every block type. Calibrate to the lesson: a 3-block lesson
   is correct if the concept is simple; an 8-block lesson is correct if it is
   dense. Quality over completeness.
4. Within markdown (text/example/analogy/callout/summary content) you may use
   headings (#, ##, ###), **bold**, *italic*, \`inline code\`, \`\`\`fenced
   code\`\`\`, bullet lists (-), numbered lists (1.), > blockquotes, and
   [text](https://url) links. The renderer formats these.
5. Keep every claim evidence-backed by the verified knowledge package.
6. ALL cited source URLs must come from the provided knowledge package sources.
`;
