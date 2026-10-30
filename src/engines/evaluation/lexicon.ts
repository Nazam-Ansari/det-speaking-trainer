// Word lists used by the evaluation engine.

/** High-frequency English words (and common inflections). Words NOT in this list count as "less common". */
export const COMMON_WORDS = new Set(`
a about above across after again against ago all almost alone along already also although always am among an and another any anyone anything are area around as ask asked at away back bad be became because become been before began behind being believe best better between big bit book books both boy brother but buy by call called came can can't car care case change child children city class close come comes coming could couldn't country course day days did didn't different do does doesn't doing don't done door down during each early easy eat end enough even evening ever every everyone everything example eye eyes face fact family far father feel feeling few find fine first food for found free friend friends from front full fun game gave get gets getting girl give go goes going gone good got great group grow had hand happen happened happy hard has have having he head hear heard help her here high him his home hope hour hours house how however i i'd i'll i'm i've idea if important in inside interesting into is isn't it it's its job just keep kind knew know large last late later learn learned least leave left less let life like liked little live lived lives living long look looked looking lot lots love made make makes making man many maybe me mean men might mind minute money more morning most mother move much music must my myself name need never new next nice night no not nothing now number of off often oh old on once one only open or other our out over own part people person picture place places plan play played please point possible problem put question quite rather read really reason right room run said same saw say school see seem seems seen she should show side since small so some someone something sometimes soon start started still stop story student students study studying such sure take taken talk teacher tell than thank that that's the their them then there there's these they thing things think thought this those though three through time times to today together told too took top tried try trying turn two under understand until up us use used usually very want wanted was wasn't water way we we're week weekend well went were what when where which while white who whole why will with without woman women word work worked working world would wouldn't write year years yes yet you you're young your
also actually basically really probably usually maybe sometimes yesterday tomorrow favourite favorite beautiful wonderful everybody somebody anyone everywhere morning afternoon weekend holiday kitchen restaurant computer internet phone teacher teachers country countries family families friends picture photo image window table something anything nothing everything another together without because different important interesting example problem question person people children husband wife daughter son parents brother sister mother father grandmother grandfather
`.split(/\s+/).filter(Boolean));

/** Function words ignored for repetition and relevance checks. */
export const STOPWORDS = new Set(`
a an the and or but so because if then than that this these those there here is are was were be been being am do does did have has had i you he she it we they me him her us them my your his its our their mine yours to of in on at by for with from up down out over about into as just very really also too not no yes can could will would should may might must shall what which who whom whose when where why how all any some each every one two it's i'm don't can't that's there's i've i'll
`.split(/\s+/).filter(Boolean));

export const FILLERS = ['um', 'uh', 'erm', 'er', 'ah', 'hmm', 'like', 'you know', 'i mean', 'basically', 'actually', 'kind of', 'sort of', 'you see', 'well'];
/** Fillers that are almost always hesitations, regardless of position. */
export const HARD_FILLERS = new Set(['um', 'uh', 'erm', 'er', 'ah', 'hmm']);

/** Overused words → stronger alternatives. */
export const SYNONYMS: Record<string, string[]> = {
  good: ['beneficial', 'valuable', 'excellent', 'positive'],
  bad: ['harmful', 'unpleasant', 'negative', 'poor'],
  nice: ['pleasant', 'enjoyable', 'lovely', 'welcoming'],
  big: ['large', 'huge', 'significant', 'considerable'],
  small: ['tiny', 'compact', 'minor', 'modest'],
  very: ['extremely', 'remarkably', 'particularly', 'genuinely'],
  really: ['truly', 'genuinely', 'particularly'],
  thing: ['aspect', 'factor', 'issue', 'detail'],
  things: ['aspects', 'factors', 'issues', 'details'],
  important: ['essential', 'crucial', 'vital', 'significant'],
  happy: ['delighted', 'pleased', 'content', 'cheerful'],
  sad: ['upset', 'disappointed', 'unhappy'],
  interesting: ['fascinating', 'engaging', 'intriguing'],
  like: ['enjoy', 'appreciate', 'am fond of'],
  think: ['believe', 'feel', 'would argue', 'am convinced'],
  get: ['obtain', 'receive', 'gain', 'become'],
  make: ['create', 'produce', 'build'],
  help: ['support', 'assist', 'benefit'],
  people: ['individuals', 'citizens', 'the public', 'residents'],
  lot: ['a great deal', 'plenty', 'numerous', 'many'],
  many: ['numerous', 'countless', 'a wide range of'],
  difficult: ['challenging', 'demanding', 'tough'],
  easy: ['straightforward', 'simple', 'effortless'],
  beautiful: ['stunning', 'picturesque', 'attractive'],
  see: ['notice', 'observe', 'spot'],
  use: ['rely on', 'make use of', 'utilise'],
  want: ['would like', 'hope', 'aim'],
  also: ['in addition', 'moreover', 'as well'],
  so: ['therefore', 'as a result', 'consequently'],
  but: ['however', 'on the other hand', 'although'],
};

/** Intensifier + adjective pairs that can be replaced by a single precise word. */
export const STRONGER_PHRASES: Array<[RegExp, string]> = [
  [/\bvery good\b/gi, 'excellent'],
  [/\bvery bad\b/gi, 'terrible'],
  [/\bvery big\b/gi, 'huge'],
  [/\bvery small\b/gi, 'tiny'],
  [/\bvery happy\b/gi, 'delighted'],
  [/\bvery sad\b/gi, 'devastated'],
  [/\bvery tired\b/gi, 'exhausted'],
  [/\bvery important\b/gi, 'crucial'],
  [/\bvery interesting\b/gi, 'fascinating'],
  [/\bvery difficult\b/gi, 'challenging'],
  [/\bvery hard\b/gi, 'challenging'],
  [/\bvery beautiful\b/gi, 'stunning'],
  [/\bvery busy\b/gi, 'hectic'],
  [/\bvery cold\b/gi, 'freezing'],
  [/\bvery hot\b/gi, 'boiling'],
  [/\bvery old\b/gi, 'ancient'],
  [/\bvery clean\b/gi, 'spotless'],
  [/\bvery scared\b/gi, 'terrified'],
  [/\bvery angry\b/gi, 'furious'],
  [/\bvery funny\b/gi, 'hilarious'],
  [/\bvery quiet\b/gi, 'peaceful'],
  [/\bvery crowded\b/gi, 'packed'],
];

export const COMPLEX_CONNECTORS = ['because', 'although', 'though', 'even though', 'while', 'whereas', 'which', 'who', 'whose', 'unless', 'if', 'when', 'whenever', 'since', 'so that', 'as long as', 'despite', 'in spite of'];
export const TRANSITIONS = ['first', 'firstly', 'second', 'secondly', 'then', 'after that', 'finally', 'however', 'moreover', 'furthermore', 'in addition', 'on the other hand', 'for example', 'for instance', 'as a result', 'therefore', 'in conclusion', 'overall', 'to sum up', 'besides', 'also', 'meanwhile', 'similarly', 'in contrast', 'nevertheless', 'that said'];

export const REASON_MARKERS = ['because', 'since', 'the reason', "that's why", 'that is why', 'due to', 'as a result', 'so that', 'which means', 'this means'];
export const EXAMPLE_MARKERS = ['for example', 'for instance', 'such as', 'like when', 'once', 'last year', 'last week', 'when i was', 'i remember', 'in my case', 'a good example'];
export const OPINION_MARKERS = ['i think', 'i believe', 'in my opinion', 'personally', 'i feel', 'from my point of view', 'in my view', 'i would say', "i'd say", 'i prefer', 'i agree', 'i disagree'];
export const CONCLUSION_MARKERS = ['in conclusion', 'overall', 'to sum up', 'all in all', 'in short', 'to conclude', "that's why", 'that is why', 'so in my opinion', 'in the end', 'for these reasons'];
export const PHOTO_SPATIAL = ['in the foreground', 'in the background', 'on the left', 'on the right', 'in the middle', 'in the centre', 'in the center', 'next to', 'behind', 'in front of', 'on top of', 'at the top', 'at the bottom', 'beside', 'near', 'above', 'below', 'there is', 'there are'];
export const PHOTO_SPECULATION = ['seems', 'seem', 'appears', 'appear', 'looks like', 'look like', 'probably', 'might', 'may be', 'maybe', 'perhaps', 'i guess', 'i imagine', 'i think', 'must be', 'could be'];

export const IRREGULAR_PAST: Record<string, string> = {
  go: 'went', see: 'saw', have: 'had', do: 'did', make: 'made', take: 'took', eat: 'ate', buy: 'bought',
  come: 'came', meet: 'met', get: 'got', feel: 'felt', think: 'thought', is: 'was', are: 'were', give: 'gave',
  know: 'knew', tell: 'told', speak: 'spoke', leave: 'left', find: 'found', begin: 'began', run: 'ran',
  pay: 'paid', send: 'sent', spend: 'spent', teach: 'taught', bring: 'brought', write: 'wrote',
  understand: 'understood', drive: 'drove', fly: 'flew', swim: 'swam', sleep: 'slept', win: 'won', lose: 'lost',
};
export const PAST_TO_BASE: Record<string, string> = Object.fromEntries(Object.entries(IRREGULAR_PAST).filter(([b]) => b !== 'is' && b !== 'are').map(([b, p]) => [p, b]));

export function pastTense(verb: string): string {
  const v = verb.toLowerCase();
  if (IRREGULAR_PAST[v]) return IRREGULAR_PAST[v];
  if (v.endsWith('e')) return `${v}d`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ied`;
  if (/^(stop|plan|shop|travel)$/.test(v)) return v === 'travel' ? 'travelled' : `${v}${v.slice(-1)}ed`;
  return `${v}ed`;
}

export function thirdPerson(verb: string): string {
  const v = verb.toLowerCase();
  if (v === 'have') return 'has';
  if (v === 'do') return 'does';
  if (v === 'go') return 'goes';
  if (/(s|sh|ch|x|z|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}
