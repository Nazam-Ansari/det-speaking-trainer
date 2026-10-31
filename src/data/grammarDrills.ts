/**
 * Speaking drills: short questions whose natural answer uses one grammar point, so a learner
 * who often gets that point wrong has to produce it. Each focus maps to grammar rule ids
 * (see engines/evaluation/grammarRules.ts) so recurring mistakes can pick the right drill.
 */

export interface GrammarDrill {
  id: string;
  title: string;
  /** Short explanation, in English and Roman Urdu. */
  rule: string;
  urdu: string;
  example: { wrong: string; right: string };
  ruleIds: string[];
  questions: string[];
}

export const GRAMMAR_DRILLS: GrammarDrill[] = [
  {
    id: 'third-person',
    title: 'He / she + verb-s',
    rule: 'In the present simple, add -s to the verb after he, she, it or one person: "she works", "my father drives". Use "doesn\'t", not "don\'t".',
    urdu: 'Present simple mein he/she/it ya ek shakhs ke baad verb par -s lagao: "she works", "my father drives". "Don\'t" ki jagah "doesn\'t" bolo.',
    example: { wrong: 'My brother go to school by bus.', right: 'My brother goes to school by bus.' },
    ruleIds: ['third-person-s', 'dont-doesnt', 'people-who-lives'],
    questions: [
      'What does your best friend do on weekends?',
      'What does your father or mother do every morning?',
      'Tell me about someone in your family. What does he or she like doing?',
      'What does your favourite teacher usually do in class?',
      'Where does your best friend live, and what does he or she do?',
      'What does a doctor do every day?',
      'Describe a neighbour. What does he or she usually do?',
    ],
  },
  {
    id: 'past-tense',
    title: 'Past tense',
    rule: 'For finished time (yesterday, last week, two days ago) use the past: "I went", "I watched". After "did/didn\'t" use the base verb: "I didn\'t go".',
    urdu: 'Guzra hua waqt (yesterday, last week, ago) ho to past tense bolo: "I went", "I watched". "Did/didn\'t" ke baad verb ki asal form: "I didn\'t go".',
    example: { wrong: 'Yesterday I go to the market with my sister.', right: 'Yesterday I went to the market with my sister.' },
    ruleIds: ['past-time-present-verb', 'aux-past', 'aux-had'],
    questions: [
      'What did you do last weekend?',
      'What did you eat yesterday?',
      'Tell me about a trip you took last year.',
      'What did you do on your last birthday?',
      'Where did you go two days ago?',
      'What was the last film you watched? What happened in it?',
      'What did you do yesterday evening?',
    ],
  },
  {
    id: 'articles',
    title: 'a / an / the',
    rule: 'One countable thing needs "a" or "an": "a car", "an apple", "I am a student". Use "an" before a vowel sound.',
    urdu: 'Ek ginne wali cheez ke saath "a" ya "an" zaroori hai: "a car", "an apple", "I am a student". Vowel ki awaaz se pehle "an".',
    example: { wrong: 'I am engineer and I have big house.', right: 'I am an engineer and I have a big house.' },
    ruleIds: ['a-an-vowel', 'an-a-consonant', 'missing-article-adj-noun', 'missing-article-profession', 'missing-article-there-is'],
    questions: [
      'What is your job, or what do you study?',
      'Describe your bedroom. What is in it?',
      'What is in your bag right now?',
      'Describe a gift you received.',
      'What is there near your house?',
      'What job would you like to have in the future?',
      'Describe an animal you like.',
    ],
  },
  {
    id: 'agreement',
    title: 'is / are, there is / there are',
    rule: 'Match the verb to the subject: "I am", "he is", "they are". Use "there are" with plural nouns. Don\'t add -s after I / you / we / they.',
    urdu: 'Verb ko subject ke mutabiq rakho: "I am", "he is", "they are". Jama (plural) ke saath "there are". I/you/we/they ke baad verb par -s mat lagao.',
    example: { wrong: 'There is many shops and they is very cheap.', right: 'There are many shops and they are very cheap.' },
    ruleIds: ['be-agreement', 'plural-subject-s', 'there-are'],
    questions: [
      'What are your parents like?',
      'What do your friends usually do together?',
      'How many people are there in your family?',
      'What are the shops like near your home?',
      'What are your favourite foods?',
      'What do people in your country usually eat for breakfast?',
    ],
  },
  {
    id: 'quantities',
    title: 'many / much, plurals',
    rule: '"Many" with countable plurals (many books), "much" with uncountable (much time). "One of my friends" (plural). "Every day" (singular). Say "most people", not "the most of people".',
    urdu: 'Ginne wali cheezon ke saath "many", na ginne wali ke saath "much". "One of my friends" (plural). "Every day" (singular). "Most people" bolo.',
    example: { wrong: 'One of my friend has much books.', right: 'One of my friends has many books.' },
    ruleIds: ['much-countable', 'a-lot-of', 'uncountable-plural', 'every-plural', 'one-of-plural', 'most-of-people'],
    questions: [
      'What do most people in your city do on weekends?',
      'Who is one of your best friends? Describe him or her.',
      'How many books do you read in a year?',
      'What kind of furniture is in your living room?',
      'What do you do every day after work or school?',
      'How much free time do you have during the week?',
    ],
  },
  {
    id: 'prepositions',
    title: 'Word partners (listen to, good at…)',
    rule: 'Some words always take the same partner: listen to, interested in, good at, married to, depend on, go home, take a photo, make a mistake, do homework.',
    urdu: 'Kuch alfaaz ka saathi hamesha wahi hota hai: listen to, interested in, good at, married to, depend on, go home, take a photo, make a mistake, do homework.',
    example: { wrong: 'I am interested on music and I listen music every day.', right: 'I am interested in music and I listen to music every day.' },
    ruleIds: ['explain-me', 'say-me', 'discuss-about', 'mention-about', 'return-back', 'repeat-again', 'married-with', 'depend-of', 'interested-on', 'good-in', 'listen-music', 'make-photo', 'do-mistake', 'make-homework', 'go-to-home', 'go-to-trip', 'enjoy-to', 'very-like', 'according-to-me', 'in-the-other-hand'],
    questions: [
      'What kind of music do you listen to?',
      'What subjects or hobbies are you interested in?',
      'What are you good at?',
      'What time do you usually go home, and what do you do then?',
      'Do you like taking photos? What do you take photos of?',
      'What do you enjoy doing on holiday?',
      'What do you do when you make a mistake at work or school?',
    ],
  },
  {
    id: 'phrases',
    title: 'Common phrases (I agree, years old, for/since)',
    rule: 'Say "I agree" (not "I am agree"), "I can swim" (not "I can to swim"), "I am 25 years old" (not "I have 25 years"), "for two years" (a period) but "since 2020" (a starting point), "it depends on".',
    urdu: '"I agree" bolo ("I am agree" nahi), "I am 25 years old" ("I have 25 years" nahi), "for two years" (muddat) lekin "since 2020" (shuruaat), "it depends on".',
    example: { wrong: 'I have 22 years and I am agree that it is depend on the person.', right: 'I am 22 years old and I agree that it depends on the person.' },
    ruleIds: ['am-agree', 'modal-to', 'since-for', 'have-years-old', 'it-depend', 'double-comparative', 'double-superlative'],
    questions: [
      'How old are you, and how long have you lived in your city?',
      'Do you agree that exercise is important? Why?',
      'Is your city bigger or smaller than a village? Compare them.',
      'Do you prefer tea or coffee? Does it depend on something?',
      'How long have you been learning English?',
      'What is the best place you have ever visited?',
    ],
  },
];

/** Finds the drill a grammar rule belongs to. */
export function drillForRule(ruleId: string): GrammarDrill | undefined {
  return GRAMMAR_DRILLS.find((d) => d.ruleIds.includes(ruleId));
}
