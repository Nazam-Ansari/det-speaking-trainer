import type { Question } from '../../types';

/**
 * Returns the hand-written sample answer when the question bank has one; otherwise a
 * structure guide built from the question's cues and keywords. The guide is clearly
 * labelled as a framework in the UI. It is not presented as a real answer.
 */
export function buildModelAnswer(q: Question): { text: string; kind: 'sample' | 'framework' } {
  if (q.sampleAnswer) return { text: q.sampleAnswer, kind: 'sample' };
  const kw = q.keywords.slice(0, 4);
  const kwHint = kw.length ? ` Useful words: ${kw.join(', ')}.` : '';

  switch (q.type) {
    case 'photo':
      return {
        kind: 'framework',
        text: [
          '1. Overview: "This picture shows … in/at a …"',
          '2. Foreground: "In the foreground, there is/are … who seem to be …ing."',
          '3. Details: "On the left/right, I can see … . Behind them, …"',
          '4. Background: "In the background, there is …"',
          '5. Interpretation: "It looks like … , so I imagine they are …"',
          `${kwHint.trim()}`,
        ].filter(Boolean).join('\n'),
      };
    case 'read-then-speak': {
      const cues = q.cues?.length ? q.cues : ['Main point', 'Reason', 'Example'];
      return {
        kind: 'framework',
        text: [
          '1. Direct answer (1 sentence): restate the question in your own words and give your answer.',
          ...cues.map((c, i) => `${i + 2}. ${c} → answer in 2 sentences: a point, then a reason or detail ("because…", "for example…").`),
          `${cues.length + 2}. Wrap-up: "So overall, that's why …"`,
          kwHint.trim(),
        ].filter(Boolean).join('\n'),
      };
    }
    case 'interactive':
      return {
        kind: 'framework',
        text: [
          '1. Answer directly: "Honestly, I\'d say …" / "Yes, I have, actually."',
          '2. Give a reason: "…mainly because …"',
          '3. Add one detail or example: "For instance, last month I …"',
          '(Aim for 3–4 sentences, about 50–70 words, in 35 seconds.)',
          kwHint.trim(),
        ].filter(Boolean).join('\n'),
      };
    case 'speaking-sample':
    default:
      return {
        kind: 'framework',
        text: [
          '1. Introduction: give your position clearly. "Personally, I believe … for two main reasons."',
          '2. Point 1 + reason + example: "First, … because … For example, …"',
          '3. Point 2 + reason + example: "Second, … This means that …"',
          '4. Counter-argument: "Of course, some people argue that … However, …"',
          '5. Conclusion: "Overall, … , which is why I think …"',
          '(Aim for 150–250 words over 1–3 minutes.)',
          kwHint.trim(),
        ].filter(Boolean).join('\n'),
      };
  }
}
