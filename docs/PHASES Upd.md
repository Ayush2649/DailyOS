# DailyOS — Implementation Phases

**Status:** Canonical execution roadmap
**Version:** 4.0 · **Last updated:** 2026-10-03
**Team:** 3 people
**Plan start:** Saturday 3 Oct 2026 · **Public launch target:** Sunday 8 Nov 2026 (Diwali) · 36 days

`PHASES.md` says **what happens in what order**. Gates and definition of done: `AI_RULES.md §3 and §12`. Scope: `PRD.md §3`. Live progress: `MEMORY.md`.

---

## 1. Principles

- Foundation before features: security blockers and a test/CI base come first.
- Work is risk-tiered (A/B/C). Do not run Tier C work through Tier A ceremony.
- Money, auth, data access, consent and deletion are Tier A and are never rushed.
- Scope freezes on Tue 6 Oct. Only the owners reopen it.
- Security is built in from week 1. The hardening review is a check, not the first time security is considered.
- A failed gate means the next period starts with that work.

## 2. Calendar and milestones

| Date | Milestone |
|---|---|
| Tue 6 Oct | Launch scope frozen and recorded in `DECISIONS.md` |
| Fri 9 Oct | **Week 1 gate** |
| Fri 16 Oct | **Week 2 gate** |
| Fri 23 Oct | **Feature freeze** and Week 3 gate |
| Sun 25 Oct | Closed beta opens (about 20–50 people) |
| Fri 30 Oct | Security review complete; live-mode payment test done |
| Thu 5 Nov | **GO / NO-GO** |
| Fri 6 Nov | Change freeze (hotfix lane only) |
| Sun 8 Nov | **Public launch** |
| Mon 9 – Tue 10 Nov | On-call, watch cost, errors, payments |

## 3. Lead-time tasks (start in the first 48 hours)

These are mostly waiting time, not coding:

- Razorpay account activation and Subscriptions enablement. It typically needs KYC and live policy pages (privacy, terms, refund/cancellation, contact) — verify in their dashboard.
- Custom domain and DNS.
- Paid plans and billing: Vercel (commercial use), Groq Developer plan with a spend limit, Google billing for Gemini on the owner's own project, Firebase Blaze for backups and budget alerts (verify).
- Google OAuth consent screen published to production (not Testing).
- Accountant for GST and invoicing; lawyer for privacy policy and terms.
- Error tracking and uptime monitoring accounts.
- Beta tester list; support email address.

## 4. Week 1 — Foundation and security blockers (3–9 Oct)

- Owners freeze launch scope (`PRD.md §3`).
- Merge the AI-migration branch after preview verification (fixes retired models).
- Test and CI base: Vitest, Firebase emulator, GitHub Actions, branch protection.
- **Tier A:** fail-closed cron route; remove the debug route.
- **Tier A:** Firestore login bridge and owner-only rules, with rules tests, rolled out in the safe order (`ARCHITECTURE.md §5`).
- **Tier A:** rate limiting on all routes; zod validation on all request bodies; tests for 401, 400, 429 and cross-user access.
- `.env.example`; separate Preview and Production keys; secrets audit; confirm Vercel variables and Firebase Admin credentials.
- Start the lead-time tasks in §3.

**Gate:** no open Firestore access, no fail-open auth, every route rate limited and validated, CI green on `main`, scope frozen.

## 5. Week 2 — Revenue and compliance (10–16 Oct)

- **Tier A:** plans, credits, daily caps, usage ledger and spend guard.
- **Tier A:** Razorpay subscriptions in test mode, verified webhooks, server-side entitlements, cancellation.
- **Tier B:** pricing page, credits meter, upgrade prompts; honest landing page (remove "free forever" claims and unverified testimonials).
- **Tier A:** privacy policy and terms published (needed for Razorpay), AI consent, data export, account deletion.
- Lawyer and accountant engaged.

**Gate:** a test-mode payment upgrades an account only through a verified webhook; credits cannot be bypassed; consent, export and deletion work end to end; policy pages are live.

## 6. Week 3 — Core quality and monitoring (17–23 Oct)

- **Tier B:** reliable reminders (diagnose, server-sent push, skip rules, `nextFireAt` query, external scheduler running).
- **Tier B:** photo scan quality — closed dish vocabulary (including festive foods: mithai, namkeen), verified dish table, user confirmation, busy states; 30-photo labelled eval.
- Error tracking, uptime alerts, AI usage and cost dashboard.
- Firestore backups scheduled; restore tested.
- Security review begins; health safety limits signed off by owners.

**Gate / feature freeze (Fri 23 Oct):** reminders and photo scan meet `PRD.md §5`; monitoring and backups live; no new features after this date.

## 7. Week 4 — Beta and hardening (24–30 Oct)

- Closed beta opens Sun 25 Oct, at a discount, with feedback channel.
- Full security review: authorization and cross-user tests on every route, headers, CORS, secrets, dependencies, logging.
- Failure drills: AI provider down, webhook replay, Firestore denial, limiter down, spend limit hit.
- Live-mode payment test with a real small payment and refund.
- Lawyer review of policies; accountant confirms tax setup.
- Fix launch-blocking defects only.

**Gate (Fri 30 Oct):** `SECURITY_CHECKLIST` passes; no critical or high findings open; live payment path verified (or consciously deferred under §9).

## 8. Week 5 — Release candidate and launch (31 Oct – 8 Nov)

- Fix-only period. Rollback drill. Production configuration check. Hosting plan allows commercial use.
- Set spend limits and alerts on Groq, Google and Vercel.
- On-call rota for 7–10 Nov; prepared support replies; status message ready.
- **Thu 5 Nov GO/NO-GO** against §10. **Fri 6 Nov** change freeze.
- **Sun 8 Nov** launch. Mon–Tue: watch cost, error rate, payments, credits; use the hotfix lane for emergencies.

## 9. Contingency and cut order

- **Payments are decoupled from the date.** If Razorpay live mode or the billing gates are not ready by Thu 5 Nov, launch on 8 Nov with free credits and a "Pro coming soon" waitlist, and enable Pro when ready.
- **Never cut:** Firestore rules, authentication and authorization, rate limiting and validation, credits, privacy policy and consent, account deletion, backups. If any fail, move the launch date.
- **Cut in this order if behind:** (1) goal planning, (2) annual plan and trial, (3) launch-promotion extras, (4) photo dish table (keep photo scan labelled beta or Pro-only), (5) health sync link, (6) reminder skip-rules.

## 10. Go / no-go checklist (Thu 5 Nov)

```text
[ ] Scope frozen and recorded
[ ] Firestore rules deployed; rules tests pass
[ ] All routes authenticated, validated, rate limited
[ ] CI green; branch protection on main
[ ] Credits verified (cannot be bypassed)
[ ] Billing verified (test mode, then small live payment) — or deferred under §9
[ ] Webhook replay and idempotency verified
[ ] Privacy policy, terms, AI consent, export, deletion live and legal-reviewed
[ ] Health safety limits set and enforced server-side
[ ] AI quality bars met on the labelled eval set
[ ] Error tracking, uptime alerts, AI cost dashboard live
[ ] Backup restore tested; rollback drill done
[ ] Production env and keys verified; Preview keys separate
[ ] Hosting plan allows commercial use; spend limits set
[ ] Beta completed; launch-blocking defects closed
[ ] On-call rota and support replies ready
[ ] Owner approval
```

## 11. Feature-level flow

Tier A: spec → acceptance criteria → edge, failure and security cases → human approval → tests → implement → regression → security review → human review → staging → owner acceptance.
Tier B: short spec → tests for logic → implement → regression → review → preview check.
Tier C: implement → lint, typecheck, build → preview check.

## 12. Dependencies

```text
Scope freeze → CI and test base → data-access rules and auth hardening
→ credits and metering → billing → paywall UI → consent, deletion, legal
→ hardening → beta → release
```

Parallel work needs shared contracts agreed first. Do not build against an undefined upstream contract.

## 13. After launch

Observed problem → evidence → prioritization → spec → tests → implementation → measurement. Tier rules still apply; the hotfix lane (`AI_RULES.md §3`) covers emergencies.

## 14. Phase states and ownership

States: `NOT_STARTED · IN_PROGRESS · BLOCKED · READY_FOR_REVIEW · VERIFIED · DEFERRED`. Record live state in `MEMORY.md`.
One primary owner and at least one reviewer per important feature; for Tier A the reviewer is not the owner. Names are assigned in `MEMORY.md`.
