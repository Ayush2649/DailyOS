# DailyOS — Project Memory

**Status:** Living project-state document
**Version:** 3.0 · **Last verified:** 2026-10-03

---

## 1. How to use this file

It records what is **true now**. It is not a PRD, architecture document or rulebook.

Every fact carries a source tag:

- `[repo]` seen in the code by an agent audit
- `[logs]` seen in command, test or deployment output
- `[dash]` seen in a Vercel, Firebase, Groq or Google console
- `[owner]` stated by the owner
- `[UNKNOWN]` not verified

Unknown stays UNKNOWN. Record breakages and reversals honestly. Update after every significant change.

Source hierarchy: repository (reality) → MEMORY (state) → PRD (what) → ARCHITECTURE (how) → AI_RULES (constraints) → PHASES (order) → DECISIONS (why).

---

## 2. Project

- DailyOS: tasks, workout, diet, Orbit AI coach, push reminders, health sync link, PWA. Team of 3. Monetized product.
- Stack: Next.js 14, NextAuth (JWT, Google), Firestore, Groq, Gemini, Vercel Hobby, Web Push. `[repo]`
- Documentation set: PRD, ARCHITECTURE, AI_RULES, PHASES, MEMORY, DECISIONS (v3.0).

## 3. Current state

- **Phase:** Week 1 — Foundation and security blockers (re-baselined 2026-10-03).
- **Plan start:** Sat 3 Oct 2026. **Public launch target:** Sun 8 Nov 2026 (Diwali). `[owner]` Key dates and the go/no-go on Thu 5 Nov are in `PHASES.md §2`.
- **Launch scope:** NOT frozen. Proposal in `PRD.md §3`.
- **Release state:** pre-launch; no paying users.
- **Branches:** `main` at `ab75710`. `ai-migration-gemini` pushed with `dd85734` and `3dffe17`; a later commit bundling the dish vocabulary as a static import may be uncommitted or unpushed. Merge status `[UNKNOWN]` (last known: not merged). `[logs]`
- **Production deployment:** built from `main`, about 16 days old on 2026-10-02. It predates the AI migration, so production AI may still call retired Groq models. `[dash]` Effect `[UNKNOWN]`: check production AI routes.

## 4. Feature ledger

| Feature | Status | Evidence |
|---|---|---|
| Authentication (NextAuth, Google, JWT) | Working; session secret from `NEXTAUTH_SECRET`, no hardcoded fallback | `[repo]` |
| Tasks, Workout, Diet screens | Exist. Behaviour not re-audited | `[owner]` |
| Orbit chat, text meal, voice meal, voice workout, summaries | Migrated to `gpt-oss-120b` with `gpt-oss-20b` fallback on branch. Smoke test passed on branch | `[logs]` |
| Photo scan | Gemini primary with fallback and circuit breaker on branch. Qwen vision off. Dish names OK on tested photos; calories unstable | `[logs]` |
| Push reminders | Test notification works. Scheduled reminders do not fire reliably when the app is closed. Root cause not yet diagnosed. External scheduler documented; whether it is running `[UNKNOWN]` | `[owner]`, `[repo]` |
| Health sync link (Settings) | Showed "Generating…" on the deployed site. Likely Admin credential issue `[UNKNOWN]` | `[owner]` |
| Firebase Admin on Vercel | Local run showed "Could not load the default credentials". Vercel env vars being set. Status `[UNKNOWN]` | `[logs]` |
| AI consent UI | One TODO remains; a notice was added to the photo modal | `[repo]` |
| Credits, plans, billing | Not implemented | `[repo]` |
| Goal planning | Not implemented. Scope decision pending | `[owner]` |

## 5. AI evaluation record

- Groq retired `llama-4-maverick` (2026-03-09), `llama-4-scout` (2026-07-17) and `llama-3.3-70b-versatile` (2026-08-16). `[dash]`
- Photo eval, 10 photos, Groq `qwen3.8-27b`: top-1 correct 3/10 by script (about 4–5 of 10 by manual reading); several confidently wrong (cheela → paratha, dosa → paratha, poha → fried rice). `[logs]`
- Photo eval, Gemini `gemini-3.8-flash`: top-1 correct on all 8 photos that returned results, no confidently wrong results. Idli, khichdi and roti-sabzi-raita not tested on the primary model. On the fallback model (`gemini-3.7-flash`) khichdi was wrong with high ambiguity. Small, clean sample. `[logs]`
- Calories for the same photo varied widely between runs (cheela 677 vs 165 kcal), so a verified dish table is needed. `[logs]`
- Gemini free tier: 5 requests per minute and a small daily cap on this model; 503 "high demand" errors on about 1 in 4 calls. A secondary Google project returned 403 PERMISSION_DENIED; cause `[UNKNOWN]`. Do not create further accounts or projects. `[logs]`
- Groq free tier exhausted Qwen's daily token cap (200K) during testing. `[logs]`
- Measured cost per scan (paid-rate estimate): about ₹0.20–0.25 (vision plus macro step). Production cost per active user: not yet measured. `[logs]`

## 6. Test state

- Automated tests: **6** (Vitest unit tests covering `/api/push/cron` fail-closed auth). CI: **none**. `[repo]`
- Manual scripts: `npm run check:models`, `smoke:ai`, `eval:photos` (live calls, quota-limited). `[repo]`
- Known failing tests: none (all 6 pass).

## 7. Security state

| Area | State | Source |
|---|---|---|
| Firestore access | Client SDK direct; no `firestore.rules` in repo; `request.auth` null; published console rules `[UNKNOWN]` | `[repo]` |
| Authentication | NextAuth JWT, Google OAuth | `[repo]` |
| Per-route auth checks | Audited: 12 NextAuth-protected, 1 custom token (health ingest), 1 cron secret (fail-closed) | `[repo]` |
| Cron and debug push routes | Resolved: `/api/push/cron` fails closed (500 if unset/empty, constant-time Bearer match); `/api/push/debug` deleted | `[repo]` |
| Rate limiting | None on any of the 14 routes | `[repo]` |
| Input validation | 0 of 14 routes validate request bodies | `[repo]` |
| Hardcoded secrets | None in tracked files | `[repo]` |
| `.env.example` | Missing | `[repo]` |
| Dependency audit | Not run | `[UNKNOWN]` |
| Backups and restore | `[UNKNOWN]` | — |
| Rollback | Vercel promote-previous-deployment available | `[dash]` |
| Hosting plan | Vercel Hobby (non-commercial per Vercel terms — verify) | `[dash]` |

## 8. Launch blockers (ranked)

1. Firestore effectively open to any visitor with the public Firebase config.
2. [RESOLVED 2026-10-03] Cron route fails closed; debug route deleted.
3. No rate limiting; AI quotas and costs exposed to abuse.
4. No request validation.
5. No CI (Vitest test runner installed with 6 automated tests).
6. AI migration branch unmerged; production may use retired models.
7. No credits, billing, privacy policy, terms, AI consent, export or deletion.
8. Hosting plan not suitable for commercial use.
9. Backups and restore unverified.
10. Firebase Admin credentials on Vercel unverified (sync link, reminders).
11. Photo calories unstable; no verified dish table.
12. Reminders unreliable when the app is closed.

## 9. Open questions for owners

- Who is on call 7–10 Nov, and which of the three owns each stream (security/data, billing/credits, AI quality/UX).
- Status of the lead-time tasks (Razorpay activation, domain, paid plans, OAuth consent, accountant, lawyer): all UNKNOWN.
- Launch scope: confirm tiers; Goal planning (a) thin slice or (b) defer.
- Annual price (₹499?), trial length, grace period, refund policy.
- GST registration and tax-inclusive pricing.
- Minimum user age; health safety limits.
- Staging approach: separate Firebase project or Vercel preview only.

## 10. Decision references

See `DECISIONS.md` (D-001 to D-009).

## 11. Next action

```text
Next action:
Run the read-only Firestore design review: list every client Firestore path and user key,
confirm the NextAuth → Firebase custom-token bridge works for us, and draft firestore.rules
and the rules tests (nothing deployed).

Reason:
Largest launch blocker; everything else sits on top of correct data access.

Expected output:
A design note with collections, user key, server-only collections, draft rules and test list.

Verification:
Owner and reviewer read the note; rules tests are then written before any implementation.
```

Queue after that: fail-closed cron/debug fix → merge AI migration → rate limiting and validation → CI.

## 12. Maintenance

Keep this file factual, current and concise. Do not store specifications, long prompts or unapproved ideas here. If something is unknown, write UNKNOWN. Never manufacture project state.
