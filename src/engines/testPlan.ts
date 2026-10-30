import type { Difficulty, InteractiveScenario, Question, TestConfig, TestSection } from '../types';
import { pickQuestions, pickScenario } from '../data/questionBank';
import rawConfig from '../data/testConfig.json';

export const TEST_CONFIG = rawConfig as TestConfig;

export type TestStep =
  | { kind: 'question'; section: TestSection; question: Question }
  | { kind: 'interactive'; section: TestSection; scenario: InteractiveScenario; count: number };

/**
 * Expands the configured sections into concrete steps. Interactive questions are resolved
 * one at a time during the test because each depends on the previous answer.
 */
export function buildTestPlan(config: TestConfig, difficulty: Difficulty | 'any', recentIds: string[]): TestStep[] {
  const used = new Set(recentIds);
  const steps: TestStep[] = [];
  for (const section of config.sections) {
    if (section.type === 'interactive') {
      const scenario = pickScenario({ difficulty, exclude: used });
      used.add(scenario.id);
      steps.push({ kind: 'interactive', section, scenario, count: Math.min(section.count, 8) });
      continue;
    }
    const qs = pickQuestions(section.count, { type: section.type, difficulty, exclude: used });
    for (const q of qs) {
      used.add(q.id);
      steps.push({
        kind: 'question',
        section,
        question: {
          ...q,
          prepSeconds: section.prepSeconds ?? q.prepSeconds,
          minSeconds: section.minSeconds ?? q.minSeconds,
          maxSeconds: section.maxSeconds ?? q.maxSeconds,
        },
      });
    }
  }
  return steps;
}

/** Number of individual answers the test will collect. */
export function countAnswers(steps: TestStep[]): number {
  return steps.reduce((n, s) => n + (s.kind === 'interactive' ? s.count : 1), 0);
}

/** Rough total duration including prep time, in minutes. */
export function estimateMinutes(config: TestConfig): number {
  let secs = 0;
  for (const s of config.sections) {
    if (s.type === 'interactive') secs += s.count * ((s.answerSeconds ?? 35) + 5);
    else secs += s.count * ((s.prepSeconds ?? 20) + (s.maxSeconds ?? 90));
  }
  return Math.round(secs / 60);
}
