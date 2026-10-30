// ---------- Question bank ----------

export type QuestionType = 'photo' | 'read-then-speak' | 'interactive' | 'speaking-sample';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Topic =
  | 'education' | 'technology' | 'environment' | 'daily-life' | 'travel' | 'work'
  | 'family' | 'personal-experience' | 'society' | 'entertainment' | 'health' | 'future-plans';

export type EvaluationCriterion =
  | 'grammar' | 'vocabulary' | 'fluency' | 'relevance' | 'development' | 'structure';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  topic: Topic;
  difficulty: Difficulty;
  /** Seconds to prepare before recording starts. */
  prepSeconds: number;
  /** Suggested minimum speaking time in seconds. */
  minSeconds: number;
  /** Maximum speaking time in seconds (recording stops automatically). */
  maxSeconds: number;
  /** Words that signal the answer is on topic. */
  keywords: string[];
  /** Image file name in /public/images (photo questions only). */
  image?: string;
  /** Optional bullet points shown under the prompt (like the DET "Read, Then Speak" cues). */
  cues?: string[];
  /** Optional model answer written for this question. */
  sampleAnswer?: string;
  criteria: EvaluationCriterion[];
}

/** One step of a branching Interactive Speaking scenario. */
export interface InteractiveNode {
  id: string;
  text: string;
  /** First matching branch wins; otherwise `next` is used. */
  branches?: { ifAny: string[]; next: string }[];
  next?: string;
  keywords: string[];
}

export interface InteractiveScenario {
  id: string;
  title: string;
  topic: Topic;
  difficulty: Difficulty;
  intro: string;
  start: string;
  answerSeconds: number;
  /** Number of questions the user will be asked (6–8). */
  length: number;
  nodes: InteractiveNode[];
}

// ---------- Evaluation ----------

export type MetricKind = 'measured' | 'estimate';

export interface DimensionScore {
  key: EvaluationCriterion;
  label: string;
  score: number; // 0–100
  kind: MetricKind;
  explanation: string;
  suggestions: string[];
}

export type IssueCategory =
  | 'grammar' | 'verb-tense' | 'article' | 'agreement' | 'word-choice'
  | 'repetition' | 'filler' | 'structure' | 'length' | 'relevance';

export interface Issue {
  category: IssueCategory;
  message: string;
  excerpt?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  reasons: string[];
}

export interface FluencyMetrics {
  wordCount: number;
  speakingSeconds: number;
  wordsPerMinute: number | null;
  fillerCount: number;
  fillerWords: Record<string, number>;
  repeatedWordStutters: number;
  sentenceCount: number;
  avgSentenceLength: number;
  usedTimeRatio: number; // speakingSeconds / maxSeconds
}

export interface Evaluation {
  practiceScore: number; // 0–100, local estimate only
  dimensions: DimensionScore[];
  fluency: FluencyMetrics;
  issues: Issue[];
  corrections: Correction[];
  polishedVersion: string;
  modelAnswer: string;
  /** 'sample' = hand-written; 'framework' = generated structure guide; 'ai' = written by the AI coach. */
  modelAnswerKind: 'sample' | 'framework' | 'ai';
  tips: string[];
  strengths: string[];
  /** Rule-based evaluation never infers pronunciation from text. */
  pronunciation: 'unavailable';
  evaluatorVersion: string;
  /** Present when an AI provider produced this evaluation. */
  ai?: {
    provider: AiProvider;
    model: string;
    detScore: number;
    /** AI listening feedback, only when the audio itself was sent. */
    pronunciationNotes?: string;
  };
  /** Set when AI evaluation was requested but failed, so the rule-based result is shown instead. */
  aiError?: string;
}

// ---------- Persistence ----------

export type AiProvider = 'gemini' | 'groq';
export type TranscriptSource = 'whisper' | 'web-speech' | 'manual' | AiProvider;

export interface Attempt {
  id: string;
  createdAt: number;
  mode: 'practice' | 'test';
  sessionId: string;
  testId?: string;
  question: Question;
  scenarioId?: string;
  originalTranscript: string;
  editedTranscript: string | null;
  transcriptSource: TranscriptSource;
  durationSeconds: number;
  recordingId?: string;
  evaluation: Evaluation;
}

export interface TestResult {
  id: string;
  startedAt: number;
  finishedAt: number;
  configName: string;
  attemptIds: string[];
  overallScore: number;
  dimensionAverages: Record<EvaluationCriterion, number>;
  completed: boolean;
}

export interface StoredRecording {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export type ThemePref = 'light' | 'dark' | 'system';
export type TranscriptionEngineId = 'whisper' | 'web-speech' | 'manual' | AiProvider;

export interface Settings {
  targetScore: number;
  defaultDifficulty: Difficulty;
  theme: ThemePref;
  saveRecordings: boolean;
  autoPlayback: boolean;
  /** Read Interactive Speaking questions aloud with browser text-to-speech. */
  readQuestionsAloud: boolean;
  transcriptionEngine: TranscriptionEngineId;
  whisperModel: string;
  /** Multiplier applied to prep time in Practice Mode (1 = official-style timing). */
  practicePrepMultiplier: number;
  /** In Practice Mode, start recording automatically when prep ends. */
  autoStartRecording: boolean;
  /** Play a short beep when recording starts/stops. */
  timerBeeps: boolean;
  /** AI coach: 'none' = rule-based evaluation only. */
  aiProvider: 'none' | AiProvider;
  geminiKey: string;
  geminiModel: string;
  groqKey: string;
  groqModel: string;
  /** Gemini only: send the recording so the AI can comment on pronunciation. */
  aiListenToAudio: boolean;
  /** Language for AI explanations and tips. */
  aiExplainLanguage: 'english' | 'roman-urdu';
}

// ---------- Full test configuration ----------

export interface TestSection {
  type: QuestionType;
  count: number;
  prepSeconds?: number;
  minSeconds?: number;
  maxSeconds?: number;
  /** Interactive only: answer time per question. */
  answerSeconds?: number;
}

export interface TestConfig {
  name: string;
  description: string;
  sections: TestSection[];
}
