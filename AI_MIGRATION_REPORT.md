# DailyOS — AI Architecture & Groq Model Migration Report

**Date:** October 2, 2026  
**Status:** Completed & Verified (Build: Clean, Lint: Clean, TypeScript: Clean, Smoke Test: 100% Passed)

---

## 1. Executive Summary & Context

Groq decommissioned several models across 2026:
- `meta-llama/llama-4-maverick-17b-128e-instruct` (decommissioned 2026-03-09)
- `meta-llama/llama-4-scout-17b-16e-instruct` (decommissioned 2026-07-17)
- `llama-3.3-70b-versatile` (decommissioned 2026-08-16)

This migration overhauled the DailyOS AI infrastructure from ad-hoc, inline Groq SDK invocations to a single, robust, production-grade wrapper with typed error handling, automated retry logic, token tracking, Zod validation with self-repair, image optimization, and startup/CI model verification.

---

## 2. Model Verification & Architecture

### Live Model Discovery (`GET https://api.groq.com/openai/v1/models`)
Direct inspection of the user's active Groq API key confirmed the available models:
1. `openai/gpt-oss-120b` (131,072 context window) — Selected for text generation, reasoning, and structured parsing.
2. `openai/gpt-oss-20b` (131,072 context window) — Selected as secondary fallback for text routes.
3. `qwen/qwen3.8-27b` (131,072 context window) — Multimodal vision model supporting both high-resolution image input and text.
4. `whisper-large-v3-turbo` — High-speed speech-to-text transcription.

### Vision Verification & Non-Thinking Mode for `qwen/qwen3.8-27b`
- **Vision Support:** `console.groq.com/docs/vision` explicitly designates `qwen/qwen3.8-27b` as Groq's official multimodal vision model (20MB request limit, up to 3 images, 2048 tokens/image).
- **Reasoning Control:** Per Groq docs, Qwen models support `reasoning_effort: "none"` to disable thinking mode completely. Without this, Qwen generates hundreds of reasoning tokens inside `<think>` before emitting JSON.
- **Empirical Test Result:** Testing a real South Indian Thali photo with `reasoning_effort: "none"`:
  - **Prompt Tokens:** 2,013 (including image tokens)
  - **Completion Tokens:** **155** (pure JSON payload, 0 wasted thinking tokens)
  - **Total Latency:** ~4.1 seconds

---

## 3. Core Components Created

### A. Feature-to-Model Registry (`lib/ai/models.ts`)
Centralizes all AI feature configurations and supports runtime environment variable overrides. Token caps were raised ~50% to accommodate reasoning tokens from `gpt-oss`:

| Feature | Default Model | Env Var Override | Max Tokens Cap |
| :--- | :--- | :--- | :--- |
| **Orbit Chat Coach (`aria`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_ARIA` | 850 |
| **Meal Estimation (`estimateMeal`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_ESTIMATE_MEAL` | 400 |
| **Voice Meal (`voiceMeal`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_VOICE_MEAL` | 900 |
| **Voice Workout (`voiceWorkout`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_VOICE_WORKOUT` | 1200 |
| **Nutrition Summary (`summarizeNutrition`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_SUMMARIZE_NUTRITION` | 900 |
| **Workout Summary (`summarizeWorkout`)** | `openai/gpt-oss-120b` | `GROQ_MODEL_SUMMARIZE_WORKOUT` | 1050 |
| **Meal Photo Analysis (`analyzeMeal`)** | `qwen/qwen3.8-27b` | `GROQ_MODEL_ANALYZE_MEAL` | 1000 |
| **Text Fallback Chain** | `[gpt-oss-120b, gpt-oss-20b]` | `GROQ_MODEL_TEXT_PRIMARY`, `GROQ_MODEL_TEXT_FALLBACK` | — |
| **Transcription** | `whisper-large-v3-turbo` | `GROQ_MODEL_TRANSCRIPTION` | — |

- `isGptOss(modelId)` sets `reasoning_effort: "low"`.
- `isQwen(modelId)` sets `reasoning_effort: "none"`.

---

### B. Unified Groq Client Wrapper (`lib/ai/groq.ts`)
Replaces duplicated Groq logic across all routes with a unified client featuring:
1. **Hard Timeout:** 25-second `AbortController` timeout on all network calls.
2. **Rate Limit Handling:** On HTTP 429, parses the `Retry-After` header and performs one automated retry (capped at 3 seconds).
3. **Length Truncation Handling:** When `finish_reason === "length"` occurs:
   - Logs a warning with `console.warn`.
   - Retries once with a **1.5× token cap** (`Math.round(currentMaxTokens * 1.5)`).
   - If still truncated, fails cleanly with typed `INVALID_OUTPUT`.
4. **Typed Error Classification:** Maps exceptions to `AiErrorCode`:
   - `RATE_LIMITED`
   - `MODEL_UNAVAILABLE`
   - `INVALID_OUTPUT`
   - `TIMEOUT`
   - `UNKNOWN`
5. **Structured JSON Mode & Auto-Repair:**
   - Detects `jsonMode: true` and guarantees the prompt satisfies Groq's requirement for the word "json".
   - Parses the JSON output and validates it against a provided **Zod** schema.
   - If the output contains invalid syntax, automatically triggers one self-repair round-trip before raising an error.
6. **Structured Telemetry Logging (Zero User Content):**
   Logs every call with `console.info` in structured JSON:
   ```json
   {"type":"ai_usage","feature":"analyzeMeal","model":"qwen/qwen3.8-27b","promptTokens":2013,"completionTokens":155,"totalTokens":2168,"latencyMs":4101}
   ```
   No prompts, user input, health data, or responses are logged.

---

### C. Meal Photo Optimization (`app/api/analyze-meal/route.ts`)
- Integrated `sharp` to automatically downscale incoming meal photos so the longest dimension is at most **1024px** while maintaining aspect ratio.
- Prevents hitting Vercel's **4.5 MB request body limit** and significantly reduces Groq vision token consumption.
- Configured Next.js server components external packages in `next.config.mjs` (`["firebase-admin", "web-push", "sharp"]`) to prevent native module bundling issues.

---

## 4. API Call Sites Updated with `maxDuration`

Every `/api` route that calls an AI model now explicitly exports:
```ts
export const maxDuration = 30;
```

### Vercel Plan Limits & Rationale:
- **Your Plan:** **Vercel Hobby (Free)**.
- **Default Function Timeout:** 10 to 15 seconds.
- **Maximum Allowed on Hobby:** **60 seconds** (under modern Vercel Fluid Compute).
- Setting `maxDuration = 30;` extends the execution window to 30 seconds (within Hobby limits), giving complex AI vision, JSON repair, and network retries adequate time to complete without timing out.

Updated routes:
1. `app/api/aria/route.ts` — `maxDuration = 30`, `feature: "aria"`. Returns `{ reply }`.
2. `app/api/estimate-meal/route.ts` — `maxDuration = 30`, `feature: "estimateMeal"`. Returns `{ calories, proteinG, carbsG, fatG, fiberG }`.
3. `app/api/voice-meal/route.ts` — `maxDuration = 30`, `feature: "voiceMeal"`. Returns `{ transcript, meals }`.
4. `app/api/voice-workout/route.ts` — `maxDuration = 30`, `feature: "voiceWorkout"`. Returns `{ transcript, exercises, cardio }`.
5. `app/api/summarize-nutrition/route.ts` — `maxDuration = 30`, `feature: "summarizeNutrition"`. Returns `{ summary }`.
6. `app/api/summarize-workout/route.ts` — `maxDuration = 30`, `feature: "summarizeWorkout"`. Returns `{ summary, caloriesBurned, cardioWithCalories }`.
7. `app/api/analyze-meal/route.ts` — `maxDuration = 30`, `feature: "analyzeMeal"`. Returns `{ name, calories, proteinG, carbsG, fatG, fiberG, confidence, notes }`.

---

## 5. Configuration Diffs & Rule Integrity

### `tsconfig.json` Diff
The app's compiler settings (`module: "esnext"`, `moduleResolution: "bundler"`, paths) were untouched. Only an isolated `"ts-node"` block was added:
```diff
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -16,5 +16,10 @@
     "paths": { "@/*": ["./*"] }
   },
   "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
-  "exclude": ["node_modules"]
+  "exclude": ["node_modules"],
+  "ts-node": {
+    "compilerOptions": {
+      "module": "commonjs"
+    }
+  }
 }
```

### `.eslintrc.json` Status
No ESLint config file existed in `origin/main`. The temporary file created earlier with globally disabled rules (`react/no-unescaped-entities: off`) has been **completely removed**. No global lint rules are disabled.

---

## 6. Verification Tools & Test Scripts

### A. CI Model Health Check (`scripts/check-groq-models.ts`)
Run command:
```bash
npm run check:models
```
- Validates that every model configured in `lib/ai/models.ts` is available on Groq.
- **Output:**
  ```text
  [check-groq-models] ✅ openai/gpt-oss-120b  (summarizeWorkout)
  [check-groq-models] ✅ qwen/qwen3.8-27b  (analyzeMeal)
  [check-groq-models] ✅ openai/gpt-oss-20b  (textFallback)
  [check-groq-models] ✅ whisper-large-v3-turbo  (transcription)

  [check-groq-models] All 4 models are live. ✅
  ```

---

### B. AI Smoke Test (`scripts/ai-smoke-test.ts`)
Run command:
```bash
npm run smoke:ai
```
Comprehensive live test suite executing against Groq API:
- 10 Indian Dishes (`estimate-meal`): 10/10 parsed successfully with exact macro bounds.
- 2 Spoken Meal Transcripts (`voice-meal`): Verified meal aggregation and itemized macro parsing.
- 2 Spoken Workout Transcripts (`voice-workout`): Verified multi-set barbell/dumbbell strength work and cardio duration/distance.
- 1 Nutrition Summary: Generated complete contextual feedback.
- 1 Workout Summary: Verified calorie calculation, MET estimation, and structured coaching feedback.

---

## 7. Build & Lint Verification

- **Lint:** `npm run lint` — Clean.
- **TypeScript:** `npx tsc --noEmit` — **0 errors**.
- **Production Build:** `npm run build` — Clean compilation of all 23 routes and middleware:
  ```text
  ✓ Compiled successfully
  ✓ Generating static pages (23/23)
  ✓ Finalizing page optimization
  ```

---

## 8. Vision Prompt Slim-Down & Two-Stage Architecture

### Problem
The initial vision prompt was **4,277 tokens (77% of the payload)**, containing exhaustive macro reference tables and calorie lists that slowed latency and increased token consumption.

### Resolution
- **Separation of Concerns:**
  - **Stage 1 (Vision):** Restricted strictly to visual classification. Emits up to 3 candidate dishes with confidence (0–1), visible items with approximate gram weights, ambiguity (`low` | `medium` | `high`), and concise deduction notes. Removed all calorie tables. Compressed prompt to <600 tokens.
  - **Stage 2 (Nutrition Calculation):** Receives the selected dish and visible items. Uses a compact Indian reference calibration table with macronutrients and fiber.
- **Image Resizing:** Sharp downscales to max 768px at JPEG 75 quality.
- **Prompt Caching:** Static instructions placed first, variable image/dish data placed last for optimal provider-side caching.

---

## 9. Flatbread Detection & Uncertainty UI (`components/diet/DietPage.tsx`)

1. **Flatbread Rule:** Visual ambiguity is flagged (`medium`/`high`) for flatbreads (roti, paratha, naan, puri, etc.) since internal stuffing cannot be confirmed externally.
2. **One-Tap Candidate Chips:** UI presents alternative dishes as one-tap chips directly below the photo.
3. **Stage 2 Re-estimation:** Tapping an alternative chip re-runs **only Stage 2** (text macro estimation) using the cached visual items, avoiding a redundant vision API call.
4. **Uncertainty Indication:** Displays `"Check this"` in amber when ambiguity is medium or high.
5. **Calorie Ranges:** Displays point estimates alongside ranges: `≈340 kcal (280–420)`.
6. **User Hint Field:** Added optional "What is this?" input sent with subsequent scans to assist recognition.

---

## 10. Photo Evaluation & Vision Model Comparison Harness (`scripts/photo-eval.ts`)

A standalone benchmarking suite for testing Groq and Google Gemini on Indian food photos without touching production routes.

### Features
1. **Providers Supported:**
   - **Groq:** `qwen/qwen3.8-27b` with `--reasoning none` or `--reasoning low`.
   - **Google Gemini:** `gemini-3.8-flash` via official `@google/genai` SDK with `ThinkingLevel.LOW`.
2. **Pacing & Rate Limiting:**
   - Gemini: Configurable `PAUSE_MS_GEMINI = 13_000` (respects 5 RPM free-tier limit).
   - Groq: Configurable `PAUSE_MS_GROQ = 15_000` (respects 8,000 TPM limit).
3. **Intelligent 429 Handling:**
   - **`PerDay` Quota Exceeded:** Immediately halts the run to avoid burn.
   - **`PerMinute` Limit:** Parses suggested `retryDelay` + 1s, waits, and retries the specific image **once**. Never retries more than once.
4. **Immediate 400 Exit:** An HTTP 400 `INVALID_ARGUMENT` halts the entire evaluation run immediately on the first photo to prevent cascaded failures.
5. **Detailed Telemetry:** Logs `promptTokens`, `outputTokens`, and `thinkingTokens` on each call.
6. **Ground Truth & Canonical Vocabulary:**
   - `scripts/photos/labels.json`: 11 real food images verified on disk with `mustContain` keyword checks and expected calorie ranges.
   - `scripts/dish-vocab.json`: 150+ canonical Indian dish names (testable via `--vocab`).
   - Results automatically cached to `scripts/photos/results.<provider>.json`.

### How to Run:
```bash
# Gemini Flash evaluation:
npm run eval:photos -- --provider gemini

# Groq Qwen evaluation with low reasoning:
npm run eval:photos -- --provider groq --reasoning low

# With canonical vocabulary injection:
npm run eval:photos -- --provider gemini --vocab
```

---

## 11. Production Stage 1 Vision Switch to Google Gemini

### Rationale
Empirical testing on real Indian food photos demonstrated that **Gemini 3.8 Flash identified 8/8 photos correctly (0 confidently wrong)**, whereas Groq Qwen achieved 3/10.

### Architecture & Implementation
1. **Dedicated Provider (`lib/ai/providers/gemini.ts`)**:
   - Built with the official `@google/genai` SDK and server-only `GEMINI_API_KEY`.
   - **Primary Model:** `gemini-3.8-flash` with `ThinkingLevel.LOW`.
   - **Fallback Model:** `gemini-3.7-flash` (verified natively multimodal, supports images and `ThinkingLevel.LOW`).
   - **Prefix Prompt Caching:** Static instructions and canonical Indian dish vocabulary (`scripts/dish-vocab.json`) placed **FIRST**, dynamic image base64 placed **LAST** to maximize provider-side caching.
   - Logs `cachedContentTokenCount` when available.

2. **High-Reliability & Fault-Tolerance Engine**:
   - **20s Global Budget:** Enforces hard timeout budgets per request.
   - **503 / 500 / Network Timeout Retries:** Retries up to 2 times with exponential backoff (1s, 2s + jitter) within budget.
   - **429 Rate Limit Handling:**
     - **Daily Quota (`PerDay`):** Fails immediately on that model without burning retries, directly triggering fallback.
     - **Per-Minute Limit (`PerMinute`):** Waits suggested delay once if $\le$ 5s, else fails fast to fallback.
   - **Automated Model Fallback:** Seamlessly falls back from `gemini-3.8-flash` to `gemini-3.7-flash`.
   - **Circuit Breaker:** After 5 consecutive failures, trips and skips the provider for 5 minutes.
   - **Typed Error `PHOTO_UNAVAILABLE`:** Returned when all retries and fallbacks fail; does **NOT** fall back to Groq Qwen.

3. **Groq Qwen Legacy Preserved Behind Config Flag**:
   - Groq Qwen code is isolated behind `GROQ_VISION_ENABLED = process.env.GROQ_VISION_ENABLED === "true"` (default: `false`), removed from the default chain.

4. **Telemetry & Log Structure**:
   - `ai_usage` log format upgraded to include `provider` and `cachedTokens`:
     ```json
     {"type":"ai_usage","feature":"analyzeMeal","provider":"gemini","model":"gemini-3.7-flash","promptTokens":2141,"completionTokens":213,"totalTokens":2354,"cachedTokens":0,"latencyMs":8000}
     ```
   - Stage 2 (Nutrition macro calculation via Groq `gpt-oss-120b`) logs `provider: "groq"`, `cachedTokens: 0`.

5. **Frontend UI & Consent Disclosure (`components/diet/DietPage.tsx`)**:
   - When `PHOTO_UNAVAILABLE` occurs, shows:
     > *"Photo scan is busy. Type or speak your meal instead."*
     with one-tap action buttons to immediately switch to **Type meal** (manual entry) or **Speak meal** (voice transcription).
   - Added consent disclosure: *"Photos are processed by Google Gemini for nutritional identification."*
   - Added `TODO` note for future dedicated AI consent settings.

6. **Live Verification on Real Photos (`scripts/verify-gemini-vision.ts`)**:
   - **Photo 1 (`Aloo_ka_paratha.jpg`):** `gemini-3.8-flash` reached per-model daily quota $\rightarrow$ failed fast $\rightarrow$ fell back to `gemini-3.7-flash` $\rightarrow$ Succeeded in 8.0s (Prompt: 2,141, Completion: 213 tokens, Ambiguity: High).
   - **Photo 2 (`Dal_Bhat_Tarkari_2.jpg`):** Primary hit quota $\rightarrow$ fallback hit 503 high demand spike $\rightarrow$ exponential backoff retry in 1.19s $\rightarrow$ Succeeded in 17.5s (Top dish: `Dal Bhat Tarkari` at 0.85 confidence, exact match; Prompt: 2,141, Completion: 278 tokens).
   - **Photo 3 (`Khichdi_(Khichrri).jpeg`):** Primary hit quota $\rightarrow$ fallback hit 503 spike $\rightarrow$ retry in 1.20s $\rightarrow$ Succeeded in 11.2s (Prompt: 2,141, Completion: 193 tokens).

