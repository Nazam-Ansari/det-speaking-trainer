/**
 * How to fill a long (up to 3-minute) Speaking Sample answer: each question type is split
 * into parts with a time slot. Times are for a 180-second answer and scale to other limits.
 */

export interface FrameworkPart {
  name: string;
  /** Start and end, in seconds of a 180-second answer. */
  from: number;
  to: number;
  what: string;
  urdu: string;
  phrases: string[];
}

export interface SpeakingFramework {
  id: string;
  title: string;
  /** How to recognise the question type. */
  looksLike: string;
  parts: FrameworkPart[];
  /** A worked question: the 5-keyword plan, and a full answer with one paragraph per part. */
  example: { question: string; plan: string[]; sample: string[] };
}

export const FULL_SECONDS = 180;

export const FRAMEWORKS: SpeakingFramework[] = [
  {
    id: 'opinion',
    title: 'Opinion (agree / disagree, should…?)',
    looksLike: '"Do you agree…?", "Should…?", "What is your opinion…?", "To what extent…?"',
    parts: [
      { name: 'Introduction', from: 0, to: 20, what: 'Repeat the question in your own words and give your opinion clearly.', urdu: 'Sawal ko apne lafzon mein dohrao aur saaf batao ke aap agree karte ho ya nahi.', phrases: ['This is an interesting question.', 'In my opinion, …', 'I strongly believe that …'] },
      { name: 'Reason 1 + example', from: 20, to: 70, what: 'Your strongest reason. Explain it, then give a real example from your life or country.', urdu: 'Sab se mazboot wajah. Usay samjhao, phir apni zindagi ya mulk se ek asli misaal do.', phrases: ['The main reason is that …', 'For example, …', 'This means that …'] },
      { name: 'Reason 2 + example', from: 70, to: 120, what: 'A second, different reason with its own example.', urdu: 'Doosri, alag wajah aur uski apni misaal.', phrases: ['Another reason is …', 'For instance, …', 'As a result, …'] },
      { name: 'The other side', from: 120, to: 155, what: 'Say what people who disagree think, then explain why you still hold your view.', urdu: 'Batao jo log aap se ikhtilaf karte hain woh kya sochte hain, phir batao ke aap phir bhi apni rai par kyun qaim ho.', phrases: ['Some people argue that …', 'However, …', 'Although this is true, …'] },
      { name: 'Conclusion', from: 155, to: 180, what: 'Repeat your opinion and your two reasons in one or two sentences.', urdu: 'Apni rai aur dono wajahen ek do jumlon mein dohra do.', phrases: ['In conclusion, …', 'For these reasons, I believe …', 'Overall, …'] },
    ],
    example: {
      question: 'Some people think that children should not be allowed to have smartphones. Do you agree or disagree?',
      plan: [
        'Intro: I partly disagree — children can have phones, but with clear rules.',
        'Reason 1: safety — parents can call them; e.g. my younger brother calls home after school.',
        'Reason 2: learning — apps for maths and English; e.g. he learned the times tables on an app.',
        'Other side: phones can be addictive and hurt sleep. However, screen-time limits solve most of this.',
        'Conclusion: phones are useful tools for children if parents set limits.',
      ],
      sample: [
        'This is an interesting question, because almost every child today wants a phone. In my opinion, children should be allowed to have smartphones, but only with clear rules from their parents.',
        'The main reason is safety. When children go to school or visit friends, parents need a way to contact them. For example, my younger brother is twelve, and he always calls my mother when he leaves school. If the bus is late or there is a problem, she knows immediately. This gives the whole family peace of mind, and it also teaches him to be responsible.',
        'Another reason is learning. A smartphone is not only for games; there are excellent apps for maths, languages and science. For instance, my brother learned his times tables with a free app that turns practice into a game. He also watches short science videos when he has a question about something he saw in class. As a result, his marks have improved this year.',
        'Some people argue that phones are addictive and that children spend too much time on social media instead of playing outside or sleeping. Although this is true, I think the problem is not the phone itself but how it is used. Parents can set screen-time limits, keep phones out of the bedroom at night and check which apps their children download.',
        'In conclusion, I believe children can have smartphones, because they make them safer and help them learn. However, parents must set limits, so that the phone remains a useful tool and not a distraction.',
      ],
    },
  },
  {
    id: 'describe',
    title: 'Describe (a person, place, experience, thing)',
    looksLike: '"Describe…", "Talk about a time when…", "Tell me about…"',
    parts: [
      { name: 'Introduction', from: 0, to: 20, what: 'Say what or who you will talk about, and when/where it was.', urdu: 'Batao aap kis cheez ya shakhs ke baare mein baat karoge, aur woh kab/kahan tha.', phrases: ['I would like to talk about …', 'This happened when I was …'] },
      { name: 'Details: what / who', from: 20, to: 70, what: 'Describe it: what it looks like, what the person is like, what you did. Use adjectives.', urdu: 'Tafseel do: kaisa dikhta hai, woh shakhs kaisa hai, aap ne kya kiya. Sifat (adjectives) istemaal karo.', phrases: ['It was a … place with …', 'He is the kind of person who …', 'First, … then …'] },
      { name: 'A specific story', from: 70, to: 120, what: 'Tell one specific moment or memory, step by step, in the past tense.', urdu: 'Ek khaas lamha ya yaad qadam ba qadam sunao, past tense mein.', phrases: ['I remember one day when …', 'After that, …', 'Suddenly, …'] },
      { name: 'Feelings and why it matters', from: 120, to: 160, what: 'How you felt, what you learned, why it is important to you.', urdu: 'Aap ne kaisa mehsoos kiya, kya seekha, aur yeh aap ke liye kyun ahem hai.', phrases: ['I felt really …', 'What I learned was …', 'It is important to me because …'] },
      { name: 'Conclusion', from: 160, to: 180, what: 'One or two sentences to finish.', urdu: 'Ek do jumlon mein khatam karo.', phrases: ['All in all, …', "That's why I will never forget …"] },
    ],
    example: {
      question: 'Talk about a time when you helped someone. What happened, and how did you feel afterwards?',
      plan: [
        'Intro: last winter I helped an old neighbour, Mr Khan.',
        'Details: he lives alone; his heater broke during a very cold week.',
        'Story: I noticed his lights were off, knocked, found him cold; called a repairman, brought him tea and blankets.',
        'Feelings: proud and happy; learned to notice people around me.',
        'Conclusion: a small action can make a big difference.',
      ],
      sample: [
        'I would like to talk about a time when I helped my neighbour, an old man called Mr Khan. This happened last winter, during a very cold week in January.',
        'Mr Khan is about seventy-five years old, and he lives alone in the house next to ours. His children work in another city, so he does not have many visitors. He is a kind and quiet man who always greets everyone in the street, and he loves his small garden. That week the weather was freezing, and the temperature at night was below zero.',
        'I remember one evening when I came home from university and noticed that his lights were off much earlier than usual. I was worried, so I knocked on his door. After a few minutes he opened it, wearing two jackets, and he told me that his heater had stopped working two days before. I immediately called a repairman my father knows, and while we waited, I brought him a hot cup of tea and some extra blankets from our house. The repairman came the same night and fixed the heater in about an hour.',
        'Afterwards I felt really proud and happy, because I could see how relieved he was. He thanked me again and again, and the next day he sent us a box of sweets. What I learned was that we should notice the people around us, especially older people who live alone. It is important to me because it showed me that a small action can change someone\'s day.',
        'All in all, it was a simple thing to do, but I will never forget his smile that evening. Now I visit him every week to check that everything is fine.',
      ],
    },
  },
  {
    id: 'advantages',
    title: 'Advantages and disadvantages',
    looksLike: '"What are the advantages and disadvantages…?", "Discuss both…", "…pros and cons"',
    parts: [
      { name: 'Introduction', from: 0, to: 20, what: 'Introduce the topic and say there are both good and bad sides.', urdu: 'Topic introduce karo aur batao ke iske achay aur buray dono pehlu hain.', phrases: ['… has both advantages and disadvantages.', 'Let me talk about both sides.'] },
      { name: 'Advantages', from: 20, to: 80, what: 'Two advantages, each with a short explanation or example.', urdu: 'Do faiday, har ek ke saath choti wazahat ya misaal.', phrases: ['The biggest advantage is …', 'Another benefit is …', 'For example, …'] },
      { name: 'Disadvantages', from: 80, to: 140, what: 'Two disadvantages, each with a short explanation or example.', urdu: 'Do nuqsanaat, har ek ke saath wazahat ya misaal.', phrases: ['On the other hand, …', 'One major drawback is …', 'Another problem is …'] },
      { name: 'Your opinion', from: 140, to: 165, what: 'Which side is stronger for you, and why.', urdu: 'Aap ke khayal mein kaun sa pehlu zyada mazboot hai, aur kyun.', phrases: ['Personally, I think the advantages outweigh …', 'In my case, …'] },
      { name: 'Conclusion', from: 165, to: 180, what: 'Sum up in one sentence.', urdu: 'Ek jumle mein khulasa.', phrases: ['To sum up, …'] },
    ],
    example: {
      question: 'Is it better to work from home or in an office? Discuss the advantages and disadvantages of each.',
      plan: [
        'Intro: both have clear benefits and problems.',
        'Advantages of home: no commute (saves 2 hours a day), flexible schedule.',
        'Disadvantages of home: lonely, hard to separate work and family time.',
        'Opinion: a mix is best — two days in the office for teamwork, three at home.',
        'Conclusion: hybrid work gives the advantages of both.',
      ],
      sample: [
        'Working from home became very common after the pandemic, and today many companies offer both options. Both working from home and working in an office have clear advantages and disadvantages, so let me talk about both sides.',
        'The biggest advantage of working from home is that there is no commute. For example, my cousin used to spend two hours a day in traffic, and now he uses that time to exercise and have breakfast with his family. Another benefit is flexibility. People can organise their day around their own needs, for instance by starting early and finishing early. Companies can also save money on office space.',
        'On the other hand, working from home can be lonely. You do not meet your colleagues, so it is harder to build friendships or learn from more experienced people. One major drawback is that it is difficult to separate work and family life, because the office is also your living room. Another problem is communication: a quick question that takes one minute in an office can take an hour by email.',
        'Personally, I think the best solution is a mix of both. In my case, I would like to work two days in the office for meetings and teamwork, and three days at home for tasks that need concentration. This way, employees keep the social benefits of the office and the freedom of working from home.',
        'To sum up, both options have strengths and weaknesses, but a hybrid model gives people the advantages of both.',
      ],
    },
  },
  {
    id: 'problem',
    title: 'Problem and solution (how should…?, what can be done…?)',
    looksLike: '"How can…?", "What could be done…?", "What are the best ways…?", "How should … prepare?"',
    parts: [
      { name: 'Introduction', from: 0, to: 25, what: 'Explain the problem in one or two sentences and why it matters.', urdu: 'Masla ek do jumlon mein samjhao aur batao ke yeh kyun ahem hai.', phrases: ['Nowadays, … is a serious problem.', 'This matters because …'] },
      { name: 'Solution 1', from: 25, to: 80, what: 'Your best solution: what to do, who should do it, how it helps, an example.', urdu: 'Sab se acha hal: kya karna chahiye, kaun kare, kaise madad karega, ek misaal.', phrases: ['The first thing we could do is …', 'This would help because …', 'For example, in my city …'] },
      { name: 'Solution 2', from: 80, to: 130, what: 'A second solution, from a different angle (government / people / schools…).', urdu: 'Doosra hal, alag zaviye se (hukumat / awaam / schools…).', phrases: ['Another solution is …', 'The government should also …'] },
      { name: 'Challenges or a third idea', from: 130, to: 160, what: 'A difficulty with the solutions, or one more quick idea.', urdu: 'In hal mein koi mushkil, ya ek aur chota idea.', phrases: ['Of course, this will not be easy because …', 'Finally, individuals can …'] },
      { name: 'Conclusion', from: 160, to: 180, what: 'Summarise the solutions.', urdu: 'Hal ka khulasa karo.', phrases: ['In conclusion, if we …, we can …'] },
    ],
    example: {
      question: 'What are the most effective ways for ordinary people to reduce their impact on the environment?',
      plan: [
        'Intro: climate change and pollution affect everyone; small daily actions add up.',
        'Solution 1: use public transport or cycle; e.g. I take the bus to university.',
        'Solution 2: reduce plastic — reusable bags and bottles.',
        'Challenge / idea 3: habits are hard to change; start with one change per month; eat less meat.',
        'Conclusion: transport, plastic and food choices are the easiest places to start.',
      ],
      sample: [
        'Nowadays, pollution and climate change are serious problems, and many people think that only governments and big companies can solve them. However, the daily choices of ordinary people also matter, because millions of small actions add up.',
        'The first thing we could do is change the way we travel. Cars are one of the main sources of air pollution in cities. If more people used public transport, cycled or walked for short distances, the air would be much cleaner and the roads less crowded. For example, I take the bus to university every day instead of asking my father to drive me, and it costs much less.',
        'Another solution is to reduce plastic waste. Plastic bags and bottles stay in the environment for hundreds of years and often end up in rivers and the sea. People can carry a reusable shopping bag and a metal water bottle, and they can choose products with less packaging. In my family, we started doing this last year, and our rubbish has decreased a lot.',
        'Of course, this will not be easy, because habits are hard to change. That is why it is better to start with one small change every month. Finally, individuals can also eat less meat and waste less food, which saves water and energy.',
        'In conclusion, if ordinary people change how they travel, use less plastic and think about their food, we can reduce our impact on the environment without waiting for others to act.',
      ],
    },
  },
  {
    id: 'choice',
    title: 'Choice / preference (would you rather…?, which do you prefer?)',
    looksLike: '"Would you rather…?", "Which do you prefer…?", "Is it better to … or …?"',
    parts: [
      { name: 'Introduction', from: 0, to: 20, what: 'State your choice immediately.', urdu: 'Foran apna intikhab batao.', phrases: ['If I had to choose, I would …', 'I definitely prefer …'] },
      { name: 'Reason 1 + example', from: 20, to: 70, what: 'Main reason for your choice, with an example.', urdu: 'Apne intikhab ki sab se bari wajah, misaal ke saath.', phrases: ['The main reason is …', 'For example, …'] },
      { name: 'Reason 2 + example', from: 70, to: 120, what: 'A second reason with an example.', urdu: 'Doosri wajah, misaal ke saath.', phrases: ['Another reason is …', 'In my experience, …'] },
      { name: 'Why not the other option', from: 120, to: 155, what: 'Admit one good point of the other option, then say why it is less important for you.', urdu: 'Doosre option ki ek achi baat maano, phir batao ke aap ke liye woh kam ahem kyun hai.', phrases: ['Of course, … also has advantages, such as …', 'However, for me …'] },
      { name: 'Conclusion', from: 155, to: 180, what: 'Repeat your choice and the main reason.', urdu: 'Apna intikhab aur bari wajah dohrao.', phrases: ["That's why I would choose …", 'Overall, …'] },
    ],
    example: {
      question: 'Would you rather have a job with a high salary or a job you really enjoy?',
      plan: [
        'Intro: I would choose a job I enjoy.',
        'Reason 1: we spend most of our life at work; e.g. my uncle earns a lot but is always stressed.',
        'Reason 2: if you enjoy your work, you do it well and get promoted, so money often follows.',
        'Other option: a high salary gives security for family; however, enough money is fine for me.',
        'Conclusion: happiness at work matters more than a big salary.',
      ],
      sample: [
        'This is a difficult choice, because money is important for everyone. However, if I had to choose, I would definitely prefer a job that I really enjoy rather than a job with a high salary.',
        'The main reason is that we spend most of our adult life at work, usually around forty hours a week. If I do something I hate, I will feel tired and unhappy every day, even with a lot of money. For example, my uncle has a very well-paid job in a bank, but he is always stressed. He often says that he cannot remember the last time he enjoyed a weekend.',
        'Another reason is that people who enjoy their work usually do it better. They are more creative, they learn faster and they stay longer in the same field. In my experience, when I enjoy a subject at university, I study more and get better results without forcing myself. So in the long term, a job I enjoy can also lead to promotions, and the money often follows.',
        'Of course, a high salary also has advantages, such as security for your family, a nice house and the chance to travel. However, for me, enough money to live comfortably is more important than a very big salary, because happiness cannot be bought.',
        'That\'s why I would choose a job I really enjoy. Overall, I believe that being happy at work is the key to a successful and healthy life.',
      ],
    },
  },
  {
    id: 'future',
    title: 'Future / change (how will … change?)',
    looksLike: '"How will … be different in the future?", "How has … changed?", "In thirty years…"',
    parts: [
      { name: 'Introduction', from: 0, to: 20, what: 'Say that big changes are coming and name the areas you will discuss.', urdu: 'Batao ke bari tabdeeliyan aa rahi hain aur kin shobon par baat karoge.', phrases: ['I think … will change a lot, especially in two areas: …'] },
      { name: 'Area 1', from: 20, to: 75, what: 'First area: how it is now → how it will be, with an example.', urdu: 'Pehla shoba: abhi kaisa hai → aage kaisa hoga, misaal ke saath.', phrases: ['At the moment, … In the future, … will probably …'] },
      { name: 'Area 2', from: 75, to: 130, what: 'Second area, same pattern.', urdu: 'Doosra shoba, usi tarah.', phrases: ['Another area is …', 'People might …'] },
      { name: 'Good or bad?', from: 130, to: 160, what: 'Are these changes positive or negative? Why?', urdu: 'Yeh tabdeeliyan achi hain ya buri? Kyun?', phrases: ['I think this will be mostly positive because …', 'However, there is a risk that …'] },
      { name: 'Conclusion', from: 160, to: 180, what: 'Short summary.', urdu: 'Mukhtasar khulasa.', phrases: ['To sum up, …'] },
    ],
    example: {
      question: 'How do you think daily life will be different in thirty years?',
      plan: [
        'Intro: technology will change daily life, especially transport and work.',
        'Area 1 transport: now traffic jams; future self-driving electric cars, cleaner air.',
        'Area 2 work: more AI, more remote work, shorter weeks maybe.',
        'Good or bad: mostly positive, but people need new skills or they may lose jobs.',
        'Conclusion: life will be easier if we prepare.',
      ],
      sample: [
        'I think daily life will be very different in thirty years, mainly because technology is developing so quickly. In my opinion, the biggest changes will happen in two areas: transport and work.',
        'At the moment, most cities have terrible traffic jams, and cars produce a lot of pollution. In the future, I think most cars will be electric and many of them will probably drive themselves. People might read or rest while their car takes them to work. For example, some cities already test self-driving taxis, so in thirty years this could be completely normal. As a result, the air will be cleaner and there will be fewer accidents.',
        'Another area is work. Artificial intelligence will probably do many repetitive tasks, such as writing reports, answering simple customer questions or checking documents. More people will work from home, and some companies might even move to a four-day working week. People will also need to keep learning new skills throughout their lives, because jobs will change faster than today.',
        'I think these changes will be mostly positive, because life will be more comfortable and healthier. However, there is a risk that some people will lose their jobs, especially those who cannot get new training. Governments will need to help them.',
        'To sum up, transport and work will change the most, and if we prepare well, life in thirty years can be easier and cleaner than it is now.',
      ],
    },
  },
];

/** Picks the framework that fits a question's wording. */
export function frameworkFor(question: string): SpeakingFramework {
  const q = question.toLowerCase();
  const id =
    /advantages|disadvantages|pros and cons|discuss both/.test(q) ? 'advantages'
      // "If you could visit…", "Where would you like to live…" are imagined descriptions.
      : /^(describe|talk about|tell me about|if you could|where would you)/.test(q) && !/what could be done|solve/.test(q) ? 'describe'
        : /would you rather|which do you prefer|\bprefer\b|is it better to/.test(q) && !/agree/.test(q) ? 'choice'
          : /future|in (ten|twenty|thirty|\d+) years|will .* (be different|change|replace)|how has .* changed/.test(q) ? 'future'
            : /how (can|could|should)|what could be done|what can be done|ways (to|for)|what could help|solve|prepare/.test(q) ? 'problem'
              : 'opinion';
  return FRAMEWORKS.find((f) => f.id === id)!;
}
