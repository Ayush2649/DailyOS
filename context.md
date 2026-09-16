# DailyOS — Project Context & Change Log

> This file is a reference for any AI model or developer working on this project.
> It documents the architecture, decisions, and all changes made with dates.

---

## 📁 Project Overview

**DailyOS** is a Next.js 14 PWA (Progressive Web App) — a personal productivity + fitness + nutrition tracker with AI coaching.

- **Framework:** Next.js 14.2.5 (App Router)
- **Database:** Firebase Firestore (Client SDK for reads/writes from browser, Admin SDK for server-side operations)
- **Auth:** NextAuth v4 with Google OAuth (JWT strategy)
- **AI Provider:** Groq SDK (LLaMA 3.3 70B for text, LLaMA 4 Maverick for vision, Whisper for audio)
- **Push Notifications:** Web Push via VAPID + service worker
- **Styling:** Tailwind CSS + Radix UI primitives
- **Deployment:** Vercel
- **PWA:** manifest.json + sw.js for offline/installable behavior

---

## 🏗️ Architecture

### Routes (App Router)
| Route | Description |
|-------|-------------|
| `/` | Public landing/marketing page |
| `/signin` | Google OAuth sign-in page |
| `/dashboard` | Home view (streaks, stats, quick access) |
| `/dashboard/diet` | Nutrition tracking (meal logging, photo scan, macros) |
| `/dashboard/workout` | Workout logging (exercises, sets/reps, cardio, voice) |
| `/dashboard/tasks` | Task management (projects, daily/weekly tasks) |
| `/dashboard/settings` | Notification preferences + Health Sync (Apple Watch) |

### API Routes
| Endpoint | Purpose |
|----------|---------|
| `/api/auth/[...nextauth]` | NextAuth Google OAuth handlers |
| `/api/aria` | Orbit AI chatbot (Groq LLaMA 3.3 70B) |
| `/api/analyze-meal` | Meal photo → macros (Groq LLaMA 4 Maverick vision) |
| `/api/estimate-meal` | Dish name → macros (Groq LLaMA 3.3 70B) |
| `/api/voice-meal` | Audio → transcribe → parse meals (Whisper + LLaMA) |
| `/api/voice-workout` | Audio → transcribe → parse exercises (Whisper + LLaMA) |
| `/api/summarize-nutrition` | Daily nutrition coach summary |
| `/api/summarize-workout` | Post-workout coach summary |
| `/api/health/ingest` | Webhook for Apple Watch / Health Auto Export data |
| `/api/health/token` | Generate/retrieve health sync tokens |
| `/api/push/subscribe` | Save/delete push notification subscriptions |
| `/api/push/send` | Send immediate push notification |
| `/api/push/cron` | Cron-triggered scheduled notification reminders |
| `/api/push/debug` | Debug push subscriptions and preferences |

### Key Libraries & Files
| Path | Purpose |
|------|---------|
| `lib/auth.ts` | NextAuth config (Google provider, JWT callbacks) |
| `lib/firebase.ts` | Firebase Client SDK init (Firestore + Storage) |
| `lib/firebaseAdmin.ts` | Firebase Admin SDK init (server-side Firestore) |
| `lib/firestore.ts` | All Firestore CRUD operations (tasks, meals, workouts, etc.) |
| `lib/orbitContext.ts` | In-memory context store for Orbit AI (diet, workout, task data) |
| `lib/utils.ts` | Utility functions (cn, dates, IDs, colors) |
| `lib/workoutPresets.ts` | Built-in workout templates (Push, Pull, Leg, Full Body, etc.) |
| `types/index.ts` | All TypeScript interfaces (Task, MealEntry, WorkoutSession, etc.) |
| `middleware.ts` | NextAuth route protection for /dashboard/* |

### Firestore Collections
| Collection | Used For |
|------------|----------|
| `tasks` | User tasks (title, dueDate, priority, status, projectId) |
| `projects` | Task projects (name, color) |
| `workouts` | Workout sessions (exercises, cardio, duration, summary) |
| `bodyweight` | Body weight log entries |
| `meals` | Meal entries (name, macros, date, imageUrl) |
| `mealTemplates` | Saved meal templates for quick re-logging |
| `macroGoals` | Daily macro targets per user |
| `workoutTemplates` | Custom workout templates |
| `notificationPrefs` | Per-user notification schedule & timezone |
| `push_subscriptions` | Web Push subscription objects per device |
| `healthTokens` | Bearer tokens for health webhook authentication |
| `healthActivity` | Daily activity data (steps) from watch sync |

---

## 🔐 Environment Variables Required

See `.env` file for all 17 required variables with placeholders.

**Summary:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth JWT
- `GROQ_API_KEY` — AI features (all LLaMA + Whisper calls)
- `NEXT_PUBLIC_FIREBASE_*` (6 vars) — Firebase Client SDK
- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — Push notifications
- `CRON_SECRET` — Vercel Cron auth

---

## 📝 Change Log

### 2026-09-12 17:17 IST — Full Project Audit & Fixes

**Performed by:** AI Assistant (Antigravity / Claude Opus 4.6)

#### Audit Findings (10 issues found):
1. ⛔ **CRITICAL** — Meal photo scanner using deprecated Groq model (500 errors)
2. ⛔ **CRITICAL** — Push subscribe route using Firebase Client SDK server-side (permission errors)
3. ⚠️ **HIGH** — Missing `/api/health/token` endpoint (HealthSyncSettings component broken)
4. ⚠️ **HIGH** — HealthSyncSettings component not mounted in settings page
5. ⚠️ **HIGH** — Vercel Cron not configured (push reminders never fire)
6. ⚠️ **HIGH** — No .env file or .env.example for reference
7. 💡 **MEDIUM** — Unused npm packages adding ~5MB (openai, anthropic, google-ai)
8. 💡 **MEDIUM** — Middleware matcher had dead routes
9. 💡 **MEDIUM** — Next.js config used deprecated `experimental.serverComponentsExternalPackages`
10. 💡 **MEDIUM** — PWA manifest theme_color mismatched layout.tsx viewport

#### Fixes Applied:

| # | File Changed | What Was Done |
|---|-------------|---------------|
| 1 | `app/api/analyze-meal/route.ts` | Changed model from `meta-llama/llama-4-scout-17b-16e-instruct` (deprecated) → `meta-llama/llama-4-maverick-17b-128e-instruct` |
| 2 | `app/api/push/subscribe/route.ts` | Rewrote to use `adminDb` (Firebase Admin) instead of `db` (Firebase Client). Fixed both POST and DELETE handlers. |
| 3 | `app/api/health/token/route.ts` | **NEW FILE** — Created health token API. GET returns existing token or creates one. `?regenerate=1` creates a new token. |
| 4 | `app/dashboard/settings/page.tsx` | Added `HealthSyncSettings` import and rendered it with a "Health Sync" section header. |
| 5 | `vercel.json` | Added `crons` config: `{ "path": "/api/push/cron", "schedule": "* * * * *" }` |
| 6 | `.env` | **NEW FILE** — Created with all 17 env variable placeholders + comments on how to get each key. Already gitignored. |
| 7 | `package.json` | Removed unused deps: `@anthropic-ai/sdk`, `@google/generative-ai`, `openai` |
| 8 | `middleware.ts` | Simplified matcher from 4 patterns to just `["/dashboard/:path*"]` |
| 9 | `next.config.mjs` | Moved `experimental.serverComponentsExternalPackages` → `serverExternalPackages` |
| 10 | `public/manifest.json` | Changed `theme_color` from `#6366f1` to `#FF5E4D` to match brand |
| 11 | `context.md` | **NEW FILE** — This file. Project documentation for AI/developer reference. |

---

## 🔑 How to Get API Keys

### 1. Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google` (dev) and `https://yourdomain.com/api/auth/callback/google` (prod)
7. Copy the Client ID and Client Secret

### 2. NextAuth Secret (NEXTAUTH_SECRET)
Run in terminal:
```bash
openssl rand -base64 32
```
Use the output as your secret. This signs JWT tokens.

### 3. Groq API Key (GROQ_API_KEY)
1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up / log in
3. Navigate to **API Keys** (left sidebar)
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)
6. Free tier gives generous rate limits

### 4. Firebase (6 Client vars + 2 Admin vars)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project → Add a **Web app**
3. Copy the config object → these are your `NEXT_PUBLIC_FIREBASE_*` values
4. For Admin SDK: **Project Settings** → **Service Accounts** → **Generate new private key**
5. The downloaded JSON contains `client_email` (→ `FIREBASE_CLIENT_EMAIL`) and `private_key` (→ `FIREBASE_PRIVATE_KEY`)
6. Enable **Firestore Database** (start in test mode for dev)
7. Enable **Cloud Storage** (for meal image uploads)

### 5. VAPID Keys (Push Notifications)
Run in terminal:
```bash
npx web-push generate-vapid-keys
```
This outputs a public key and private key. Use them for the VAPID env variables.

### 6. Cron Secret (CRON_SECRET)
Run in terminal:
```bash
openssl rand -hex 32
```
Set this same value in both your `.env` and Vercel Environment Variables dashboard.

---

## ⚠️ Important Notes

1. **Firestore Security Rules**: If using restrictive rules, ensure the Firebase Admin SDK service account has full access. The client SDK uses NextAuth sessions (not Firebase Auth), so rules relying on `request.auth` won't work for client-side writes unless you add a custom token bridge.

2. **Groq Model Availability**: Groq deprecates models periodically. If `llama-4-maverick-17b-128e-instruct` stops working for vision, check [console.groq.com/docs/models](https://console.groq.com/docs/models) for the current vision-capable model.

3. **Vercel Cron**: The `* * * * *` schedule (every minute) is available on Vercel Pro plans. Hobby plans support `0 * * * *` (hourly) minimum. Adjust if needed.

4. **NEXTAUTH_URL**: Must be set to your production URL on Vercel (e.g., `https://dailyos.app`). For local dev, use `http://localhost:3000`.

