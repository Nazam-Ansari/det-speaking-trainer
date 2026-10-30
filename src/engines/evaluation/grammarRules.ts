import type { IssueCategory } from '../../types';
import { PAST_TO_BASE, pastTense, thirdPerson } from './lexicon';

/**
 * Rule-based grammar checker.
 *
 * Each rule targets a common, well-defined learner error pattern and knows how to fix it.
 * This is NOT a full grammar parser: it catches frequent intermediate-level mistakes and
 * will miss many others. Results are labelled as estimates in the UI.
 */
export interface GrammarRule {
  id: string;
  category: IssueCategory;
  message: string;
  pattern: RegExp;
  /** Return the replacement, or null to leave the match unchanged. */
  fix: (match: string, groups: string[]) => string | null;
}

const VOWEL_SOUND_EXCEPTIONS = /^(uni|use|usu|uto|eu|one|once|ur)/i; // "a university", "a useful", "a European", "a one-time"
const SILENT_H = /^(hour|honest|honou?r|heir)/i;

function article(word: string): 'a' | 'an' {
  if (SILENT_H.test(word)) return 'an';
  if (/^[aeiou]/i.test(word) && !VOWEL_SOUND_EXCEPTIONS.test(word)) return 'an';
  return 'a';
}

const MODAL_OR_AUX = "(?<!\\b(?:does|did|do|will|can|could|would|should|may|might|must|let|lets|make|makes|made|help|helps|helped|saw|see|sees|watch|watched|heard|hear|to|let's|doesn't|didn't|don't|won't|can't|couldn't|wouldn't|shouldn't)\\s)";
const BASE_VERBS = 'go|do|have|want|like|make|work|live|need|think|say|play|study|watch|take|come|get|know|feel|try|help|use|enjoy|love|hate|prefer|believe|teach|cook|drive|read|write|speak|travel|spend|seem|look|mean|give|run|walk|stay|wake|eat|drink|sleep|buy|pay';
const PEOPLE_SUBJ = "he|she|it|my (?:mother|father|mum|mom|dad|brother|sister|friend|teacher|boss|grandmother|grandfather|wife|husband|son|daughter)|everyone|everybody|somebody|someone|nobody|this person|the man|the woman";

export const GRAMMAR_RULES: GrammarRule[] = [
  // ---------- Articles ----------
  {
    id: 'a-an-vowel', category: 'article', message: 'Use "an" before a vowel sound.',
    pattern: /\ba ([aeiou][a-z]+)\b/gi,
    fix: (_m, [w]) => (article(w) === 'an' ? `an ${w}` : null),
  },
  {
    id: 'an-a-consonant', category: 'article', message: 'Use "a" before a consonant sound.',
    pattern: /\ban ([bcdfgjklmnpqrstvwxyz][a-z]+)\b/gi,
    fix: (_m, [w]) => (article(w) === 'a' ? `a ${w}` : null),
  },
  {
    id: 'missing-article-adj-noun', category: 'article', message: 'A singular countable noun usually needs an article ("a", "an" or "the").',
    pattern: /\b(is|was|it's|there's|have|has|had|bought|saw|got|want|need|found|became|become) ((?:very |really |quite )?(?:good|nice|big|small|beautiful|great|new|old|interesting|important|difficult|happy|amazing|wonderful|busy|large|modern|famous|popular|young|long|short|quiet|bright|huge|little)) (place|city|town|person|man|woman|day|time|job|book|film|movie|idea|experience|school|teacher|friend|house|car|picture|photo|kitchen|room|park|country|problem|question|decision|opportunity|way|team|restaurant|trip|holiday|family|life|table|window|garden|boy|girl|child|market|shop|street|building|office|game|teacher|student|doctor|meal|weekend)\b/gi,
    fix: (_m, [v, adj, n]) => `${v} ${article(adj.trim())} ${adj} ${n}`,
  },
  {
    id: 'missing-article-profession', category: 'article', message: 'Use "a"/"an" before a job or role: "I am a student".',
    pattern: /\b(i am|i'm|he is|he's|she is|she's|be|become|became|was|work as|worked as) (doctor|engineer|teacher|student|nurse|lawyer|programmer|developer|manager|designer|scientist|pilot|chef|accountant|architect|artist|writer|journalist|farmer|driver|waiter|waitress|police officer|businessman|businesswoman|entrepreneur)\b/gi,
    fix: (_m, [v, n]) => `${v} ${article(n)} ${n}`,
  },
  {
    id: 'missing-article-there-is', category: 'article', message: 'Use an article after "there is" with a singular noun.',
    pattern: /\b(there is|there's|this is|that is|it is|it's|i see|i can see|we can see|you can see) (man|woman|boy|girl|child|person|table|picture|photo|dog|cat|car|teacher|student|book|kitchen|window|tree|lady|couple|bus|train|chair|laptop|bag|ball|umbrella|garden|market|cafe|shop)\b/gi,
    fix: (_m, [v, n]) => `${v} ${article(n)} ${n}`,
  },

  // ---------- Subject–verb agreement ----------
  {
    id: 'third-person-s', category: 'agreement', message: 'With he/she/it (third person singular), add -s to the verb in the present simple.',
    pattern: new RegExp(`${MODAL_OR_AUX}\\b(${PEOPLE_SUBJ}) (?:(always|usually|often|sometimes|never|really|also|still) )?(${BASE_VERBS})\\b`, 'gi'),
    fix: (_m, [s, adv, v]) => `${s} ${adv ? `${adv} ` : ''}${thirdPerson(v)}`,
  },
  {
    id: 'plural-subject-s', category: 'agreement', message: 'With I/you/we/they, do not add -s to the verb.',
    pattern: /\b(i|you|we|they) (has|does|goes|wants|likes|works|lives|needs|thinks|says|plays|studies|watches|takes|comes|gets|knows|feels|tries|helps|uses|enjoys|loves|prefers|believes|seems)\b/gi,
    fix: (_m, [s, v]) => {
      const map: Record<string, string> = { has: 'have', does: 'do', goes: 'go', studies: 'study', tries: 'try', watches: 'watch' };
      return `${s} ${map[v.toLowerCase()] ?? v.replace(/s$/i, '')}`;
    },
  },
  {
    id: 'be-agreement', category: 'agreement', message: 'The form of "be" must agree with the subject (I am, you/we/they are, he/she/it is).',
    pattern: /\b(i|you|we|they|people|children|my parents|my friends) (is)\b|\b(you|we|they|people|children|my parents|my friends) (was)\b|\b(i) (are)\b/gi,
    fix: (m) => {
      const [s, v] = m.split(' ');
      const subj = m.slice(0, m.lastIndexOf(' '));
      if (/^i$/i.test(s)) return `${s} am`;
      if (/^was$/i.test(v)) return `${subj} were`;
      return `${subj} are`;
    },
  },
  {
    id: 'dont-doesnt', category: 'agreement', message: 'Use "doesn\'t" with he/she/it, and "don\'t" with I/you/we/they.',
    pattern: /\b(he|she|it) (don't|do not)\b|\b(i|you|we|they) (doesn't|does not)\b/gi,
    fix: (m) => {
      const subj = m.split(' ')[0];
      return /^(he|she|it)$/i.test(subj) ? `${subj} doesn't` : `${subj} don't`;
    },
  },
  {
    id: 'there-are', category: 'agreement', message: 'Use "there are" with plural nouns.',
    pattern: /\bthere is (many|several|two|three|four|five|lots of|a lot of people|some people|people|a few)\b/gi,
    fix: (_m, [w]) => `there are ${w}`,
  },
  {
    id: 'people-who-lives', category: 'agreement', message: '"People" is plural, so the verb after "who" should not take -s.',
    pattern: /\bpeople who (lives|works|wants|likes|has|thinks|needs|uses)\b/gi,
    fix: (_m, [v]) => `people who ${v === 'has' ? 'have' : v.replace(/s$/, '')}`,
  },

  // ---------- Verb forms & tenses ----------
  {
    id: 'aux-past', category: 'verb-tense', message: 'After did/didn\'t, modal verbs and "to", use the base form of the verb.',
    pattern: /\b(didn't|did not|doesn't|does not|don't|do not|can't|cannot|can|could not|couldn't|will|won't|would|should|must|might|to) (went|saw|came|took|bought|ate|wrote|made|did|got|gave|knew|thought|told|spoke|felt|left|found|began|ran|met|paid|sent|spent|taught|brought|understood|drove|flew|slept|won|lost)\b/gi,
    fix: (_m, [a, v]) => {
      // 'to the left', 'to found a company' are fine
      if (/^to$/i.test(a) && /^(left|found)$/i.test(v)) return null;
      const base = PAST_TO_BASE[v.toLowerCase()];
      return base ? `${a} ${base}` : null;
    },
  },
  {
    id: 'aux-had', category: 'verb-tense', message: 'After a modal verb or "did", use "have", not "had".',
    pattern: /\b(didn't|did not|can't|cannot|could|couldn't|will|won't|would|should|must|might) had\b/gi,
    fix: (_m, [a]) => `${a} have`,
  },
  {
    id: 'modal-to', category: 'verb-tense', message: 'Modal verbs (can, should, must…) are followed directly by the base verb, without "to".',
    pattern: /(?<!\bthe\s)\b(can|could|should|must|might|will|would) to ([a-z]+)\b/gi,
    fix: (_m, [mod, v]) => `${mod} ${v}`,
  },
  {
    id: 'past-time-present-verb', category: 'verb-tense', message: 'Use the past tense when talking about a finished time in the past (yesterday, last year, … ago).',
    pattern: /\b(yesterday|last (?:week|month|year|night|summer|winter|weekend|time|holiday)|(?:a|one|two|three|four|five|six|seven|eight|nine|ten|few|many|\d+) (?:days|weeks|months|years) ago),? (i|we|they|he|she|my [a-z]+) (go|visit|see|have|do|make|take|eat|buy|come|meet|study|work|live|play|watch|travel|decide|start|get|feel|think|want|like|enjoy|learn|move|finish|try|stay|spend)\b/gi,
    fix: (_m, [t, s, v]) => `${t} ${s} ${pastTense(v)}`,
  },
  {
    id: 'am-agree', category: 'grammar', message: '"Agree" is a verb, so it does not need "am": say "I agree".',
    pattern: /\b(i|we|they) (?:am|are|'m|'re) (not )?agree\b/gi,
    fix: (_m, [s, neg]) => (neg ? `${s} don't agree` : `${s} agree`),
  },
  {
    id: 'since-for', category: 'grammar', message: 'Use "for" with a period of time and "since" with a starting point.',
    pattern: /\bsince (two|three|four|five|six|seven|eight|nine|ten|\d+|many|a few|several) (years|months|weeks|days|hours)\b/gi,
    fix: (_m, [n, u]) => `for ${n} ${u}`,
  },
  {
    id: 'have-years-old', category: 'grammar', message: 'In English, we say "I am … years old", not "I have … years".',
    pattern: /\b(i|he|she) (have|has) ([a-z0-9-]+) years(?: old)?\b/gi,
    fix: (_m, [s, , n]) => `${s} ${/^i$/i.test(s) ? 'am' : 'is'} ${n} years old`,
  },
  {
    id: 'it-depend', category: 'grammar', message: 'Say "it depends on", not "it is depend".',
    pattern: /\bit(?: is|'s) depend(?:s)?\b/gi,
    fix: () => 'it depends',
  },

  // ---------- Comparatives & quantifiers ----------
  {
    id: 'double-comparative', category: 'grammar', message: 'Do not use "more" with a comparative that already ends in -er.',
    pattern: /\bmore (better|worse|easier|bigger|faster|cheaper|happier|healthier|smaller|harder|older|younger|larger|busier|safer|quieter)\b/gi,
    fix: (_m, [w]) => w,
  },
  {
    id: 'double-superlative', category: 'grammar', message: 'Do not use "most" with a superlative that already ends in -est.',
    pattern: /\bmost (best|worst|easiest|biggest|fastest|cheapest|happiest|largest|smallest)\b/gi,
    fix: (_m, [w]) => w,
  },
  {
    id: 'much-countable', category: 'grammar', message: 'Use "many" with countable plural nouns.',
    pattern: /\b(so |too |very )?much (people|friends|books|things|cars|students|places|countries|times|problems|ways|reasons|children|jobs|questions)\b/gi,
    fix: (_m, [q, n]) => `${q ?? ''}many ${n}`,
  },
  {
    id: 'a-lot-of', category: 'grammar', message: 'Use "a lot of" before a noun.',
    pattern: /\ba lots of\b|\ba lot (people|friends|things|time|money|students|places)\b/gi,
    fix: (m, [n]) => (n ? `a lot of ${n}` : m.replace(/lots/i, 'lot')),
  },
  {
    id: 'uncountable-plural', category: 'grammar', message: 'This noun is uncountable in English and has no plural form.',
    pattern: /\b(informations|advices|furnitures|homeworks|equipments|knowledges|feedbacks|luggages|evidences|researches|peoples)\b/gi,
    fix: (m) => m.replace(/s$/i, ''),
  },
  {
    id: 'every-plural', category: 'grammar', message: '"Every" is followed by a singular noun.',
    pattern: /\bevery (days|weeks|months|years|mornings|nights|weekends|times)\b/gi,
    fix: (_m, [n]) => `every ${n.replace(/s$/, '')}`,
  },
  {
    id: 'one-of-plural', category: 'grammar', message: '"One of my …" is followed by a plural noun.',
    pattern: /\bone of (my|the|our|his|her) (friend|colleague|teacher|brother|sister|favourite thing|favorite thing|hobby|problem|reason|goal|dream|memory)\b/gi,
    fix: (_m, [d, n]) => `one of ${d} ${n === 'hobby' ? 'hobbies' : n === 'memory' ? 'memories' : `${n}s`}`,
  },
  {
    id: 'most-of-people', category: 'grammar', message: 'Say "most people" (general) rather than "the most of people".',
    pattern: /\b(?:the )?most of (people|students|children|countries)\b/gi,
    fix: (_m, [n]) => `most ${n}`,
  },

  // ---------- Word choice / collocations ----------
  { id: 'explain-me', category: 'word-choice', message: 'Say "explain to me", not "explain me".', pattern: /\bexplain (me|him|her|us|them)\b/gi, fix: (_m, [p]) => `explain to ${p}` },
  { id: 'say-me', category: 'word-choice', message: 'Say "tell me", not "say me".', pattern: /\bsa(y|id) (me|him|her|us|them)\b/gi, fix: (_m, [t, p]) => `${t === 'y' ? 'tell' : 'told'} ${p}` },
  { id: 'discuss-about', category: 'word-choice', message: '"Discuss" does not need "about".', pattern: /\b(discuss|discussed|discussing) about\b/gi, fix: (_m, [v]) => v },
  { id: 'mention-about', category: 'word-choice', message: '"Mention" does not need "about".', pattern: /\b(mention|mentioned) about\b/gi, fix: (_m, [v]) => v },
  { id: 'return-back', category: 'word-choice', message: '"Return" already means "go back".', pattern: /\b(return|returned) back\b/gi, fix: (_m, [v]) => v },
  { id: 'repeat-again', category: 'word-choice', message: '"Repeat" already means "do again".', pattern: /\b(repeat|repeated) again\b/gi, fix: (_m, [v]) => v },
  { id: 'married-with', category: 'word-choice', message: 'Say "married to".', pattern: /\bmarried with\b/gi, fix: () => 'married to' },
  { id: 'depend-of', category: 'word-choice', message: 'Say "depend on".', pattern: /\b(depend|depends|depending) (of|from)\b/gi, fix: (_m, [v]) => `${v} on` },
  { id: 'interested-on', category: 'word-choice', message: 'Say "interested in".', pattern: /\binterested (on|for|about)\b/gi, fix: () => 'interested in' },
  { id: 'good-in', category: 'word-choice', message: 'Say "good at" a skill.', pattern: /\b(good|bad|better|best) in (cooking|playing|speaking|writing|math|maths|english|sports|drawing|singing|swimming)\b/gi, fix: (_m, [a, s]) => `${a} at ${s}` },
  { id: 'listen-music', category: 'word-choice', message: 'Say "listen to" something.', pattern: /\b(listen|listening|listened) (music|the radio|podcasts|songs|my|him|her|them|people)\b/gi, fix: (_m, [v, o]) => `${v} to ${o}` },
  { id: 'make-photo', category: 'word-choice', message: 'We "take" photos.', pattern: /\b(make|makes|made|making) (a photo|photos|a picture|pictures)\b/gi, fix: (_m, [v, o]) => `${({ make: 'take', makes: 'takes', made: 'took', making: 'taking' } as Record<string, string>)[v.toLowerCase()]} ${o}` },
  { id: 'do-mistake', category: 'word-choice', message: 'We "make" mistakes.', pattern: /\b(do|does|did|doing) (a mistake|mistakes|an error|errors)\b/gi, fix: (_m, [v, o]) => `${({ do: 'make', does: 'makes', did: 'made', doing: 'making' } as Record<string, string>)[v.toLowerCase()]} ${o}` },
  { id: 'make-homework', category: 'word-choice', message: 'We "do" homework and exercise.', pattern: /\b(make|makes|made|making) (my homework|homework|exercise|sport|sports)\b/gi, fix: (_m, [v, o]) => `${({ make: 'do', makes: 'does', made: 'did', making: 'doing' } as Record<string, string>)[v.toLowerCase()]} ${o}` },
  { id: 'according-to-me', category: 'word-choice', message: '"According to me" sounds unnatural; use "in my opinion".', pattern: /\baccording to me\b/gi, fix: () => 'in my opinion' },
  { id: 'in-the-other-hand', category: 'word-choice', message: 'The phrase is "on the other hand".', pattern: /\bin the other hand\b/gi, fix: () => 'on the other hand' },
  { id: 'very-like', category: 'word-choice', message: '"Very" cannot modify a verb; use "really like" or "like … very much".', pattern: /\bi very (like|love|enjoy|want)\b/gi, fix: (_m, [v]) => `I really ${v}` },
  { id: 'go-to-home', category: 'word-choice', message: 'Say "go home" (no "to").', pattern: /\b(go|went|come|came|going|coming|get|got) to home\b/gi, fix: (_m, [v]) => `${v} home` },
  { id: 'go-to-trip', category: 'word-choice', message: 'We go "on" a trip.', pattern: /\b(go|goes|went|going) to (a |the )?trip\b/gi, fix: (_m, [v, d]) => `${v} on ${d ?? 'a '}trip` },
  { id: 'enjoy-to', category: 'word-choice', message: 'After "enjoy", use the -ing form.', pattern: /\b(enjoy|enjoys|enjoyed) to ([a-z]+)\b/gi, fix: (_m, [v, w]) => `${v} ${w.endsWith('e') && w !== 'see' ? w.slice(0, -1) : w}ing` },
];
