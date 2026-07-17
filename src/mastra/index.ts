import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';

import { synauAgent } from './agents/synau-agent';
import { plannerAgent } from './agents/planner-agent';
import { researchPlannerAgent } from './agents/research-planner-agent';
import { researchAgent } from './agents/research-agent';
import { sourceRankAgent } from './agents/source-rank-agent';
import { groundingAgent } from './agents/grounding-agent';
import { curriculumReviewerAgent } from './agents/curriculum-reviewer-agent';
import { teacherAgent } from './agents/teacher-agent';
import { factCheckerAgent } from './agents/fact-checker-agent';
import { citationBuilderAgent } from './agents/citation-builder-agent';
import { quizAgent } from './agents/quiz-agent';
import { progressAgent } from './agents/progress-agent';
import { adaptiveLearningAgent } from './agents/adaptive-learning-agent';

import { courseGenerationWorkflow } from './workflows/course-generation-workflow';
import { lessonWorkflow } from './workflows/lesson-workflow';
import { quizWorkflow } from './workflows/quiz-workflow';

const storage = new LibSQLStore({
  id: 'synau-storage',
  url: process.env.DATABASE_URL ?? 'file:./mastra.db',
});

export const mastra = new Mastra({
  agents: {
    synauAgent,
    plannerAgent,
    researchPlannerAgent,
    researchAgent,
    sourceRankAgent,
    groundingAgent,
    curriculumReviewerAgent,
    teacherAgent,
    factCheckerAgent,
    citationBuilderAgent,
    quizAgent,
    progressAgent,
    adaptiveLearningAgent,
  },
  workflows: {
    courseGenerationWorkflow,
    lessonWorkflow,
    quizWorkflow,
  },
  storage,
  memory: {
    default: new Memory({ storage }),
  },
});
