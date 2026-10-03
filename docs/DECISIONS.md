# DailyOS — Decision Record

**Version:** 1.0 · **Started:** 2026-10-03

Status values: `ACCEPTED` (owner confirmed), `PROPOSED` (needs owner confirmation), `SUPERSEDED`.
Add a new entry for every decision that changes requirements, architecture, providers, pricing or security. Do not edit history; supersede it.

Entry format:

```text
ID · Title
Date · Status
Decision
Reason / evidence
Affected documents
Consequences
```

---

## D-001 · AI providers: Gemini for photos, Groq for text and voice
**2026-10-03 · ACCEPTED**
- **Decision:** Photo identification uses Google `gemini-3.8-flash` (fallback `gemini-3.7-flash`). Text, chat and summaries use Groq `gpt-oss-120b` (fallback `gpt-oss-20b`). Transcription uses Groq `whisper-large-v3-turbo`. Groq Qwen vision is disabled by default.
- **Evidence:** Groq retired three models the app used. On a 10-photo test, Qwen identified about 3–4 correctly with several confident errors; Gemini identified all 8 photos that returned results.
- **Affected:** ARCHITECTURE §7, AI_RULES §7. Supersedes the old "no additional AI provider" rule.
- **Consequences:** Photos are processed by Google, which must appear in the AI consent. Gemini free tier is development only.

## D-002 · Models and providers are configuration
**2026-10-03 · ACCEPTED**
- **Decision:** All model IDs live in `lib/ai/models.ts` with env overrides. `npm run check:models` runs before deploys. No hard dependency on a preview model without a fallback.
- **Reason:** Providers retire models with little notice.

## D-003 · Pricing: Free plus one Pro plan
**2026-10-03 · ACCEPTED (monthly price) / PROPOSED (annual and trial)**
- **Decision:** Free and one paid plan, Pro at ₹59 per month. Proposed: annual ₹499, 7-day trial.
- **Reason:** Keep price low for the Indian market; one paid tier is simpler to support.
- **Open:** GST treatment, refund policy, grace period.

## D-004 · Cost control with monthly credits and daily caps
**2026-10-03 · PROPOSED**
- **Decision:** AI use is metered in credits (Free 100, Pro 1,000 per month; per-feature costs in PRD §4) with daily abuse caps. Cache hits are free.
- **Reason:** Guarantees worst-case cost per user stays below revenue.

## D-005 · Payments with Razorpay Subscriptions
**2026-10-03 · PROPOSED**
- **Decision:** Razorpay Subscriptions. Access changes only after a signature-verified, idempotent webhook.
- **Reason:** India-first, supports UPI and cards.

## D-006 · Firestore access via login bridge and owner-only rules
**2026-10-03 · PROPOSED (pending design review)**
- **Decision:** The server mints a Firebase custom token for the NextAuth user; Firestore rules enforce `request.auth.uid`. Server-only collections are not client-writable.
- **Reason:** Audit found Firestore unprotected. The bridge keeps realtime listeners and avoids rewriting all data access into APIs within the timeline.
- **Alternative rejected for now:** routing all data access through API routes (larger rewrite).

## D-007 · Reminders triggered by an external scheduler
**2026-10-03 · ACCEPTED**
- **Decision:** Remove the Vercel cron entry (Hobby plan allows daily only). An external scheduler calls `/api/push/cron` every minute with a bearer secret.
- **Revisit:** if the project moves to a paid Vercel plan, native cron becomes an option.

## D-008 · Photo scan is suggest-then-confirm
**2026-10-03 · PROPOSED**
- **Decision:** The vision model identifies dishes against a closed vocabulary. Macros come from a verified dish table. The user confirms. If AI is unavailable, offer type or speak. No fallback to a weaker model.
- **Evidence:** Same photo produced 677 and 165 kcal on different runs.

## D-009 · Hosting and environments before launch
**2026-10-03 · PROPOSED**
- **Decision:** Move off Vercel Hobby before charging users (verify Vercel's current terms). Use separate API keys for Preview and Production; production AI runs on billing-enabled accounts with spend limits.
- **Reason:** Hobby is for non-commercial use; free tiers have low limits, no reliability guarantee and data-use terms unsuitable for user data.

## D-010 · Do not rotate accounts or projects to bypass quotas
**2026-10-03 · ACCEPTED**
- **Decision:** After any 401/403 or quota block from a provider, stop and report. Never create additional accounts, keys or projects to get around limits.
- **Reason:** A Google project returned 403 PERMISSION_DENIED during testing; rotating risks the production account.

## D-011 · Public launch on Sunday 8 Nov 2026 (Diwali), payments decoupled
**2026-10-03 · ACCEPTED (date) / PROPOSED (contingency)**
- **Decision:** Public launch targets Sun 8 Nov 2026. Scope freezes Tue 6 Oct, feature freeze Fri 23 Oct, closed beta from Sun 25 Oct, go/no-go Thu 5 Nov, change freeze Fri 6 Nov.
- **Contingency (proposed):** if billing or Razorpay live mode is not ready by 5 Nov, launch with free credits and a Pro waitlist, then enable Pro. Security, consent and deletion gates are never cut; if they fail, the date moves.
- **Reason:** 36 days with a team of three; payments depend on third-party activation time that the team cannot control.
- **Affected:** PHASES.md (v4.0), MEMORY.md.
