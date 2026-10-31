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
  /** Each question with a short model answer the learner can listen to. */
  questions: { q: string; sample: string }[];
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
      { q: 'What does your best friend do on weekends?', sample: 'My best friend usually plays football on Saturday morning. In the afternoon, he visits his grandparents, and on Sunday he watches films at home.' },
      { q: 'What does your father or mother do every morning?', sample: 'My mother wakes up at six every morning. She makes breakfast for the family, and then she drives to her office.' },
      { q: 'Tell me about someone in your family. What does he or she like doing?', sample: 'My younger sister loves drawing. She spends hours in her room and draws animals and people. She also likes music, so she often listens to songs while she works.' },
      { q: 'What does your favourite teacher usually do in class?', sample: 'My favourite teacher always starts the class with a question. She explains the lesson very clearly, and she gives us real examples from daily life.' },
      { q: 'Where does your best friend live, and what does he or she do?', sample: 'My best friend lives in Lahore, near the university. He studies computer science and works part-time in a mobile shop.' },
      { q: 'What does a doctor do every day?', sample: 'A doctor checks patients, asks them about their problems and gives them medicine. A doctor also reads reports and talks to other doctors.' },
      { q: 'Describe a neighbour. What does he or she usually do?', sample: 'My neighbour is a retired teacher. He walks in the park every morning, and he waters his plants in the evening. He always says hello to everyone.' },
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
      { q: 'What did you do last weekend?', sample: 'Last weekend I visited my cousins. We played cricket in the afternoon, and in the evening we ate dinner together and watched a film.' },
      { q: 'What did you eat yesterday?', sample: 'Yesterday I ate eggs and bread for breakfast. For lunch I had rice with chicken, and in the evening I made a simple vegetable soup.' },
      { q: 'Tell me about a trip you took last year.', sample: 'Last year I went to the north of my country with my friends. We stayed in a small hotel, walked in the mountains and took a lot of photos.' },
      { q: 'What did you do on your last birthday?', sample: 'On my last birthday, my family organised a small party. My mother baked a cake, and my friends came to my house. I received some nice gifts.' },
      { q: 'Where did you go two days ago?', sample: 'Two days ago I went to the bank because I needed to open an account. After that, I bought some groceries and came back home.' },
      { q: 'What was the last film you watched? What happened in it?', sample: 'The last film I watched was an action film. A young man lost his job, but then he found a secret plan and saved the city.' },
      { q: 'What did you do yesterday evening?', sample: 'Yesterday evening I finished my homework, called my best friend and went for a short walk. Then I read a book before I slept.' },
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
      { q: 'What is your job, or what do you study?', sample: 'I am a student. I study business at a university, and I also work as an assistant in a small company.' },
      { q: 'Describe your bedroom. What is in it?', sample: 'My bedroom is small but comfortable. There is a bed, a desk and a big window. On the desk there is a laptop and a lamp.' },
      { q: 'What is in your bag right now?', sample: 'In my bag there is a phone charger, a notebook and a water bottle. There is also an umbrella, because it might rain today.' },
      { q: 'Describe a gift you received.', sample: 'Last year my brother gave me a watch. It is an expensive watch with a black strap, and I wear it every day.' },
      { q: 'What is there near your house?', sample: 'Near my house there is a park and a small market. There is also a mosque and a bus stop on the main road.' },
      { q: 'What job would you like to have in the future?', sample: 'In the future, I would like to be an engineer. I want to work for an international company and build useful things.' },
      { q: 'Describe an animal you like.', sample: 'I really like cats. A cat is an independent animal, but it is also friendly. My aunt has a white cat with blue eyes.' },
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
      { q: 'What are your parents like?', sample: 'My parents are kind and hard-working. My father is quite serious, but my mother is very funny. They are always ready to help me.' },
      { q: 'What do your friends usually do together?', sample: 'My friends and I usually meet on Friday evenings. We play games, we talk about our studies, and sometimes we go out for dinner.' },
      { q: 'How many people are there in your family?', sample: 'There are five people in my family: my parents, my two sisters and me. My sisters are younger than me.' },
      { q: 'What are the shops like near your home?', sample: 'The shops near my home are small but busy. There are two bakeries and a pharmacy, and the prices are quite cheap.' },
      { q: 'What are your favourite foods?', sample: 'My favourite foods are biryani and kebabs. They are spicy and full of flavour. I also like fruits, especially mangoes.' },
      { q: 'What do people in your country usually eat for breakfast?', sample: 'People in my country usually eat paratha and eggs for breakfast. Many people drink tea, and some families eat bread with butter.' },
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
      { q: 'What do most people in your city do on weekends?', sample: 'Most people in my city go shopping or visit their relatives on weekends. Many families also go to parks or restaurants.' },
      { q: 'Who is one of your best friends? Describe him or her.', sample: 'One of my best friends is Ali. He is tall and very friendly, and he has many interesting ideas. We have known each other for ten years.' },
      { q: 'How many books do you read in a year?', sample: 'I read about ten books a year. I do not have much time during the week, so I read many pages on weekends.' },
      { q: 'What kind of furniture is in your living room?', sample: 'In our living room there is some simple furniture: a big sofa, two chairs and a wooden table. We also have a lot of cushions.' },
      { q: 'What do you do every day after work or school?', sample: 'Every day after university, I have lunch and rest for an hour. Then I study, and in the evening I spend some time with my family.' },
      { q: 'How much free time do you have during the week?', sample: 'I do not have much free time during the week, maybe two hours a day. I use most of it to exercise and talk to my friends.' },
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
      { q: 'What kind of music do you listen to?', sample: 'I listen to pop music and old songs. I usually listen to music when I am travelling on the bus.' },
      { q: 'What subjects or hobbies are you interested in?', sample: 'I am interested in history and technology. I am also interested in cooking, and I enjoy trying new recipes at home.' },
      { q: 'What are you good at?', sample: 'I am good at mathematics and I am quite good at football. I am not very good at drawing, though.' },
      { q: 'What time do you usually go home, and what do you do then?', sample: 'I usually go home at five o\'clock. When I get home, I have a cup of tea and then I do my homework.' },
      { q: 'Do you like taking photos? What do you take photos of?', sample: 'Yes, I like taking photos. I usually take photos of nature, like sunsets and mountains, and I sometimes take photos of my friends.' },
      { q: 'What do you enjoy doing on holiday?', sample: 'On holiday I enjoy visiting new places and trying local food. I also enjoy sleeping late and reading.' },
      { q: 'What do you do when you make a mistake at work or school?', sample: 'When I make a mistake, I try to understand why it happened. I explain the problem to my teacher and I fix it as soon as possible.' },
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
      { q: 'How old are you, and how long have you lived in your city?', sample: 'I am twenty-two years old. I have lived in my city for fifteen years, since I was seven.' },
      { q: 'Do you agree that exercise is important? Why?', sample: 'Yes, I agree that exercise is very important. It keeps our body healthy, and it also makes us feel happier and less stressed.' },
      { q: 'Is your city bigger or smaller than a village? Compare them.', sample: 'My city is much bigger than a village. It is busier and noisier, but a village is quieter and cleaner than a city.' },
      { q: 'Do you prefer tea or coffee? Does it depend on something?', sample: 'I usually prefer tea, but it depends on the time of day. In the morning I can drink coffee, but in the evening I always drink tea.' },
      { q: 'How long have you been learning English?', sample: 'I have been learning English for eight years. I started at school, and now I also practise speaking online every week.' },
      { q: 'What is the best place you have ever visited?', sample: 'The best place I have ever visited is a lake in the mountains. It was the most beautiful and peaceful place I have seen.' },
    ],
  },
];

/** Finds the drill a grammar rule belongs to. */
export function drillForRule(ruleId: string): GrammarDrill | undefined {
  return GRAMMAR_DRILLS.find((d) => d.ruleIds.includes(ruleId));
}
