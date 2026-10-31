import { describe, expect, it } from 'vitest';
import { applyGrammarRules } from '../engines/evaluation';
import { GRAMMAR_DRILLS } from './grammarDrills';
import { FRAMEWORKS, frameworkFor } from './speakingFrameworks';

describe('grammar drills', () => {
  it.each(GRAMMAR_DRILLS.map((d) => [d.id, d] as const))('%s: the checker fixes the example mistake', (_id, d) => {
    const { corrected, hits } = applyGrammarRules(d.example.wrong);
    expect(corrected).toBe(d.example.right);
    expect(hits.every((h) => d.ruleIds.includes(h.rule.id))).toBe(true);
  });

  it.each(GRAMMAR_DRILLS.flatMap((d) => d.questions.map((q) => [q.q, q.sample] as const)))('sample answer for "%s" has no detected mistakes', (_q, sample) => {
    expect(applyGrammarRules(sample).hits.map((h) => h.excerpt)).toEqual([]);
  });
});

describe('frameworkFor', () => {
  it.each([
    ['Some people think that children should not be allowed to have smartphones. Do you agree or disagree? Explain your reasons.', 'opinion'],
    ['Talk about a time when you helped someone. What happened, and how did you feel afterwards?', 'describe'],
    ['Is it better to work from home or in an office? Discuss the advantages and disadvantages of each.', 'advantages'],
    ['What are the most effective ways for ordinary people to reduce their impact on the environment?', 'problem'],
    ['Would you rather have a job with a high salary or a job you really enjoy? Explain your choice.', 'choice'],
    ['How do you think daily life will be different in thirty years? Discuss at least two areas of life.', 'future'],
    ['Is it better to live in a big city or in the countryside? Explain your answer with examples.', 'choice'],
    ['Describe an environmental problem in your city or country. What could be done to solve it?', 'problem'],
    ['Where would you like to live in ten years? Describe the place and explain why you would like to live there.', 'describe'],
    ['Describe a goal you want to achieve in the next five years and explain your plan for reaching it.', 'describe'],
  ])('%s → %s', (q, id) => {
    expect(frameworkFor(q).id).toBe(id);
  });
});

describe('framework sample answers', () => {
  it.each(FRAMEWORKS.map((f) => [f.id, f] as const))('%s: one paragraph per part, no detected mistakes', (_id, f) => {
    expect(f.example.sample).toHaveLength(f.parts.length);
    expect(f.example.sample.flatMap((p) => applyGrammarRules(p).hits.map((h) => h.excerpt))).toEqual([]);
  });
});
