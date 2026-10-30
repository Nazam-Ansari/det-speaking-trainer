import { describe, expect, it } from 'vitest';
import { applyGrammarRules, evaluateAnswer } from './index';
import { QUESTIONS, SCENARIOS } from '../../data/questionBank';
import { InteractiveConversation } from '../interactive';
import { toDetScore } from '../scoring';

const rts = QUESTIONS.find((q) => q.id === 'rts-017')!; // memorable trip

describe('grammar rules', () => {
  const cases: Array<[string, string]> = [
    ['She go to work every day.', 'She goes to work every day.'],
    ['He usually have breakfast at home.', 'He usually has breakfast at home.'],
    ['Does he go to school?', 'Does he go to school?'],
    ['I didn\'t went there.', 'I didn\'t go there.'],
    ['Yesterday I go to the park.', 'Yesterday I went to the park.'],
    ['It was a interesting trip.', 'It was an interesting trip.'],
    ['It is a university.', 'It is a university.'],
    ['I am student.', 'I am a student.'],
    ['There is many people in the picture.', 'There are many people in the picture.'],
    ['This is more better than before.', 'This is better than before.'],
    ['I can to swim.', 'I can swim.'],
    ['We discussed about the problem.', 'We discussed the problem.'],
    ['I listen music every day.', 'I listen to music every day.'],
    ['It is good place for families.', 'It is a good place for families.'],
    ['They was happy.', 'They were happy.'],
    ['I am agree with this.', 'I agree with this.'],
    ['He don\'t like it.', 'He doesn\'t like it.'],
    ['I live here since five years.', 'I live here for five years.'],
    ['I have twenty years old.', 'I am twenty years old.'],
    ['One of my friend lives there.', 'One of my friends lives there.'],
    ['Let him go home.', 'Let him go home.'],
    ['I want to see the city.', 'I want to see the city.'],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}"`, () => {
      expect(applyGrammarRules(input).corrected).toBe(expected);
    });
  }
});

describe('evaluateAnswer', () => {
  it('scores an empty answer as zero', () => {
    const e = evaluateAnswer(rts, '', 0);
    expect(e.practiceScore).toBe(0);
    expect(e.dimensions.every((d) => d.score === 0)).toBe(true);
    expect(e.pronunciation).toBe('unavailable');
  });

  it('rates a strong answer higher than a weak one', () => {
    const strong = 'Last summer I travelled to the mountains with two close friends. Although the journey was long, it was absolutely worth it, because the views were breathtaking. For example, on the second day we hiked to a lake that was completely surrounded by snow. What made the trip memorable was that we had no phone signal, so we talked to each other far more than usual. Overall, it taught me that the best experiences are often the simplest ones.';
    const weak = 'um I go to trip uh it was very good very good and very nice and I like it very much and it was good';
    const s = evaluateAnswer(rts, strong, 45);
    const w = evaluateAnswer(rts, weak, 40);
    expect(s.practiceScore).toBeGreaterThan(w.practiceScore + 20);
    expect(w.issues.some((i) => i.category === 'filler' || i.category === 'repetition')).toBe(true);
    expect(s.modelAnswer.length).toBeGreaterThan(0);
  });

  it('produces corrections and a polished version', () => {
    const e = evaluateAnswer(rts, 'Yesterday I go to the beach with my family. It was very good. She like the sea.', 30);
    expect(e.corrections.length).toBeGreaterThanOrEqual(2);
    expect(e.polishedVersion).toContain('went');
    expect(e.polishedVersion).toContain('excellent');
    expect(e.polishedVersion).toContain('She likes');
  });

  it('keeps articles correct after vocabulary upgrades', () => {
    const e = evaluateAnswer(rts, 'Overall it was a very interesting trip. It was very good experience for me.', 20);
    expect(e.polishedVersion).not.toMatch(/\ba excellent\b/i);
    expect(e.polishedVersion).toContain('a fascinating trip');
    expect(e.polishedVersion).toContain('an excellent experience');
  });

  it('handles unpunctuated browser transcripts', () => {
    const e = evaluateAnswer(rts, 'last year i went to paris with my sister and we visited many museums and then we ate a lot of food because it was delicious and so we decided to stay longer', 30);
    expect(e.fluency.sentenceCount).toBeGreaterThan(1);
    expect(e.practiceScore).toBeGreaterThan(0);
  });
});

describe('toDetScore', () => {
  it('maps 0–100 onto 10–160 in steps of 5', () => {
    expect(toDetScore(0)).toBe(10);
    expect(toDetScore(100)).toBe(160);
    expect(toDetScore(80)).toBe(130);
    expect(toDetScore(57) % 5).toBe(0);
  });
});

describe('question bank', () => {
  it('has at least 100 prompts and unique ids', () => {
    const total = QUESTIONS.length + SCENARIOS.reduce((n, s) => n + s.nodes.length, 0);
    expect(total).toBeGreaterThanOrEqual(100);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('every scenario path yields the configured number of questions', () => {
    for (const s of SCENARIOS) {
      for (const answer of ['yes I have studied before online', 'no never, I prefer in person', 'something unrelated']) {
        const conv = new InteractiveConversation(s);
        let n = 0;
        while (!conv.finished) {
          n++;
          conv.answer(answer);
        }
        expect(n, `${s.id} / ${answer}`).toBe(s.length);
      }
    }
  });

  it('branches on keywords', () => {
    const s = SCENARIOS.find((x) => x.id === 'int-course')!;
    const conv = new InteractiveConversation(s);
    conv.answer('I want to study design');
    expect(conv.currentNode?.id).toBe('a2');
    conv.answer('No, I would be a complete beginner');
    expect(conv.currentNode?.id).toBe('a3b');
  });
});
