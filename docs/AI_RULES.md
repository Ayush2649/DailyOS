# DailyOS — AI Engineering Rules

**Status:** Mandatory contract for AI agents and humans
**Version:** 3.0 · **Last updated:** 2026-10-03

---

## 0. Agent quick rules (read this first)

1. Read `MEMORY.md`, then the relevant sections of `PRD.md`, `ARCHITECTURE.md`, this file and `PHASES.md` before any significant change.
2. Repository first. Search and inspect before creating. Never invent files, APIs, collections, fields, env vars or behaviour. Unknown stays UNKNOWN.
3. Humans own scope, product intent, security decisions and release. Do not add features or widen a task. New ideas go to the backlog.
4. Work on a focused branch, never on `main`. Do not push, deploy or run destructive commands unless asked.
5. Tier A work (§3) is tests-first with full gates.
6. Never weaken, skip or delete a test to get green.
7. The server decides auth, ownership, plan, entitlements, credits and state transitions. Never the client.
8. Validate all input and all AI output at runtime with zod.
9. Secrets live only in env vars. Never in code, logs, prompts, chats or `NEXT_PUBLIC_*`.
10. Never log health data, photos, audio, chat content, tokens or keys.
11. Every AI route: auth → rate limit → credit check → validated input → token cap and timeout → fallback → usage log (metadata only).
12. Never switch accounts, keys or projects to get around a quota or a block. After any 401/403 from a provider, stop and report. Live scripts: one call per item, capped, no loops.
13. CI and tests never call real AI, Firebase or payment providers. Use mocks or the emulator.
14. No unrelated changes, no rewrites without a documented reason.
15. After significant work, report changed files, tests actually run, risks and open questions, and update `MEMORY.md`.

---

## 1. Authority and scope

Humans own product intent, launch scope, acceptance criteria, architecture, security-sensitive decisions, pricing, legal and health-safety limits, final review and release.

AI assists with planning, tests, implementation, diagnosis, review and documentation.

AI must not: invent requirements; move backlog items into launch scope; make security-sensitive decisions alone; silently change a user's active data; treat its own output as database truth; fabricate history, health data or completion; promise health outcomes.

---

## 2. Truthfulness

- If the repository and documents do not establish something, ask one targeted question or mark it UNKNOWN.
- Method: Search → Inspect → Reuse → Extend → Create only if needed.
- If docs and repository disagree: stop, inspect, record in `DECISIONS.md`, update the affected docs, continue.
- Never report work as done, passing or deployed unless you ran it and saw the result. State failures and skipped checks plainly.

---

## 3. Work tiers and gates

If unsure, use the higher tier.

| Tier | Applies to | Required gates |
|---|---|---|
| **A** | Auth/session, authorization, Firestore rules, payments, webhooks, credits/entitlements, data deletion/export, schema migrations, security config, AI flows that change user state | Approved spec and acceptance criteria → tests first → implement → full regression → security review → human review (not the owner) → staging verification → owner acceptance |
| **B** | Other features and logic | Short spec (goal, acceptance criteria, edge and error cases) → tests first for logic → implement → regression → AI review → human review → preview verification |
| **C** | Copy, styling, layout, docs | lint + typecheck + build, visual check on preview. No spec or new tests required |

### Hotfix lane

Only for a production outage, an active security hole, data loss or wrong billing.

Branch `hotfix/<name>` → minimal fix → one human approval (the owner may approve if working alone) → deploy → verify. Within 48 hours: add a regression test, record it in `MEMORY.md` and `DECISIONS.md`, write a short post-mortem note. Never use it for features.

---

## 4. Tests

- Tests change only when an approved requirement changes.
- Firestore rules are tested with the Firebase emulator.
- Every protected API has tests for: 401 unauthenticated; 403/404 for another user's resource (IDOR); 400 invalid input; 429 rate limit; success.
- AI behaviour is tested for: schema validity, malformed-output handling, fallback chain, credits refunded on failure, no duplicate records on retry.
- AI quality is measured by manual live evals (`npm run eval:photos`, `npm run smoke:ai`), not CI. Keep labelled cases (filenames and expected dishes, not copyrighted images). Need at least 30 cases before launch. Record results in `MEMORY.md`.
- Eval scripts: one call per item, paced to the provider limit, stop on 401/403/daily limit, no loops.

---

## 5. Git

- Flow: focused branch → tests → implementation → local checks → PR → CI → human review → merge.
- Target CI checks: lint, `tsc --noEmit`, unit tests, rules tests, build, `npm audit --audit-level=high`, secret scan. Protect `main` with required PRs and checks.
- Never commit: `.env*`, service-account JSON, test photos, `results*.json`.

---

## 6. Security

- Authenticate and authorize on the server for every protected route. Take the user id only from the verified session, never from body, query or client-controlled headers.
- **Firestore:** clients reach data only through rules. Default deny. Owner-only under `users/{uid}`. Server-only collections (billing, usage, credits, push subscriptions, reminders, system) are never client-writable. Rules changes are Tier A.
- Validate every request body, query, route param and upload (type, size, duration) with zod. Reject unknown fields. Cap string lengths and array sizes.
- Rate limit every route: per user, or per IP when unauthenticated. AI routes are stricter. In production, AI routes fail closed if the limiter is down.
- **Secrets:** env vars only. Keep `.env.example` (names only). Separate keys for Production and Preview/dev. Mark secrets Sensitive in Vercel. If a secret leaks, rotate it.
- Secret-protected routes (`CRON_SECRET`, webhooks) fail closed: a missing secret means the route refuses to run. Constant-time comparison. No debug routes in production.
- **Webhooks:** verify the signature on the raw body, idempotent by event id.
- Security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors). Explicit CORS.
- Logging is metadata only (see quick rule 10).
- Dependencies: justify additions, run the audit.
- Provider 401/403 or "access denied": stop all calls and report. Rotating accounts or projects to bypass quotas or blocks breaks provider terms and risks the production account.

---

## 7. AI platform

- AI is assistance. The application and database are the source of truth. AI output that affects state goes: structured → validated → authorized → applied by app logic → user approval where required.
- Send minimal context per operation. Never send a user's whole history by default.
- User content is data, never instructions. Keep system rules separate. Never echo system prompts.
- Failures are normal. They must not corrupt state, create duplicates or double-charge credits. Retries are bounded (max 2), idempotent and inside a total time budget.
- **Models are configuration, not code.** All model IDs live in `lib/ai/models.ts` with env overrides. Run `npm run check:models` before each deploy. Providers retire models with little notice (three models this app used were retired by Groq in 2026). Do not depend on a preview model without a fallback.
- Approved providers are listed in `ARCHITECTURE.md §7` and `DECISIONS.md`. Adding one requires a `DECISIONS.md` entry with evaluation evidence.
- Fallback must never silently use a weaker model. If no acceptable model is available, tell the user and offer manual paths (type or speak).
- Cost controls: no AI call on page load; cache deterministic work (dish lookups, repeated summaries); send compact aggregates; enforce credits.
- Free-tier provider keys are for development only. Production runs on billing-enabled accounts with spend limits. Check provider data-use terms before sending user photos, voice or health logs through any free tier.
- Before first AI use, tell the user which processors handle their data (Groq, Google) and record consent.
- AI-estimated values (calories, macros) are labelled as estimates and confirmed by the user before logging.

---

## 8. Health and fitness safety

- No guaranteed outcomes, no diagnosis, no medical claims. Show "estimates, not medical advice" where AI outputs numbers.
- Plans must respect owner-defined limits (minimum daily calories, maximum weekly weight-change rate, beginner exercise load, exclusions). Enforce them in server-side validation, not only in prompts. The values are set by the owners with qualified input, in `SECURITY.md` (pending).
- Where plan generation depends on it, ask for age and relevant conditions. For pregnancy, eating-disorder signals, minors or medical conditions, redirect to a professional (policy to be confirmed by owners).
- Keep distinct: goal, plan, logged data, calculated progress, AI interpretation. Never turn planned data into completed data.

---

## 9. Data and domain rules

- Before a database change: inspect schema and consumers, define invariants, write tests, implement, check backward compatibility. Never silently change the meaning of existing data.
- Inspect a real endpoint before implementing against it. No assumed contracts.
- Reuse existing Tasks, Workout, Diet, Health and Notification systems. Goal/planning coordinates them, it does not duplicate them.
- No rewrite of working systems without a documented reason (security problem, impossible safe extension, severe maintainability issue, or an explicit human decision).
- Important state transitions (plan approval, activation, subscription status) are server-controlled.
- Significant changes to an active plan use: proposal → review → approval → new version.

---

## 10. UX states

Every async flow has loading, success, error, empty and retry states. AI waits over a few seconds need a visible progress state. Preserve user input on failure. Never show secrets, stack traces or internals.

---

## 11. Dependencies

Check for an existing equivalent first. Justify each addition. Avoid package growth.

---

## 12. Definition of done (single source)

- **Tier A:** spec and acceptance criteria approved; tests written first; tests, regression and rules tests pass; security cases tested; security review; human review by someone other than the owner; staging verified; owner acceptance; docs and `MEMORY.md` updated.
- **Tier B:** acceptance criteria met; tests for logic pass; regression passes; AI and human review; preview verified; `MEMORY.md` updated.
- **Tier C:** lint, typecheck and build pass; preview checked.

`PRD.md` and `PHASES.md` refer here rather than repeating this.

---

## 13. Roles

Each important feature has one primary owner and at least one reviewer. They are different people for Tier A.

AI workflows: Feature Planner (spec only), Test Writer, Implementer, Code Reviewer, Security Reviewer, Regression Agent, Release Reviewer. No workflow may widen scope.

---

## 14. Documentation discipline

Decisions live in the repo (`DECISIONS.md`), not only in chats. Link to rules instead of copying them. When a decision changes, update every affected document.
