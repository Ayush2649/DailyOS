# DailyOS — Product Requirements Document

**Status:** Canonical product requirements
**Version:** 3.0 · **Last updated:** 2026-10-03
**Launch scope:** NOT YET FROZEN — proposal in §3, needs owner approval
**Product model:** Monetized product for real users. Security, reliability and controlled scope are launch requirements.

This PRD defines **what** DailyOS does. How it is built is in `ARCHITECTURE.md`; order of work is in `PHASES.md`.

---

## 1. Purpose and principles

DailyOS helps people run daily life around personal goals: tasks, workouts, diet and an AI coach (Orbit), with reminders and progress tracking.

Principles:

1. User intent comes first.
2. AI assists. It is never the source of truth.
3. Generated plans and AI estimates need validation and user control.
4. Extend existing domains. Do not duplicate them.
5. Planned and actual are different things.
6. Security and correctness are launch requirements.
7. Small, secure and reliable beats large and unstable.
8. Humans own scope, product and release decisions.

## 2. Target user and problem

People who want to turn goals ("lose 5 kg in 3 months, train 4 days a week, 120 g protein, 2 hours of study daily") into daily actions, and who need logging to be fast enough to keep doing it (type, speak or photograph a meal).

Primary market at launch: India (INR pricing, Indian foods, UPI-friendly payments).

---

## 3. Launch scope (PROPOSED — owners must approve or change)

| Tier | Contents | Launch? |
|---|---|---|
| **0 — Trust foundation** | Locked-down data access (Firestore rules and login bridge); authenticated, rate-limited, validated APIs; AI on supported models with fallback; privacy policy, terms, AI consent, data export and deletion; monitoring and backups; CI | Must ship |
| **1 — Core product** | Tasks; Workout (including voice logging and summaries); Diet (text, voice, photo logging, summaries); Orbit chat; reliable push reminders; Settings | Must ship |
| **2 — Revenue** | Free and Pro plans, AI credits, Razorpay billing, pricing page, honest landing page | Must ship if charging at launch |
| **3 — Goal planning** | Goal → clarification → plan → review/edit → activate into existing domains (§9) | **Decision required:** (a) ship a thin slice, or (b) defer. Recommendation: (b) unless Tiers 0–2 are on track by the end of Week 2 |
| **Post-launch** | Adaptive planning, barcode scan, Apple Health/watch sync, coach tier, international pricing, deeper analytics | Backlog |

Only humans change this table. Anything not in Tiers 0–2 (or 3 if approved) is backlog.

---

## 4. Monetization (working decisions — see `DECISIONS.md`)

- **Plans:** Free and one paid plan, Pro. No third tier at launch.
- **Price:** Pro ₹59 per month (owner decision). Annual option ₹499 (proposed, same plan). Tax treatment (GST inclusive or exclusive) and registration to be confirmed with an accountant.
- **Free:** all non-AI features unlimited. AI features limited by a monthly credit allowance.
- **Credits (proposed):** Free 100 per month, Pro 1,000 per month. Cost per use (proposed): text meal 1, voice meal 2, voice workout 2, nutrition summary 2, workout summary 3, chat message 3, photo scan 8. Cache hits cost 0. Values live in one config file. A daily per-feature cap guards against abuse.
- **Trial (proposed):** 7-day Pro trial.
- **Payments (proposed):** Razorpay subscriptions. Access is granted only after a verified server-side webhook, never from the client. Cancel any time, effective at the end of the paid period. Failed payment: grace period (length TBD), then downgrade to Free. Refund policy TBD.
- **Unit economics guardrail:** at full credit use, AI cost per Pro user must stay below net revenue after payment fees and taxes. Review monthly using real usage logs.
- **Honest marketing:** no "free forever" or "no upsells" claims while a paid plan exists. No testimonials that are not from real users.

---

## 5. Launch-quality bar for core features

### AI meal logging
- **Text and voice:** result is editable before saving. Failures offer a manual path.
- **Photo scan:** the model suggests up to 3 candidate dishes with portions. The user confirms before logging. Show "check this" when confidence is low. Never show a wrong dish as "high confidence".
- **Calories must be repeatable:** the same dish and portion gives the same number (verified dish table; AI only for dishes not in the table). Calories are labelled as estimates and shown as a range where uncertain.
- **Proposed accuracy targets (owners to set):** on a labelled set of at least 30 typical user photos, top-1 dish at least 80%, top-3 at least 90%, no confidently wrong results; calories within ±30% for at least 80% of known dishes.
- **Unavailable AI:** show "Photo scan is busy. Type or speak your meal instead." with working one-tap alternatives.

### Orbit chat and summaries
Responses use only the user's own relevant data. No medical claims. Clear failure states.

### Reminders
Meal, workout and task reminders arrive when the app is closed (server-sent web push). Skip a reminder when the item is already logged. iOS requires the app to be added to the Home Screen; the UI explains this.

### Account and data
Sign-in with Google. The user can export their data and delete their account (including subscription cancellation).

---

## 6. Safety (health and fitness)

- Estimates and suggestions, not medical advice. No guaranteed outcomes.
- Owners define safety limits (minimum daily calories, maximum weekly weight-change rate, beginner exercise load). Limits are enforced in server validation. Values to be set in `SECURITY.md`.
- Ask for age and relevant conditions when plans depend on them. Redirect to a professional for pregnancy, eating-disorder signals, minors and medical conditions.
- Minimum user age: TO BE DECIDED by owners.
- Distinguish goal, plan, logged data, calculated progress and AI interpretation.

## 7. Privacy and consent

- Privacy policy and terms published and linked from sign-up. Reviewed by a lawyer before launch (covers India's DPDP Act, and GDPR if EU users are accepted).
- Before first AI use, show which processors receive data (Groq for text and voice, Google for photos) and record consent.
- Photos and audio are not stored after processing (to be verified in code).
- Retention: deleting an account removes the user's data in Firestore and cancels the subscription.
- Free-tier AI provider plans are not used for real user data.

---

## 8. Non-functional requirements

- **Security:** server-side validation and authorization, owner-only data access, secure secrets, safe logging.
- **Reliability:** safe retries, provider fallback, no data loss, rollback path, tested backups.
- **Performance and cost:** no unnecessary reads or AI calls. A photo scan returns within about 10 seconds, with a progress indicator.
- **Maintainability:** reuse existing systems, tests, documented decisions.

## 9. Goal planning (Tier 3 — pending scope decision)

Flow: goal in natural language → AI understanding → only necessary clarification → confirmed goal → structured plan → user review and edit → approval → activation into existing Tasks, Workout, Diet and Notifications → actual progress → (post-launch) adaptation proposals.

Requirements if shipped:
- Unusable input is handled safely. Ask only questions that change the plan or avoid an unsafe assumption. Re-evaluate readiness after answers.
- Generated plans are validated, respect safety limits and are not active until approved.
- Activation is idempotent and creates no duplicate records.
- Progress comes from actual records, never from the plan.
- AI may propose edits and adaptations, but significant changes to an active plan need user approval and create a new plan version.

## 10. Success metrics

Baselines set during beta; targets chosen by owners.

- Activation: share of new users who log something within 24 hours.
- Week-4 retention.
- Free-to-paid conversion and monthly churn.
- AI cost per active user (from usage logs) against the guardrail in §4.
- AI success rate without fallback; photo-scan confirmation rate.
- Support requests per 100 users.

## 11. Non-goals (unless the owners add them)

New external integrations, extra AI providers, autonomous silent plan changes, social features, large analytics systems, unrelated redesigns, parallel domain systems, features added only because an AI considers them useful.

## 12. Feature specification and done

Non-trivial features need a specification before tests: goal, user flow, acceptance criteria, edge and error cases, auth/authorization, data, API and frontend impact, security, out of scope. Depth depends on the tier in `AI_RULES.md §3`. Definition of done: `AI_RULES.md §12`.

## 13. Authority

Humans own product intent, scope, acceptance criteria, pricing, legal and safety limits, and release approval. AI assists and cannot redefine the product.
