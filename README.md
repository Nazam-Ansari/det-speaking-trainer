# DET Speaking Trainer

A personal, local-first trainer for the speaking tasks of the Duolingo English Test.

- **Practice Mode**: one question at a time, with a detailed evaluation, corrections, a better version and tips after every answer.
- **Full Test Mode**: a timed simulation with a microphone check, auto-advance, no feedback during the test, and a full results report at the end.
- **History & progress**: every answer (transcript, edited transcript, evaluation, optional recording) is stored in IndexedDB in your browser.

No accounts, no paid APIs, no server.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Use **Chrome or Edge** for the best support. Open it via `http://localhost`, because browsers only allow microphone access on `localhost` or HTTPS.

Other commands: `npm run build` (production build into `dist/`), `npm run preview`, `npm test` (evaluation-engine unit tests), `npm run typecheck`.

## Speech transcription

Choose an engine under **Settings → Speech transcription**:

| Engine | Where it runs | Notes |
|---|---|---|
| **Whisper** (default) | On your device (WebAssembly via transformers.js) | Model downloads once from Hugging Face (tiny ≈ 40 MB, base ≈ 80 MB, small ≈ 250 MB), then cached. Adds punctuation. It may drop "um/uh" and silently fix small slips (e.g. "a interesting" → "an interesting"). |
| Browser speech recognition | Chrome/Edge send audio to the vendor's cloud | Live, needs internet, usually no punctuation, not in Firefox. |
| Type it myself | — | Listen back and type what you said. |

You can always edit the transcript. The original and edited versions are stored separately. Fix misheard words, but keep your real mistakes.

This uses Whisper through transformers.js rather than a custom whisper.cpp WebAssembly build. It runs the same model family, ships as an npm package, and needs no special cross-origin headers. The ONNX runtime files are copied into `public/ort/` automatically by `npm run dev` / `npm run build`.

## How scoring works (and its limits)

Each answer gets a rule-based internal score (0–100) built from six dimensions: grammar, vocabulary, fluency indicators, answer relevance, answer development and sentence structure. It is shown as an **estimated DET-style score out of 160** (`10 + score × 1.5`, rounded to steps of 5; see `toDetScore` in `src/engines/scoring.ts`). See the in-app page **How scoring works**.

- The /160 number is the app's own **unofficial estimate**. It is not calibrated against real DET results, so the real test may score you differently.
- Feedback is short by default (score, your answer, corrected answer, top 3 tips). **Show full details** reveals the six skill scores, fluency metrics and the model answer.
- **Pronunciation is not assessed.** A transcript cannot show how words sounded, so the app shows "Pronunciation assessment unavailable".
- Measured values (words/min, fillers, speaking time, word count) are labelled **Measured**. All dimension scores are labelled **Estimate**.
- The grammar checker targets common learner error patterns (articles, agreement, tenses after time markers, modal verbs, collocations…). It will miss errors that fall outside those patterns.
- Interactive Speaking uses a branching question bank with keyword rules. No AI model generates questions.

## Customising

| What | Where |
|---|---|
| Questions (≈145 original prompts) | `src/data/questions/*.json`: each file has a `defaults` block for timers |
| Interactive conversations | `src/data/questions/interactive.json`: nodes with `branches: [{ ifAny: [...], next }]` |
| Photo images | `public/images/` (reference the file name in `photo.json`; real photos work too) |
| Full test structure, counts, timers | `src/data/testConfig.json` |
| Grammar rules | `src/engines/evaluation/grammarRules.ts` |
| Score weights / word lists | `src/engines/evaluation/evaluate.ts`, `lexicon.ts` |

Minimal question entry:

```json
{ "id": "rts-045", "topic": "work", "difficulty": "intermediate",
  "text": "Describe your ideal workplace.", "cues": ["Location", "Colleagues", "Why"],
  "keywords": ["office", "colleagues", "remote", "work"] }
```

## Project structure

```
src/
  components/   UI primitives, SpeakingTask (prep → record), AnswerReview, FeedbackPanel, charts
  pages/        Dashboard, Practice hub/session, Full test, Test results, History, Settings, About
  layouts/      Sidebar / mobile navigation shell
  hooks/        useRecorder (MediaRecorder + level meter), useCountdown, settings & data hooks
  services/     audio helpers, transcription (Whisper worker, Web Speech, facade), attempt saving
  engines/      evaluation (rules, scoring, model answers), interactive branching, test plan, aggregation
  data/         question bank JSON, test config, loader
  storage/      IndexedDB (attempts, tests, recordings, settings)
  types/        shared TypeScript types
```

All data stays in this browser. Clearing site data, or using **Settings → Clear all local data**, removes it permanently.

## Optional free AI Coach

Settings → **AI Coach (free)** connects a free-tier AI using your own API key:

- **Groq** (https://console.groq.com/keys): Whisper large-v3 transcription (accurate with accents) plus Llama feedback.
- **Google Gemini** (https://aistudio.google.com/apikey): transcription and feedback, and it can listen to your audio for pronunciation comments (an AI opinion, not a measured score).

The key is stored only in this browser's IndexedDB and is sent only to the chosen provider. Free tiers have rate limits, and providers may use free-tier data. If a call fails, the app falls back to the offline rule engine and shows a warning. AI scores are still unofficial estimates.

## Deploy online (GitHub Pages)

`npm run deploy` builds the app for `https://<user>.github.io/<repo>/` and pushes it to the `gh-pages` branch. In the repo's Settings → Pages, the source is the `gh-pages` branch. Run it again after each change.
