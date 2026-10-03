# DailyOS — Architecture

**Status:** Canonical architecture direction
**Version:** 3.0 · **Last updated:** 2026-10-03
**Principle:** Extend the existing product. Do not invent or duplicate systems.

---

## 1. Truth rule

The repository is authoritative for what exists. This document records the **target** design and, in §3, what was verified as **current**. A target in this document is not proof that it is built. Before changing anything: inspect the repository, find consumers, reuse what exists. Disagreement between docs and code follows `AI_RULES.md §2`.

## 2. Stack

Verified in the repository and dashboards: Next.js 14 (App Router), React, TypeScript, Tailwind, NextAuth (JWT sessions, Google OAuth), Firebase Firestore (client SDK and Admin SDK), Groq (`groq-sdk`), Google Gemini (`@google/genai`), Web Push, Vercel (Hobby plan), `zod`, `sharp`.

Do not add or replace technologies without a `DECISIONS.md` entry.

## 3. Current vs target (verified 2026-10-03)

| Area | Current | Target |
|---|---|---|
| Firestore access | Client SDK reads and writes directly. No `firestore.rules` in repo. `request.auth` is null. Published console rules: UNKNOWN | NextAuth → Firebase custom-token bridge; owner-only rules; server-only collections |
| API auth | Cron and debug push routes fail open when `CRON_SECRET` is unset. Other routes: per-route check pending | Every route authenticated; secret routes fail closed; debug route removed |
| Rate limiting | None (14 routes, 5 call AI) | Upstash Redis limits per user and IP |
| Input validation | None of the 14 routes validate request bodies | zod on every route |
| AI | Gemini for photos (3.8 Flash, fallback 3.7 Flash); Groq for text and Whisper; circuit breaker and retries. Branch `ai-migration-gemini` not merged as of last info. No credit logic | Credits, usage ledger, spend limits, dish table |
| Billing | None | Razorpay subscriptions and webhooks |
| Reminders | `/api/push/cron` exists. Vercel cron removed (Hobby limit). External scheduler documented, setup UNKNOWN | External scheduler or paid-plan cron; due-query via `nextFireAt` |
| Tests and CI | 0 tests, no CI | Vitest, rules tests, GitHub Actions, branch protection |
| Monitoring | Vercel logs plus `ai_usage` JSON lines | Error tracking, uptime alerts, AI usage dashboard |
| Backups | UNKNOWN | Scheduled Firestore export plus tested restore |
| Hosting plan | Vercel Hobby | Paid plan before charging (Hobby is for non-commercial use — verify current terms) |
| Environments | Shared keys and project: UNKNOWN | Separate keys, and ideally a separate Firebase project, for preview/staging |

## 4. System overview

```text
Browser (React PWA) ──► Next.js routes ──► Validation + authorization ──► Firestore (Admin SDK)
        │                     │                                              ▲
        │                     ├──► AI providers (Groq, Gemini)               │
        │                     ├──► Razorpay (webhooks)                       │
        └── Firestore client SDK (owner-only, via rules) ────────────────────┘
External scheduler ──► /api/push/cron ──► Web Push
```

## 5. Identity and data access

- **Authentication:** NextAuth (Google, JWT sessions). The session user id is the only trusted identity.
- **Bridge (target):** after sign-in, the server mints a Firebase custom token for the session user (Admin SDK) and returns it from an authenticated route (`Cache-Control: no-store`). The browser signs in to Firebase with it. Firestore rules then check `request.auth.uid`.
- **Key rule:** the Firebase uid must equal the user key used in Firestore paths. Confirm the key is stable (not an email that can change) before building.
- **Rules:** default deny. `users/{uid}/**` owner read/write with field and type checks. Server-only collections have no client write access: billing, credits and usage, push subscriptions, reminders, system.
- **Admin SDK** runs only on the server. Credentials come from three env vars (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, project id) and fail with a named error when missing.
- **Rollout order (zero downtime):** ship the bridge while rules are still open → verify → deploy rules → verify → keep the previous rules ready for rollback.

## 6. Domains and ownership

Tasks, Workout, Diet, Health, Notifications, Orbit/AI, Billing, Goal/Planning (if approved), PWA/UI. Each has one owner module. Goal/Planning coordinates domains and never creates parallel task, workout or meal stores.

## 7. AI platform

### Providers and routing (current approved set)

| Feature | Provider and model | Fallback |
|---|---|---|
| Meal photo (identification) | Gemini `gemini-3.8-flash` (thinking low) | `gemini-3.7-flash`; then manual-entry message. Never a weaker model |
| Chat, text meal, summaries, voice structuring | Groq `openai/gpt-oss-120b` (20b for Free tier cost) | `openai/gpt-oss-20b` |
| Voice transcription | Groq `whisper-large-v3-turbo` | Message to type instead |
| Groq Qwen vision | Disabled by default (`GROQ_VISION_ENABLED`) | — |

All model IDs are config in `lib/ai/models.ts` with env overrides. `npm run check:models` runs before deploys.

### Request pipeline (every AI route)

```text
authenticate → rate limit → validate input → check and reserve credits
→ provider call (timeout, bounded retries, fallback, circuit breaker)
→ validate output (zod, one repair attempt) → refund credits on failure
→ respond → log metadata only (feature, provider, model, tokens, latency)
```

### Photo pipeline (target)

1. Vision step: identify up to 3 candidates from a closed dish vocabulary, with portions and confidence. No macros.
2. Macro step: look up a verified dish table (kcal, protein, carbs, fat, fibre per standard serving) scaled by portion. Use the text model only for dishes missing from the table.
3. Flatbreads and other visually ambiguous items prompt the user to choose (for example plain roti vs stuffed paratha).
4. The user confirms before anything is logged.

### Other rules
- Cache normalized dish lookups and repeated summaries.
- Free-tier provider plans are development only. Production uses billing-enabled accounts with spend limits.
- Dish vocabulary is bundled with the app via a static import (not read from disk at runtime on Vercel).

## 8. Goal and planning architecture (Tier 3, if approved)

```text
Goal → Plan (versioned) → Plan Action → existing domain record → actual result
```

States: generated → draft → review → approved → active → archived/replaced. Transitions are server-controlled. Activation is idempotent. Significant changes create a proposal and a new version. Progress is calculated from actual records. Persisted fields are defined in `DATABASE.md` before implementation.

## 9. Billing and entitlements

- Razorpay subscriptions create the payment. A webhook (signature verified on the raw body, idempotent by event id) updates `users/{uid}/billing/subscription`, which only the server writes.
- Plan and credits are resolved server-side on each request. The client displays them but never decides.
- Credits: a monthly ledger (IST month) plus daily per-feature caps. Reserve before the call, refund on failure. Cache hits cost 0.
- A global AI budget guard tracks daily tokens per model. Near provider limits, Free-tier AI pauses first; Pro continues.

## 10. Scheduled jobs and notifications

- `reminders` documents hold `uid`, type, local time, timezone, `enabled`, `nextFireAt`, `lastSentAt`. The job queries only due reminders, sends web push to the user's subscriptions, updates `nextFireAt` and `lastSentAt`, and removes subscriptions that return 404/410.
- The route requires `Authorization: Bearer <CRON_SECRET>` and fails closed. It is idempotent.
- Skip rules: meal already logged; no pending tasks.
- Scheduler: external (for example cron-job.org every minute) while on the Hobby plan. Watch Firestore read volume.
- Reuse the existing notification system. Do not build a second one.

## 11. Environments and configuration

- Local (emulators where possible), Preview, Production. Preview and local use separate AI and payment keys from Production.
- `.env.example` lists every variable name, no values. Secrets are marked Sensitive in Vercel. `NEXT_PUBLIC_*` holds only public values.
- Required groups: Firebase client, Firebase Admin, NextAuth, Google OAuth, Groq, Gemini, VAPID, `CRON_SECRET`, Upstash, Razorpay.

## 12. Security boundaries

Server decides identity, ownership, plan, credits, state transitions. Client does presentation and calls approved APIs. Detailed requirements: `SECURITY.md` (to be written).

## 13. Observability and operations

- Error tracking, uptime checks, structured `ai_usage` logs, daily AI cost and credit dashboard (admin only, uid allow-list).
- Firestore backups on a schedule with a tested restore. Rollback: promote the previous Vercel deployment; keep previous rules.
- Alerts when a model passes 70% of its daily budget, or when webhook or AI failure rates rise.

## 14. Testing architecture

Unit tests for logic, API tests with mocked providers, rules tests on the emulator, manual live evals for AI quality, staging check with Razorpay test mode. CI never calls real external services.

## 15. Repository documentation

```text
docs/  PRD  ARCHITECTURE  AI_RULES  PHASES  MEMORY  DECISIONS
       SECURITY (to write)  DATABASE (to write)  API (to write)  TESTING (to write)
release/  RELEASE_CHECKLIST (to write)  SECURITY_CHECKLIST (to write)
```

## 16. Decision rule

If the repository, requirements and architecture disagree: stop, inspect, decide, record in `DECISIONS.md`, update affected documents, then continue.
