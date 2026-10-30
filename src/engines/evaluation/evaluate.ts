import type {
  Correction, DimensionScore, Evaluation, FluencyMetrics, Issue, Question, QuestionType,
} from '../../types';
import { GRAMMAR_RULES, type GrammarRule } from './grammarRules';
import {
  COMMON_WORDS, COMPLEX_CONNECTORS, CONCLUSION_MARKERS, EXAMPLE_MARKERS, FILLERS, HARD_FILLERS,
  OPINION_MARKERS, PHOTO_SPATIAL, PHOTO_SPECULATION, REASON_MARKERS, STOPWORDS, STRONGER_PHRASES,
  SYNONYMS, TRANSITIONS,
} from './lexicon';
import {
  capitalizeSentence, clamp, countPhrase, ensureEndPunctuation, hasPunctuation, mattr, scale,
  splitSentences, stem, words,
} from './text';
import { buildModelAnswer } from './modelAnswer';

export const EVALUATOR_VERSION = 'rules-1.0';

/** Target word counts per task type (roughly 100–130 wpm over the suggested speaking time). */
const TARGET_WORDS: Record<QuestionType, { min: number; good: number }> = {
  photo: { min: 45, good: 90 },
  'read-then-speak': { min: 50, good: 100 },
  interactive: { min: 25, good: 50 },
  'speaking-sample': { min: 110, good: 200 },
};

const WEIGHTS = { grammar: 0.22, vocabulary: 0.2, fluency: 0.18, relevance: 0.15, development: 0.15, structure: 0.1 };

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

interface RuleHit { rule: GrammarRule; excerpt: string; replacement: string }

function matchCase(original: string, replacement: string): string {
  if (original[0] && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function applyGrammarRules(sentence: string): { corrected: string; hits: RuleHit[] } {
  const hits: RuleHit[] = [];
  let out = sentence;
  for (const rule of GRAMMAR_RULES) {
    rule.pattern.lastIndex = 0;
    out = out.replace(rule.pattern, (m: string, ...rest: unknown[]) => {
      // replace() passes (match, ...groups, offset, string[, namedGroups])
      // Keep undefined (non-participating) groups so positions stay stable.
      const groups = rest.slice(0, rest.length - 2) as string[];
      const fixed = rule.fix(m, groups);
      if (fixed == null || fixed.toLowerCase() === m.toLowerCase()) return m;
      const rep = matchCase(m, fixed);
      hits.push({ rule, excerpt: m, replacement: rep });
      return rep;
    });
  }
  return { corrected: out, hits };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countFillers(text: string): { total: number; byWord: Record<string, number> } {
  const lower = ` ${text.toLowerCase()} `;
  const byWord: Record<string, number> = {};
  let total = 0;
  for (const f of FILLERS) {
    let n: number;
    if (HARD_FILLERS.has(f) || f.includes(' ')) {
      n = countPhrase(lower, f);
      // "kind of"/"sort of" are fillers only when not followed by a noun phrase like "kind of music"
      if (f === 'kind of' || f === 'sort of') n = (lower.match(new RegExp(`\\b${f} (like|um|uh|a|the|i|you|very|really|just)\\b`, 'g')) ?? []).length;
      if (f === 'i mean') n = (lower.match(/\bi mean,? (like|um|uh|you|it|that|the)\b/g) ?? []).length;
    } else if (f === 'like') {
      // "like" as a filler: ", like," or "like um" or sentence-initial "like" or "was like"
      n = (lower.match(/(,\s*like\s*,|\blike,? (um|uh|you know)\b|(^|[.!?]\s*)like\b|\b(was|is|it's|i'm|and|so) like,)/g) ?? []).length;
    } else if (f === 'well') {
      n = (lower.match(/(^|[.!?]\s*)well,/g) ?? []).length;
    } else {
      // basically / actually – count only when used 2+ times (single use is normal English)
      const c = countPhrase(lower, f);
      n = c >= 2 ? c - 1 : 0;
    }
    if (n > 0) {
      byWord[f] = n;
      total += n;
    }
  }
  return { total, byWord };
}

function stutters(tokens: string[]): number {
  let n = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1] && !['that', 'had', 'very', 'bye', 'no'].includes(tokens[i])) n++;
  }
  return n;
}

function removeStutters(text: string): string {
  return text.replace(/\b(\w+)(\s+\1\b)+/gi, (m, w: string) => (['that', 'had'].includes(w.toLowerCase()) ? m : w));
}

function removeFillers(text: string): string {
  return text
    .replace(/\b(um+|uh+|erm|er|ah|hmm+)\b[,.]?\s*/gi, '')
    .replace(/,\s*like\s*,/gi, ',')
    .replace(/\b(you know|i mean),?\s*/gi, (m, _w, off: number, str: string) => (off === 0 || /[,.]\s*$/.test(str.slice(0, off)) ? '' : m))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

function keywordHits(answer: string, keywords: string[]): string[] {
  const lower = answer.toLowerCase();
  const stems = new Set(words(answer).map(stem));
  const hits: string[] = [];
  for (const k of keywords) {
    const kw = k.toLowerCase();
    if (kw.includes(' ')) {
      if (lower.includes(kw)) hits.push(k);
    } else if (stems.has(stem(kw))) {
      hits.push(k);
    }
  }
  return hits;
}

function contentWords(text: string): string[] {
  return words(text).filter((w) => !STOPWORDS.has(w) && w.length > 2);
}

function anyPhrase(text: string, list: string[]): string[] {
  const lower = text.toLowerCase();
  return list.filter((p) => new RegExp(`\\b${p.replace(/\s+/g, '\\s+')}\\b`).test(lower));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function evaluateAnswer(question: Question, transcript: string, durationSeconds: number): Evaluation {
  const text = transcript.replace(/\s+/g, ' ').trim();
  const tokens = words(text);
  const wordCount = tokens.length;
  const sentences = splitSentences(text);
  const punctuated = hasPunctuation(text);
  const issues: Issue[] = [];
  const target = TARGET_WORDS[question.type];

  // ---- Fluency (measured) ----
  const fillers = countFillers(text);
  const stutterCount = stutters(tokens);
  const speakingSeconds = Math.max(0, durationSeconds);
  const wpm = speakingSeconds >= 5 ? Math.round((wordCount / speakingSeconds) * 60) : null;
  const fluencyMetrics: FluencyMetrics = {
    wordCount,
    speakingSeconds: Math.round(speakingSeconds),
    wordsPerMinute: wpm,
    fillerCount: fillers.total,
    fillerWords: fillers.byWord,
    repeatedWordStutters: stutterCount,
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length ? Math.round((wordCount / sentences.length) * 10) / 10 : 0,
    usedTimeRatio: question.maxSeconds ? Math.min(1, speakingSeconds / question.maxSeconds) : 0,
  };

  // ---- Grammar ----
  const corrections: Correction[] = [];
  const allHits: RuleHit[] = [];
  const correctedSentences: string[] = [];
  for (const s of sentences) {
    const { corrected, hits } = applyGrammarRules(s);
    correctedSentences.push(corrected);
    if (hits.length) {
      allHits.push(...hits);
      corrections.push({
        original: s,
        corrected: capitalizeSentence(corrected),
        reasons: Array.from(new Set(hits.map((h) => `${h.rule.message} ("${h.excerpt}" → "${h.replacement}")`))),
      });
    }
  }
  for (const h of allHits) issues.push({ category: h.rule.category, message: h.rule.message, excerpt: h.excerpt });

  const errorsPer100 = wordCount ? (allHits.length / wordCount) * 100 : 0;
  // Accuracy (detected errors) is blended with range (use of complex structures), since a
  // short answer of only simple sentences shows little grammatical control.
  const accuracy = clamp(100 - errorsPer100 * 7);
  const rangeEvidence = anyPhrase(text, COMPLEX_CONNECTORS).length + (/\b(have|has) (been|[a-z]+ed)\b|\bwould\b|\bwill\b|\bused to\b/i.test(text) ? 1 : 0);
  const range = scale(rangeEvidence, 0, 4, 40, 100);
  let grammarScore = Math.round(accuracy * 0.75 + range * 0.25);
  // Few words means little evidence; don't hand out a high grammar score for a handful of correct words.
  if (wordCount < 40) grammarScore = Math.min(grammarScore, 40 + wordCount * 1.4);
  const categories = new Set(allHits.map((h) => h.rule.category));
  const grammarSuggestions: string[] = [];
  if (categories.has('article')) grammarSuggestions.push('Check every singular noun: does it need "a", "an" or "the"?');
  if (categories.has('agreement')) grammarSuggestions.push('Practise third-person -s: "she works", "it helps", "everyone knows".');
  if (categories.has('verb-tense')) grammarSuggestions.push('When you tell a past story, keep every verb in the past tense.');
  if (categories.has('word-choice')) grammarSuggestions.push('Learn fixed collocations as chunks (e.g. "make a mistake", "listen to music").');
  if (!grammarSuggestions.length) grammarSuggestions.push('No common error patterns detected. Try more complex structures (conditionals, relative clauses) to show range.');

  const grammar: DimensionScore = {
    key: 'grammar', label: 'Grammar', score: clamp(grammarScore), kind: 'estimate',
    explanation: allHits.length
      ? `${allHits.length} likely error${allHits.length > 1 ? 's' : ''} found by the rule checker (${errorsPer100.toFixed(1)} per 100 words).`
      : wordCount < 20 ? 'Too few words to judge grammar reliably.' : 'The rule checker found none of the common learner error patterns.',
    suggestions: grammarSuggestions,
  };

  // ---- Vocabulary ----
  const diversity = mattr(tokens, 40);
  const content = contentWords(text);
  const lessCommon = content.filter((w) => !COMMON_WORDS.has(w) && !COMMON_WORDS.has(stem(w)) && w.length >= 5);
  const lessCommonRatio = content.length ? lessCommon.length / content.length : 0;
  const keywordSet = new Set(question.keywords.map((k) => stem(k.toLowerCase())));
  const freq = new Map<string, number>();
  for (const w of content) freq.set(w, (freq.get(w) ?? 0) + 1);
  const repeated = [...freq.entries()]
    .filter(([w, n]) => n >= 3 && n / Math.max(1, content.length) > 0.05 && !keywordSet.has(stem(w)))
    .sort((a, b) => b[1] - a[1]);
  const overusedWeak = Object.keys(SYNONYMS).filter((w) => (tokens.filter((t) => t === w).length >= (w === 'very' || w === 'really' ? 3 : 2)));
  for (const [w, n] of repeated.slice(0, 4)) {
    issues.push({ category: 'repetition', message: `"${w}" is repeated ${n} times.${SYNONYMS[w] ? ` Try: ${SYNONYMS[w].slice(0, 3).join(', ')}.` : ''}`, excerpt: w });
  }
  for (const w of overusedWeak) {
    if (repeated.some(([r]) => r === w)) continue;
    issues.push({ category: 'repetition', message: `"${w}" is a very general word you used several times. Alternatives: ${SYNONYMS[w].slice(0, 3).join(', ')}.`, excerpt: w });
  }
  const diversityScore = scale(diversity, 0.55, 0.85, 35, 100);
  const sophisticationScore = scale(lessCommonRatio, 0.1, 0.45, 35, 100);
  const repetitionPenalty = Math.min(30, repeated.length * 8 + overusedWeak.length * 4);
  let vocabScore = Math.round(diversityScore * 0.45 + sophisticationScore * 0.4 + (100 - repetitionPenalty) * 0.15);
  if (wordCount < 25) vocabScore = Math.min(vocabScore, 30 + wordCount * 2);
  const vocabulary: DimensionScore = {
    key: 'vocabulary', label: 'Vocabulary', score: clamp(vocabScore), kind: 'estimate',
    explanation: `Lexical diversity ${(diversity * 100).toFixed(0)}% (moving type-token ratio); ${lessCommon.length} less-common word${lessCommon.length === 1 ? '' : 's'}${lessCommon.length ? ` (e.g. ${[...new Set(lessCommon)].slice(0, 4).join(', ')})` : ''}.`,
    suggestions: [
      ...(overusedWeak.length ? [`Replace general words like "${overusedWeak.slice(0, 3).join('", "')}" with more precise ones.`] : []),
      ...(lessCommonRatio < 0.1 ? ['Add 2–3 topic-specific words (e.g. for work: "deadline", "colleague", "responsibility").'] : []),
      ...(repeated.length ? ['Use synonyms or pronouns instead of repeating the same word.'] : []),
      'Use precise adjectives instead of "very + adjective" (e.g. "exhausted" instead of "very tired").',
    ].slice(0, 3),
  };

  // ---- Fluency score (built from measured indicators) ----
  let wpmScore: number;
  if (wpm == null) wpmScore = 40;
  else if (wpm < 60) wpmScore = scale(wpm, 20, 60, 15, 40);
  else if (wpm < 100) wpmScore = scale(wpm, 60, 100, 40, 80);
  else if (wpm <= 170) wpmScore = scale(wpm, 100, 130, 80, 100);
  else wpmScore = scale(wpm, 170, 220, 95, 70);
  const fillerRate = wordCount ? (fillers.total / wordCount) * 100 : 0;
  const fillerScore = clamp(100 - fillerRate * 8 - stutterCount * 4);
  const timeScore = speakingSeconds >= question.minSeconds ? scale(fluencyMetrics.usedTimeRatio, 0.33, 0.75, 70, 100) : scale(speakingSeconds, 0, question.minSeconds, 10, 60);
  const fluencyScore = Math.round(wpmScore * 0.5 + fillerScore * 0.3 + timeScore * 0.2);
  if (fillers.total >= 3) issues.push({ category: 'filler', message: `${fillers.total} filler words detected (${Object.entries(fillers.byWord).map(([w, n]) => `${w} ×${n}`).join(', ')}).` });
  if (stutterCount >= 2) issues.push({ category: 'filler', message: `${stutterCount} repeated words (e.g. "I I"). Pause silently instead of repeating.` });
  if (wpm != null && wpm < 80) issues.push({ category: 'length', message: `Speaking rate is ${wpm} words per minute; natural conversational English is usually about 110–160.` });
  const fluency: DimensionScore = {
    key: 'fluency', label: 'Fluency indicators', score: clamp(fluencyScore), kind: 'estimate',
    explanation: `${wpm != null ? `${wpm} words/min` : 'Speaking rate unavailable'}, ${fillers.total} filler${fillers.total === 1 ? '' : 's'}, ${stutterCount} repetition${stutterCount === 1 ? '' : 's'}, spoke for ${Math.round(speakingSeconds)}s of ${question.maxSeconds}s. Based on the transcript and timer only, not on audio rhythm or pauses.`,
    suggestions: [
      ...(wpm != null && wpm < 100 ? ['Prepare 2–3 key ideas during prep time so you never stop to think about what to say next.'] : []),
      ...(fillers.total >= 2 ? ['Replace "um/uh" with a short silent pause, or a natural linking phrase like "Let me think…".'] : []),
      ...(speakingSeconds < question.minSeconds ? [`Keep talking for at least ${question.minSeconds} seconds; add a reason or example to extend your answer.`] : []),
      'Shadowing practice: repeat short native-speaker clips to build smoother rhythm.',
    ].slice(0, 3),
  };

  // ---- Relevance ----
  const promptContent = Array.from(new Set(contentWords(question.text).filter((w) => w.length > 3)));
  const kwHits = keywordHits(text, question.keywords);
  const promptHits = keywordHits(text, promptContent);
  const totalHits = new Set([...kwHits, ...promptHits].map((k) => stem(k))).size;
  let relevanceScore = wordCount === 0 ? 0 : totalHits === 0 ? 20 : scale(totalHits, 1, 5, 50, 95);
  const photoSpatial = question.type === 'photo' ? anyPhrase(text, PHOTO_SPATIAL) : [];
  const photoSpec = question.type === 'photo' ? anyPhrase(text, PHOTO_SPECULATION) : [];
  if (question.type === 'photo') relevanceScore = relevanceScore * 0.8 + Math.min(20, photoSpatial.length * 6 + photoSpec.length * 4);
  if (wordCount > 20 && totalHits <= 1) issues.push({ category: 'relevance', message: 'Your answer may be off-topic: it uses very few words connected to the question.' });
  const relevance: DimensionScore = {
    key: 'relevance', label: 'Answer relevance', score: clamp(Math.round(relevanceScore)), kind: 'estimate',
    explanation: totalHits
      ? `Mentions ${totalHits} topic-related term${totalHits > 1 ? 's' : ''}${kwHits.length ? ` (${kwHits.slice(0, 5).join(', ')})` : ''}. Estimated by keyword overlap, not by understanding meaning.`
      : 'Few or no words from the question topic were detected (estimated by keyword overlap).',
    suggestions: [
      'Start by answering the question directly in your first sentence.',
      ...(question.type === 'photo' && photoSpatial.length < 2 ? ['Use location phrases: "in the foreground", "on the left", "in the background".'] : []),
      ...(question.type === 'photo' && photoSpec.length === 0 ? ['Speculate about the scene: "It seems that…", "They might be…".'] : []),
      ...(question.cues?.length ? [`Cover each cue: ${question.cues.join(' / ')}`] : []),
    ].slice(0, 3),
  };

  // ---- Development ----
  const reasons = anyPhrase(text, REASON_MARKERS);
  const examples = anyPhrase(text, EXAMPLE_MARKERS);
  const opinions = anyPhrase(text, OPINION_MARKERS);
  const conclusions = anyPhrase(text, CONCLUSION_MARKERS);
  const lengthScore = scale(wordCount, target.min * 0.4, target.good, 10, 100);
  let devBonus: number;
  if (question.type === 'photo') {
    devBonus = Math.min(100, photoSpatial.length * 20 + photoSpec.length * 20 + (sentences.length >= 5 ? 20 : 0));
  } else {
    devBonus = (reasons.length ? 35 : 0) + (examples.length ? 35 : 0) + (opinions.length || question.type === 'interactive' ? 15 : 0) + (conclusions.length || question.type === 'interactive' ? 15 : 0);
  }
  const developmentScore = Math.round(lengthScore * 0.6 + devBonus * 0.4);
  if (wordCount === 0) issues.push({ category: 'length', message: 'No answer was recorded or transcribed.' });
  else if (wordCount < target.min) issues.push({ category: 'length', message: `Short answer: ${wordCount} words. Aim for at least ${target.min}, ideally around ${target.good}, for this task.` });
  if (question.type !== 'photo' && wordCount >= 15 && !reasons.length) issues.push({ category: 'structure', message: 'No reasons given. Add "because…" or "the reason is…".' });
  if ((question.type === 'read-then-speak' || question.type === 'speaking-sample') && wordCount >= 30 && !examples.length) {
    issues.push({ category: 'structure', message: 'No specific example. Add "For example, …" with a personal detail.' });
  }
  const development: DimensionScore = {
    key: 'development', label: 'Answer development', score: clamp(developmentScore), kind: 'estimate',
    explanation: question.type === 'photo'
      ? `${wordCount} words; ${photoSpatial.length} location phrase${photoSpatial.length === 1 ? '' : 's'} and ${photoSpec.length} speculation phrase${photoSpec.length === 1 ? '' : 's'}.`
      : `${wordCount} words (target ${target.min}–${target.good}+). Reasons: ${reasons.length ? 'yes' : 'no'}, examples: ${examples.length ? 'yes' : 'no'}, clear opinion: ${opinions.length ? 'yes' : 'no'}, conclusion: ${conclusions.length ? 'yes' : 'no'}.`,
    suggestions: (question.type === 'photo'
      ? ['Describe the scene from big picture → details → your interpretation.', 'Mention people, actions, objects, setting and mood.', 'Finish with a guess about what is happening or will happen next.']
      : [
        ...(!reasons.length ? ['Support each point with a reason ("because…", "this means…").'] : []),
        ...(!examples.length ? ['Add a short personal example ("For example, last year I…").'] : []),
        ...(!conclusions.length && question.type !== 'interactive' ? ['End with a one-sentence conclusion ("Overall, that\'s why I believe…").'] : []),
        ...(wordCount < target.good ? ['Use the full time: aim for two developed points rather than one.'] : []),
      ]).slice(0, 3),
  };

  // ---- Sentence structure ----
  const sentenceLengths = sentences.map((s) => words(s).length);
  const avgLen = fluencyMetrics.avgSentenceLength;
  const complex = anyPhrase(text, COMPLEX_CONNECTORS);
  const transitions = anyPhrase(text, TRANSITIONS);
  const runOns = punctuated ? sentenceLengths.filter((n) => n > 40).length : 0;
  const fragments = punctuated ? sentenceLengths.filter((n) => n > 0 && n < 4).length : 0;
  const starters = sentences.map((s) => words(s)[0]).filter(Boolean);
  const starterCounts = starters.reduce<Record<string, number>>((acc, w) => ({ ...acc, [w]: (acc[w] ?? 0) + 1 }), {});
  const monotone = Object.entries(starterCounts).filter(([, n]) => n >= 3 && n / starters.length >= 0.5).map(([w]) => w);
  const andSo = (text.match(/\b(and|so|and then)\b/gi) ?? []).length;
  let structureScore = 45
    + Math.min(25, complex.length * 6)
    + Math.min(20, transitions.length * 5)
    + (punctuated ? (avgLen >= 8 && avgLen <= 25 ? 10 : 0) : 5)
    - runOns * 8 - fragments * 5 - monotone.length * 8
    - (wordCount ? Math.max(0, (andSo / wordCount) * 100 - 6) * 2 : 0);
  if (wordCount < 20) structureScore = Math.min(structureScore, 35 + wordCount);
  if (runOns) issues.push({ category: 'structure', message: `${runOns} very long sentence${runOns > 1 ? 's' : ''} (40+ words). Break long chains of "and… and…" into separate sentences.` });
  if (monotone.length) issues.push({ category: 'structure', message: `Many sentences start with "${monotone[0]}". Vary your sentence openings.` });
  if (complex.length === 0 && wordCount >= 25) issues.push({ category: 'structure', message: 'Only simple sentences were detected. Combine ideas with "because", "although", "which" or "when".' });
  const structure: DimensionScore = {
    key: 'structure', label: 'Sentence structure', score: clamp(Math.round(structureScore)), kind: 'estimate',
    explanation: `${sentences.length} sentence${sentences.length === 1 ? '' : 's'}, average ${avgLen} words; ${complex.length} complex connector${complex.length === 1 ? '' : 's'} and ${transitions.length} transition${transitions.length === 1 ? '' : 's'}.${punctuated ? '' : ' The transcript has no punctuation, so sentence boundaries are approximate.'}`,
    suggestions: [
      ...(complex.length < 2 ? ['Join ideas with subordinate clauses: "Although it was raining, we…", "…, which meant that…".'] : []),
      ...(transitions.length < 2 ? ['Signpost your answer: "First…", "On the other hand…", "Overall…".'] : []),
      ...(monotone.length ? ['Start some sentences with a time phrase or a linking word instead of "I".'] : []),
      ...(runOns ? ['Keep most sentences between 10 and 25 words.'] : []),
      'Use a mix of short, punchy sentences and longer complex ones.',
    ].slice(0, 3),
  };

  const dimensions = [grammar, vocabulary, fluency, relevance, development, structure];
  if (wordCount === 0) {
    for (const d of dimensions) {
      d.score = 0;
      d.explanation = 'No answer to evaluate.';
    }
  }
  let practiceScore = Math.round(dimensions.reduce((sum, d) => sum + d.score * WEIGHTS[d.key], 0));
  if (wordCount === 0) practiceScore = 0;
  else if (wordCount < 15) practiceScore = Math.min(practiceScore, 35);
  else if (wordCount < target.min) practiceScore = Math.min(practiceScore, Math.round(scale(wordCount, 0, target.min, 20, 70)));

  // ---- Polished version ----
  let polished = correctedSentences.map((s) => ensureEndPunctuation(capitalizeSentence(s.replace(/\bi\b/g, 'I')))).join(' ');
  polished = removeFillers(polished);
  for (const [re, rep] of STRONGER_PHRASES) polished = polished.replace(re, (m) => matchCase(m, rep));
  // Re-run the rules: upgrades can change articles ("a very good" → "an excellent").
  polished = applyGrammarRules(removeStutters(polished)).corrected;
  polished = polished.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());

  // ---- Tips & strengths ----
  const sortedDims = [...dimensions].sort((a, b) => a.score - b.score);
  const tips: string[] = [];
  for (const d of sortedDims) {
    for (const s of d.suggestions) {
      if (tips.length < 5 && !tips.includes(s)) tips.push(s);
      if (tips.length >= 2 * (sortedDims.indexOf(d) + 1)) break;
    }
    if (tips.length >= 5) break;
  }
  const strengths: string[] = [];
  for (const d of dimensions) if (d.score >= 80) strengths.push(`${d.label}: ${d.explanation}`);
  if (examples.length) strengths.push('You supported your answer with a specific example.');
  if (complex.length >= 3) strengths.push('Good use of complex sentences.');
  if (wordCount >= target.good) strengths.push('Your answer had a good length for this task.');

  const model = buildModelAnswer(question);

  return {
    practiceScore: clamp(practiceScore),
    dimensions,
    fluency: fluencyMetrics,
    issues,
    corrections,
    polishedVersion: polished,
    modelAnswer: model.text,
    modelAnswerKind: model.kind,
    tips: tips.slice(0, 5),
    strengths: strengths.slice(0, 5),
    pronunciation: 'unavailable',
    evaluatorVersion: EVALUATOR_VERSION,
  };
}
