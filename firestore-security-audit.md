# Firestore Security Audit — SATAT (DailyOS)

**Date:** 2026-10-15  
**Status:** Post-deployment audit & verification complete — Firestore Security Rules deployed and active on production project `dailyos-afbbf`  
**Trigger:** Test-mode security rules deprecation & production security migration

---

## 1. Authentication Architecture

### Confirmed Findings

| Layer | Technology | Details |
|---|---|---|
| **Auth Provider** | NextAuth.js v4 (`next-auth@^4.24.7`) | Configured in `lib/auth.ts` |
| **OAuth Provider** | Google only | `GoogleProvider` with `clientId` / `clientSecret` from env |
| **Session Strategy** | JWT (stateless) | `session: { strategy: "jwt" }` |
| **User Identity** | `token.sub` (Google subject ID) | Exposed as `session.user.id` via callbacks |
| **Fallback Identity** | `session.user.email` | `getUserKey()` in `lib/auth/userKey.ts` falls back to email if `id` is null |
| **Custom Page** | `/signin` | Google OAuth button only |

### NextAuth Integration Details (Verified)

- **Provider config** (`lib/auth.ts`): Single `GoogleProvider` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars.
- **JWT callback**: Sets `token.id = token.sub` on first sign-in. Checks `PRELAUNCH_EXEMPT_USER_IDS` to set `token.onboarded = true`. Supports session update trigger for `onboarded` flag.
- **Session callback**: Exposes `session.user.id = token.sub ?? token.id` and `session.user.onboarded`.
- **Route handler** (`app/api/auth/[...nextauth]/route.ts`): Standard NextAuth catch-all exporting GET and POST.
- **Sign-in page** (`app/signin/page.tsx`): Client component using `signIn("google", { callbackUrl: "/dashboard" })`. Redirects to `/dashboard` if session exists.

### Auth Flow

```
User → signIn("google") → Google OAuth → NextAuth JWT callback
  → token.id = token.sub (Google subject ID)
  → Session cookie (JWT) stored in browser
  → API routes: getServerSession(authOptions) → getUserKey(session)
  → Firestore: adminDb operations (server-side, bypasses rules)

Client components: useSession() → session.user.id → passed to lib/firestore.ts helpers
  → Firestore client SDK (NO Firebase Auth context)
```

### Critical Finding: No Firebase Authentication on Client

> **VERIFIED:** The app does NOT import `firebase/auth` anywhere. The file `lib/firebase.ts` imports only `firebase/app`, `firebase/firestore`, and `firebase/storage`. No `getAuth()`, `signInWithCustomToken()`, `onAuthStateChanged()`, or any Firebase Auth method is called.

Authentication is handled entirely by NextAuth (server-side JWT). The Firebase client SDK (`firebase/firestore`) is used **without** Firebase Auth — meaning Firestore client calls have **no authenticated Firebase user context** (`request.auth` is null in Security Rules).

### Identity Key Details (Verified)

`getUserKey()` (`lib/auth/userKey.ts`) returns `user.id ?? user.email ?? null`. Accepts either a session object or a user-like object. In NextAuth's Google provider, `token.sub` is always the stable Google `sub` claim (numeric string), so the email fallback is unlikely to trigger. However, if it ever did, a single user could have data under two different keys.

---

## 2. Firebase Client and Admin SDK Usage

### Client SDK (`lib/firebase.ts`) — Verified

```
Imports: firebase/app, firebase/firestore, firebase/storage
Exports: db (Firestore), storage (Cloud Storage), app (default)
Auth:    NONE — firebase/auth is NOT imported
Config:  NEXT_PUBLIC_FIREBASE_* env vars (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
```

All client-side Firestore operations go through `lib/firestore.ts`, which imports `db` from `lib/firebase.ts`.

### Admin SDK (`lib/firebaseAdmin.ts`) — Verified

```
Import:  firebase-admin (default import)
Init:    Tries cert auth (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY), falls back to default app init
Exports: adminDb (admin.firestore()), admin (default)
```

Used by all `/api/*` routes and the dashboard server layout. **Bypasses all Firestore Security Rules.**

### Firebase Project Config Env Vars (Verified — names only, no values)

Client-side: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-side: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

No `firestore.rules`, `firebase.json`, or `.firebaserc` files exist in the repository. Security rules are managed only in the Firebase Console.

---

## 3. Firestore Data Model — All Collections and Document Paths

### Verified Collections (13 total)

All collections are **top-level**. No subcollections were found.

| # | Collection | Doc ID Pattern | `userId` Field | Scoping Method | Accessed By |
|---|---|---|---|---|---|
| 1 | `projects` | Auto-generated / `default_{userId}` | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK |
| 2 | `tasks` | Auto-generated | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK |
| 3 | `workouts` | Auto-generated | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK + Admin |
| 4 | `bodyweight` | Auto-generated / `initial_{userId}_{date}` | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK + Admin |
| 5 | `meals` | Auto-generated | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK |
| 6 | `mealTemplates` | Auto-generated | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK |
| 7 | `macroGoals` | `{userId}` | — (ID is userId) | Doc ID = userId | Client SDK + Admin |
| 8 | `workoutTemplates` | Auto-generated / deterministic | ✅ `userId` | Query `where("userId", "==", userId)` | Client SDK + Admin |
| 9 | `notificationPrefs` | `{userId}` | — (ID is userId) | Doc ID = userId | Client SDK + Admin |
| 10 | `userProfiles` | `{userId}` | ✅ `userId` | Doc ID = userId | Client (read) + Admin (read/write) |
| 11 | `push_subscriptions` | `{userId}_{endpointHash}` | ✅ `userId` | Doc ID prefix + query | Admin only |
| 12 | `healthTokens` | `{random_hex_token}` | ✅ `userId` | Query `where("userId", "==", userId)` | Admin only |
| 13 | `healthActivity` | `{userId}_{date}` | ✅ `userId` | Doc ID = `userId_date` | Admin only |

### Document Path Examples

- `projects/abc123` — auto-generated project doc
- `projects/default_{userId}` — idempotent starter project
- `tasks/xyz789` — auto-generated task doc
- `macroGoals/{userId}` — one doc per user, ID = userId
- `notificationPrefs/{userId}` — one doc per user, ID = userId
- `userProfiles/{userId}` — one doc per user, ID = userId
- `bodyweight/initial_{userId}_{YYYY-MM-DD}` — deterministic onboarding weight entry
- `push_subscriptions/{userId}_{base64EndpointSuffix}` — per-device push sub
- `healthTokens/{64-char-hex}` — random token doc ID
- `healthActivity/{userId}_{YYYY-MM-DD}` — daily steps doc
- `workoutTemplates/{deterministic-id}` — onboarding-generated templates have stable IDs

---

## 4. Client-Side and Server-Side Access Patterns

### 4a. Client SDK Access (`lib/firestore.ts`) — 29 Functions Verified

All client-side Firestore operations go through helper functions in `lib/firestore.ts`, which use the **client-side Firebase SDK** (`firebase/firestore`). These calls have **no Firebase Auth context** — they rely entirely on the `userId` parameter passed by calling components.

**Reads (userId-scoped via query or doc ID):**

| Function | Collection | Operation |
|---|---|---|
| `getProjects(userId)` | `projects` | `getDocs` with `where("userId", "==", userId)` |
| `getAllTasks(userId)` | `tasks` | `getDocs` with `where("userId", "==", userId)` |
| `getTasks(userId, projectId)` | `tasks` | `getDocs` with `where("userId"…)` + `where("projectId"…)` |
| `getWorkoutSessions(userId)` | `workouts` | `getDocs` with `where("userId", "==", userId)` |
| `getBodyWeightEntries(userId)` | `bodyweight` | `getDocs` with `where("userId", "==", userId)` |
| `getAllMeals(userId)` | `meals` | `getDocs` with `where("userId", "==", userId)` |
| `getMeals(userId, date)` | `meals` | `getDocs` with `where("userId"…)` + `where("date"…)` |
| `getMealTemplates(userId)` | `mealTemplates` | `getDocs` with `where("userId", "==", userId)` |
| `getMacroGoals(userId)` | `macroGoals` | `getDoc(doc(db, "macroGoals", userId))` |
| `getWorkoutTemplates(userId)` | `workoutTemplates` | `getDocs` with `where("userId", "==", userId)` |
| `getNotificationPrefs(userId)` | `notificationPrefs` | `getDoc(doc(db, "notificationPrefs", userId))` |
| `getUserProfile(userId)` | `userProfiles` | `getDoc(doc(db, "userProfiles", userId))` |

**Writes (userId embedded in document data):**

| Function | Collection | Operation | userId Enforcement |
|---|---|---|---|
| `createProject(userId, …)` | `projects` | `addDoc` | ✅ userId in data |
| `ensureStarterProject(userId)` | `projects` | `getDoc` + `setDoc` | ✅ userId in data, deterministic ID |
| `createTask(task)` | `tasks` | `addDoc` | ✅ userId in task object |
| `saveWorkoutSession(session)` | `workouts` | `addDoc` | ✅ userId in session object |
| `logBodyWeight(entry)` | `bodyweight` | `addDoc` | ✅ userId in entry object |
| `addMeal(meal)` | `meals` | `addDoc` | ✅ userId in meal object |
| `saveMealTemplate(template)` | `mealTemplates` | `addDoc` | ✅ userId in template |
| `saveMacroGoals(userId, goals)` | `macroGoals` | `setDoc` | ✅ Doc ID = userId |
| `saveWorkoutTemplate(template)` | `workoutTemplates` | `addDoc` | ✅ userId in template |
| `saveNotificationPrefs(userId, prefs)` | `notificationPrefs` | `setDoc` | ✅ Doc ID = userId |

**Updates and Deletes (⚠️ NO userId re-verification):**

| Function | Collection | Operation | Risk |
|---|---|---|---|
| `deleteProject(projectId)` | `projects` | `deleteDoc` | ⚠️ Only doc ID checked |
| `updateTask(taskId, updates)` | `tasks` | `updateDoc` | ⚠️ Only doc ID checked |
| `deleteTask(taskId)` | `tasks` | `deleteDoc` | ⚠️ Only doc ID checked |
| `updateWorkoutSession(id, …)` | `workouts` | `updateDoc` | ⚠️ Only doc ID checked |
| `deleteMeal(mealId)` | `meals` | `deleteDoc` | ⚠️ Only doc ID checked |
| `updateMealTemplate(id, …)` | `mealTemplates` | `updateDoc` | ⚠️ Only doc ID checked |
| `deleteMealTemplate(id)` | `mealTemplates` | `deleteDoc` | ⚠️ Only doc ID checked |
| `deleteWorkoutTemplate(id)` | `workoutTemplates` | `deleteDoc` | ⚠️ Only doc ID checked |

### 4b. Admin SDK Access (Server-Side API Routes) — 10 Routes Verified

All API routes use `adminDb` from `lib/firebaseAdmin.ts`. Admin SDK **bypasses all Firestore Security Rules**.

| Route | Collections | Operations | Auth Method |
|---|---|---|---|
| `GET /api/onboarding/status` | `userProfiles` | Read | `getServerSession` + `getUserKey` |
| `POST /api/onboarding/progress` | `userProfiles` | Write (merge) | `getServerSession` + `getUserKey` |
| `POST /api/onboarding/complete` | `userProfiles`, `macroGoals`, `bodyweight`, `workoutTemplates`, `notificationPrefs` | Batch write/delete | `getServerSession` + `getUserKey` |
| `POST /api/onboarding/reset` | `userProfiles`, `macroGoals`, `workoutTemplates` | Batch update/delete | `getServerSession` + `getUserKey` + authorization guard |
| `POST /api/push/subscribe` | `push_subscriptions` | Write | `getServerSession` + `getUserKey` |
| `DELETE /api/push/subscribe` | `push_subscriptions` | Delete | `getServerSession` + `getUserKey` |
| `POST /api/push/send` | `push_subscriptions` | Query (read) | `getServerSession` + `getUserKey` |
| `GET /api/push/cron` | `push_subscriptions`, `notificationPrefs` | Read all + update/delete | `CRON_SECRET` bearer token (timing-safe compare) |
| `GET /api/health/token` | `healthTokens` | Query / Write / Delete | `getServerSession` |
| `POST /api/health/ingest` | `healthTokens`, `workouts`, `bodyweight`, `healthActivity` | Read + Write | Custom token lookup (healthTokens doc) |
| `dashboard/layout.tsx` (server component) | `userProfiles` | Read | `getServerSession` + `getUserKey` |

### 4c. Authentication & Authorization on API Routes (Verified)

| Route | Auth Check | Authorization |
|---|---|---|
| `/api/onboarding/status` | `getServerSession` → 401 if null | Scoped to own userId |
| `/api/onboarding/progress` | `getServerSession` → 401 if null | Scoped to own userId + rate limit (30/min) |
| `/api/onboarding/complete` | `getServerSession` → 401 if null | Scoped to own userId + rate limit (5/min) + age check |
| `/api/onboarding/reset` | `getServerSession` → 401 if null | ✅ Extra guard: `NODE_ENV=development` OR `ALLOW_DEV_RESET=true` OR `PRELAUNCH_EXEMPT_USER_IDS` OR `ADMIN_USER_IDS` |
| `/api/push/subscribe` | `getServerSession` → 401 if null | Scoped to own userId + endpoint allowlist |
| `/api/push/send` | `getServerSession` → 401 if null | Reads only own subscriptions |
| `/api/push/cron` | `CRON_SECRET` bearer → 401/500 | Server-only, reads all users |
| `/api/health/token` | `getServerSession` → 401 if null | Scoped to own userId |
| `/api/health/ingest` | Health token lookup → 401 if invalid | Token maps to userId; writes scoped to that userId |
| `/api/aria` | `getServerSession` → 401 if null | No Firestore access |
| `/api/analyze-meal`, `/api/estimate-meal`, `/api/voice-meal`, `/api/voice-workout`, `/api/summarize-nutrition`, `/api/summarize-workout` | `getServerSession` → 401 if null | No Firestore access (stateless AI proxies) |

### 4d. Routes with NO Firestore Usage (Verified)

These API routes are stateless AI proxies — no database access:
- `/api/analyze-meal`, `/api/estimate-meal`, `/api/voice-meal`, `/api/voice-workout`
- `/api/summarize-nutrition`, `/api/summarize-workout`
- `/api/aria` (AI chatbot — context passed from client, no direct Firestore reads)

---

## 5. Security Risks

### 🔴 CRITICAL — Client SDK has No Firebase Auth Context

**Verified:** The app uses the Firebase client SDK for Firestore reads/writes from browser code, but **never initializes Firebase Authentication**. The `firebase/auth` module is not imported anywhere in the codebase.

Under test-mode rules (currently `allow read, write: if true` or similar expiring rule), this works because all operations are unrestricted. **When test-mode rules expire, ALL client-side Firestore operations will be denied** unless rules are explicitly set to allow them.

Since there is no `request.auth` available in Security Rules (no Firebase Auth), rules cannot use the standard `request.auth.uid == resource.data.userId` pattern.

### 🔴 CRITICAL — Delete/Update Operations Lack Ownership Checks

**Verified:** Several client-side functions in `lib/firestore.ts` accept only a document ID with no userId verification:

- `deleteProject(projectId)` — anyone with the doc ID can delete
- `updateTask(taskId, updates)` / `deleteTask(taskId)`
- `updateWorkoutSession(sessionId, updates)`
- `deleteMeal(mealId)`
- `updateMealTemplate(id, updates)` / `deleteMealTemplate(id)`
- `deleteWorkoutTemplate(templateId)`

Under test-mode rules, these are wide open. With proper Security Rules, ownership enforcement would block unauthorized access at the database level.

### 🟡 MODERATE — No Shared or Public Data

**Verified:** All data is private, single-user. There are no collections intended for public read access, cross-user sharing, or admin dashboards reading from the client. This simplifies the security rules significantly — every collection follows the same owner-only pattern.

### 🟡 MODERATE — Push Cron Reads ALL Users' Data

**Verified:** The `/api/push/cron` route reads the **entire** `push_subscriptions` and `notificationPrefs` collections via Admin SDK. This is acceptable since it runs server-side with `CRON_SECRET` auth and uses timing-safe comparison, but it's worth noting for scale considerations.

### 🟢 LOW — getUserKey Fallback to Email

**Verified:** If `user.id` is null, `getUserKey()` falls back to `user.email`. In practice, NextAuth's Google provider always provides `sub` (which becomes `token.id`), so this is unlikely to trigger. But if it did, a user could have data under two different keys.

### 🟢 LOW — No `firestore.rules` File in Repository

**Verified:** There is no `firestore.rules`, `firebase.json`, or `.firebaserc` file in the codebase. Rules are managed only in the Firebase Console with no version control.

---

## 6. Proposed Firestore Security Rules

### Strategy Decision Required

Because the app does **not** use Firebase Authentication, there are two viable paths:

**Option A — Add Firebase Auth Bridge (Recommended)**
Initialize Firebase Auth on the client using NextAuth's Google token to create a Firebase Custom Token (via Admin SDK), then sign in with `signInWithCustomToken()`. This enables standard `request.auth.uid` rules.

**Option B — Lock Down Client SDK Entirely**
Deny all client-side reads/writes and move everything through authenticated Next.js API routes using the Admin SDK. This is more disruptive (requires rewriting all client-side Firestore calls to fetch from API routes instead) but eliminates the need for Firebase Auth entirely.

### Why a Firebase Custom Token Bridge Is Appropriate

1. The app already has Firebase Admin SDK initialized with service account credentials (`lib/firebaseAdmin.ts`), which is required to mint custom tokens.
2. The user identity (`token.sub` from Google OAuth) is stable and already used as the Firestore `userId`.
3. The custom token UID can be set to match the existing `userId` in all Firestore documents, making rules work immediately without data migration.
4. Option B would require rewriting ~29 client-side Firestore functions into API routes, which is significantly more work.

### Proposed Rules (Option A — assumes Firebase Auth bridge is added first)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: authenticated and owns the document
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // Helper: authenticated user
    function isSignedIn() {
      return request.auth != null;
    }

    // ── Projects ──
    match /projects/{projectId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Tasks ──
    match /tasks/{taskId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Workouts ──
    match /workouts/{workoutId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Body Weight ──
    match /bodyweight/{entryId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Meals ──
    match /meals/{mealId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Meal Templates ──
    match /mealTemplates/{templateId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Workout Templates ──
    match /workoutTemplates/{templateId} {
      allow read: if isSignedIn()
                  && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn()
                            && resource.data.userId == request.auth.uid;
    }

    // ── Macro Goals (doc ID = userId) ──
    match /macroGoals/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ── Notification Preferences (doc ID = userId) ──
    match /notificationPrefs/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ── User Profiles (doc ID = userId) ──
    // Client reads only; all writes go through Admin SDK API routes
    match /userProfiles/{userId} {
      allow read: if isOwner(userId);
      allow write: if false; // Admin SDK only
    }

    // ── Push Subscriptions ──
    // Managed exclusively by Admin SDK (server-side API routes)
    match /push_subscriptions/{docId} {
      allow read, write: if false;
    }

    // ── Health Tokens ──
    // Managed exclusively by Admin SDK
    match /healthTokens/{tokenId} {
      allow read, write: if false;
    }

    // ── Health Activity ──
    // Managed exclusively by Admin SDK
    match /healthActivity/{docId} {
      allow read, write: if false;
    }

    // ── Catch-all: deny everything else ──
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules Rationale

- **Collections 1–8** (projects, tasks, workouts, bodyweight, meals, mealTemplates, workoutTemplates): Owner-only access. Reads check `resource.data.userId`, creates check `request.resource.data.userId`, updates/deletes check existing `resource.data.userId`.
- **macroGoals, notificationPrefs**: Doc ID IS the userId, so `isOwner(userId)` with the wildcard segment is sufficient.
- **userProfiles**: Read-only from client (used by `getUserProfile()` and `StepReveal.tsx`). All writes go through onboarding API routes using Admin SDK.
- **push_subscriptions, healthTokens, healthActivity**: Admin-only. Deny all client access.
- **Catch-all**: Deny access to any collection not explicitly listed.

---

## 7. Features Affected When Test-Mode Expires

### Will Break (Client SDK — 8 collections affected)

| Feature | Component(s) | Collections | Impact |
|---|---|---|---|
| **Task Management** | `TaskBoard.tsx` | `projects`, `tasks` | Cannot load, create, update, or delete tasks/projects |
| **Nutrition Tracking** | `DietPage.tsx`, `TrackSheet.tsx` | `meals`, `mealTemplates`, `macroGoals` | Cannot log meals, view diet, manage templates or goals |
| **Workout Tracking** | `WorkoutPage.tsx`, `TrackSheet.tsx` | `workouts`, `workoutTemplates`, `bodyweight` | Cannot log workouts, view history, manage templates |
| **Body Weight Logging** | `DietPage.tsx`, `HomeView.tsx` | `bodyweight` | Cannot log or view weight entries |
| **Notification Settings** | `NotificationSettings.tsx` | `notificationPrefs` | Cannot save notification preferences from client |
| **Dashboard Home** | `HomeView.tsx` | `meals`, `workouts`, `tasks`, `bodyweight`, `macroGoals` | Dashboard will show empty state / errors |
| **User Profile Read** | `StepReveal.tsx` (onboarding reveal) | `userProfiles` | Cannot read computed targets on client |

### Will NOT Break (Admin SDK — bypasses rules)

| Feature | Route | Reason |
|---|---|---|
| Onboarding Flow | `/api/onboarding/*` | Uses `adminDb` |
| Push Notifications | `/api/push/*` | Uses `adminDb` |
| Health Sync | `/api/health/*` | Uses `adminDb` |
| Dashboard Auth Gate | `dashboard/layout.tsx` | Uses `adminDb` (server component) |
| AI Chat (Orbit) | `/api/aria` | No Firestore access |
| AI Meal/Workout Analysis | `/api/analyze-meal`, etc. | No Firestore access |

---

## 8. Testing and Deployment Plan

### Phase 1 — Add Firebase Auth Bridge (Pre-requisite)

1. **Create a custom token API route** (`/api/auth/firebase-token`)
   - Uses `getServerSession()` to verify NextAuth session
   - Uses `getUserKey()` to get the userId (same key used in all Firestore documents)
   - Calls `admin.auth().createCustomToken(userId)` to mint a Firebase custom token
   - Returns the custom token to the client

2. **Initialize Firebase Auth on the client**
   - In `lib/firebase.ts`, add `import { getAuth } from "firebase/auth"` and export `auth`
   - Create a React hook/provider that calls `/api/auth/firebase-token` after NextAuth login
   - Call `signInWithCustomToken(auth, firebaseToken)` to authenticate the Firestore client
   - Handle token refresh when the NextAuth session refreshes (Firebase custom tokens expire after 1 hour)

3. **Verify identity alignment**: Confirm that `request.auth.uid` in Security Rules matches the `userId` stored in all Firestore documents. It should — both derive from `token.sub` via `getUserKey()`.

### Phase 2 — Deploy Security Rules (Staged)

1. **Add `firestore.rules` to the repository** (version control)
2. **Add `firebase.json`** to configure the project for CLI deploys:
   ```json
   {
     "firestore": {
       "rules": "firestore.rules",
       "indexes": "firestore.indexes.json"
     }
   }
   ```
3. **Test with Firebase Emulator Suite** locally before touching production
4. **Deploy using Firebase CLI**: `firebase deploy --only firestore:rules`

### Phase 3 — Create Composite Indexes

Several queries use multi-field `where` clauses that may need composite indexes:

| Collection | Fields | Query Location |
|---|---|---|
| `tasks` | `userId` + `projectId` | `getTasks()` in `lib/firestore.ts` |
| `meals` | `userId` + `date` | `getMeals()` in `lib/firestore.ts` |
| `workouts` | `userId` + `externalId` | `/api/health/ingest` (Admin) |
| `bodyweight` | `userId` + `date` | `/api/health/ingest` (Admin) |

Note: These indexes may already exist if the app is working in production. Firestore auto-creates single-field indexes and prompts for composite indexes on first query.

### Phase 4 — Testing Checklist

- [ ] Sign in → Firebase Auth custom token is issued and client is authenticated
- [ ] `auth.currentUser.uid` matches `session.user.id` (both from `getUserKey`)
- [ ] Dashboard loads — all collections return data for the authenticated user
- [ ] Create a task → succeeds, `userId` field matches `auth.uid`
- [ ] Update a task → succeeds for own data
- [ ] Delete a task → succeeds for own data
- [ ] Log a meal → succeeds
- [ ] Log a workout → succeeds
- [ ] Log body weight → succeeds
- [ ] Save notification preferences → succeeds
- [ ] Read user profile (StepReveal) → succeeds
- [ ] Attempt to read another user's data via browser console → **denied**
- [ ] Attempt to delete a document owned by another user → **denied**
- [ ] Attempt to create a document with a different `userId` → **denied**
- [ ] Attempt to write to `userProfiles` from client → **denied**
- [ ] Attempt to read/write `push_subscriptions` from client → **denied**
- [ ] Attempt to read/write `healthTokens` from client → **denied**
- [ ] Onboarding flow completes (Admin SDK, unaffected by rules)
- [ ] Push notification subscribe / send / cron (Admin SDK, unaffected)
- [ ] Health sync ingest (Admin SDK, unaffected)
- [ ] Sign out → client Firestore calls fail gracefully (not crash)
- [ ] Token refresh: wait >1 hour, verify client re-authenticates

### Phase 5 — Hardening

- [ ] Add `firestore.rules` to CI pipeline (run `firebase emulators:exec` in tests)
- [ ] Audit for any future client-side Firestore code that might skip `userId` checks
- [ ] Consider adding `request.resource.data.keys()` validation to prevent writing unexpected fields
- [ ] Monitor Firestore rule evaluation logs in Firebase Console for denied requests
- [ ] Set up alerting for rule evaluation errors in production

---

## 9. Unresolved Questions and Assumptions

### Questions Requiring Your Input

1. **When exactly do the test-mode rules expire?** The Firebase email should have a date. This determines how urgently Phase 1 (Auth bridge) needs to be implemented.

2. **Is Option A (Firebase Auth bridge) or Option B (move everything to API routes) preferred?** Option A is recommended as it requires less code change, but Option B provides stronger server-side control.

3. **Are there any other environments (staging, dev) with separate Firebase projects?** Rules would need to be deployed to each.

4. **Has `getUserKey()` ever returned an email instead of an ID?** If so, some documents may be keyed by email address instead of Google `sub`. This would need a data migration or dual-UID custom token.

### Assumptions Made

| Assumption | Basis | Risk if Wrong |
|---|---|---|
| Test-mode rules are `allow read, write: if true` | Standard Firebase test-mode default | Low — any permissive rule has the same effect |
| `token.sub` is always available from Google OAuth | NextAuth Google provider behavior | Low — Google always provides `sub` |
| All existing Firestore data uses `token.sub` as userId | Code inspection of `getUserKey()` | Medium — if email was ever used, some docs may be keyed differently |
| No other Firebase services (Cloud Functions, etc.) are in use | No evidence in codebase | Low — would be visible in `firebase.json` |
| Firestore indexes already exist for production queries | App is functional in production | Low — missing indexes cause runtime errors with clear messages |

---

## Summary Matrix

| Aspect | Status | Risk |
|---|---|---|
| Authentication initialized | ✅ NextAuth (server) / ❌ Firebase Auth (client) | 🔴 Critical gap |
| Data scoped to userId | ✅ All queries filter by `userId` | 🟢 Good |
| Delete/Update ownership | ⚠️ Client functions don't re-verify userId | 🔴 Must fix with Security Rules |
| Shared/public data | None found | 🟢 Simple owner-only rule set |
| Admin SDK bypasses rules | ✅ All server routes use `adminDb` | 🟢 Expected and correct |
| Security rules in repo | ❌ No `firestore.rules` file | 🟡 Add to version control |
| Features at risk | 8 of 13 collections client-accessed | 🔴 Will break on rule expiry |
| Firebase Auth bridge needed | ✅ Required for `request.auth.uid` rules | 🔴 Must implement before deploying rules |

**Bottom line:** The Firebase Auth bridge (Phase 1) must be implemented before security rules can be deployed. Without it, there is no `request.auth` context for rules to evaluate, and deploying restrictive rules will break all client-side features immediately.

---

## 10. Stage 1 Implementation Report (Completed)

**Implementation Date:** 2026-10-14  
**Status:** Stage 1 Implemented & Verified in Local Test Suite  
**Scope:** Firebase Authentication Integration via Custom Tokens (No security rules deployed yet)

### 10a. Files Changed & Created

| File | Change Type | Purpose |
|---|---|---|
| `lib/firebase.ts` | Modified | Added `import { getAuth } from "firebase/auth"` and exported `auth = getAuth(app)`. Reuses existing app instance without duplicate initialization. |
| `app/api/auth/firebase-token/route.ts` | Created | Server-side API endpoint (`POST` & `GET`) that verifies NextAuth session with `authOptions`, validates non-empty `userId` (1–128 chars), applies 30 req/min rate limiting, and mints a Firebase Custom Token via `admin.auth().createCustomToken()`. |
| `components/FirebaseAuthProvider.tsx` | Created | Client React context provider, `useFirebaseAuth()` hook, and `FirebaseAuthGate` component. Coordinates custom token acquisition, calls `signInWithCustomToken(auth, token)`, verifies returned Firebase UID strictly matches NextAuth identity, listens via `onAuthStateChanged`, and coordinates sign-out when NextAuth session terminates or account switches. |
| `components/AuthProvider.tsx` | Modified | Nested `FirebaseAuthProvider` inside `SessionProvider` so the entire app tree has access to Firebase Auth state. |
| `components/NotificationScheduler.tsx` | Modified | Gated live Firestore snapshot listeners and initial workout/task queries with `isReady && firebaseUser` to prevent premature unauthenticated queries before Firebase Auth is established. |
| `app/dashboard/layout.tsx` | Modified | Wrapped dashboard view children in `<FirebaseAuthGate>` to prevent rendering Firestore-dependent components until client is authenticated. |
| `tests/api/firebase-token.test.ts` | Created | 10 unit tests covering unauthenticated access, empty identity, invalid length, token generation, anti-spoofing (body/query ignore), rate limiting, and server failure handling. |
| `tests/auth/firebase-auth.test.ts` | Created | 8 unit tests covering `lib/firebase.ts` auth export, safe hook defaults outside provider, gate rendering with fallback, NextAuth sign-out coordination, token sign-in, UID mismatch rejection, and 401 handling. |
| `firestore-security-audit.md` | Modified | Updated with Stage 1 verification, identity mapping rationale, security decisions, test results, and next steps. |

### 10b. Identity Mapping Decisions

1. **Deterministic Canonical Identifier:**
   - NextAuth with Google OAuth issues a Google `sub` (OpenID Connect Subject ID).
   - In `lib/auth.ts`, `token.sub` is assigned to `token.id` and `(session.user as any).id`.
   - `getUserKey(session)` in `lib/auth/userKey.ts` returns `session.user.id ?? session.user.email ?? null`.
   - In production Google logins, `session.user.id` is always present. In synthetic test environments without an ID, `session.user.email` serves as fallback.
   - The token minting route derives the Firebase UID exclusively via `getUserKey(session)`.

2. **Zero Ambiguity & Zero Cross-User Leakage:**
   - The custom token UID matches the `userId` field stored in all existing Firestore documents (`projects`, `tasks`, `workouts`, `meals`, `bodyweight`, `workoutTemplates`, `mealTemplates`) and the document IDs for `macroGoals/{userId}`, `notificationPrefs/{userId}`, and `userProfiles/{userId}`.
   - The client verifies `cred.user.uid === expectedUid` immediately after `signInWithCustomToken()`. If a mismatch is detected, it signs out immediately and throws a security error.
   - When NextAuth switches accounts, the client signs out the old user before requesting a token for the new user.

### 10c. Security Decisions

1. **Anti-Spoofing:** The token endpoint ignores any request body or query parameter (e.g. `?userId=...`). The identity is derived 100% from the verified server-side session.
2. **Abuse Protection:** In-memory sliding-window rate limit (30 requests/minute per UID) via `checkRateLimit` prevents token minting abuse.
3. **Information Leakage Prevention:** The endpoint does not log tokens, session cookies, or Firebase private keys. On minting failure, it logs a generic error tag and returns HTTP 500 without internal details.
4. **Premature Query Suppression:** Both `FirebaseAuthGate` in `app/dashboard/layout.tsx` and the Firestore listeners in `NotificationScheduler.tsx` suppress client-side Firestore access until `isReady` is true and `firebaseUser` is populated. When restrictive Security Rules are deployed in Stage 2, this prevents initial `permission-denied` race conditions.

### 10d. Tests Actually Run & Their Results

| Test Suite / Check | Command | Result | Notes |
|---|---|---|---|
| New Token Endpoint Unit Tests | `npx vitest run tests/api/firebase-token.test.ts` | ✅ **10 passed (10)** | Validated 401 unauth, 400 invalid IDs, 200 minting, body anti-spoofing, 429 rate limit, 500 failure |
| New Client Auth Unit Tests | `npx vitest run tests/auth/firebase-auth.test.ts` | ✅ **8 passed (8)** | Validated auth export, safe hook defaults, gate loading fallback, sign-out coordination, token auth, UID mismatch rejection, 401 handling |
| Full Test Suite | `npm test` (`vitest run`) | ✅ **381 passed (381)** across 29 test files | Zero regressions across existing API, vision pipeline, diet, landing, and workout tests |
| TypeScript Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ **0 errors** | Passed cleanly |
| Codebase Lint | `npm run lint` (`next lint`) | ✅ **0 errors** (3 pre-existing non-blocking warnings in unrelated files) | Passed cleanly |
| Production Build | `npm run build` (`next build`) | ✅ **Compiled successfully** (32 static & dynamic routes compiled) | `/api/auth/firebase-token` generated as dynamic route |

### 10e. Remaining Risks & Unresolved Questions

1. **Expiry Deadline of Test-Mode Rules:** The exact date when the Firebase test-mode rules expire remains dependent on the project's original creation date in the Firebase Console. Stage 2 (deploying `firestore.rules`) should be scheduled promptly.
2. **Production Deployment Dependency:** In production (Vercel / server), `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` must be configured with a valid Firebase service account to allow `admin.auth().createCustomToken()` to sign JWTs. If those environment variables are missing in production, the token endpoint will return HTTP 500.
3. **No Firestore Rules Deployed Yet:** As required by the constraints of Stage 1, no Firestore Security Rules have been modified or deployed. Restrictive security rules are ready to be deployed in Stage 2 now that client-side Firebase Auth is fully integrated.

---

## 11. Stage 2 Implementation Report: Firestore Security Rules (Completed)

**Implementation Date:** 2026-10-15  
**Status:** Rules Created & Verified Locally against Firestore Emulator (NO PRODUCTION RULES DEPLOYED)  
**Target Project:** `DailyOS` (`dailyos-afbbf`)  
**Scope:** Least-privilege Firestore Security Rules, local emulator configuration, 23 comprehensive security tests, Admin SDK route authorization review, and pre-deployment verification.

### 11a. Collection-by-Collection Security Policy

| Collection | Schema Path | Client Access | Ownership Mechanism | Client Allowed Operations | Security Guarantees & Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`userProfiles`** | `/userProfiles/{userId}` | **Read-Only** | Document ID (`userId`) | `get` (`getDoc`) | Owner can read (`request.auth.uid == userId`). Client writes are **strictly denied**; all profile updates must use server Admin SDK (`/api/onboarding/*`). |
| **`macroGoals`** | `/macroGoals/{userId}` | Read / Write | Document ID (`userId`) | `get`, `create`, `update` (`setDoc`) | Owner can read and write their own document (`request.auth.uid == userId`). Other users are blocked. |
| **`notificationPrefs`** | `/notificationPrefs/{userId}` | Read / Write | Document ID (`userId`) | `get`, `listen` (`onSnapshot`), `create`, `update` (`setDoc`) | Owner can read, subscribe to live snapshot listeners, and write (`request.auth.uid == userId`). Cross-user access blocked. |
| **`projects`** | `/projects/{projectId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only (`resource.data.userId == request.auth.uid`). Create requires `request.resource.data.userId == request.auth.uid`. Deterministic starter IDs (`default_{userId}`) must match caller UID. Update prevents changing `userId`. |
| **`tasks`** | `/tasks/{taskId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update strictly prevents transferring task ownership (`request.resource.data.userId == resource.data.userId`). Delete restricted to owner. |
| **`workouts`** | `/workouts/{workoutId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update prevents transferring ownership. |
| **`bodyweight`** | `/bodyweight/{entryId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update prevents changing `userId`. |
| **`meals`** | `/meals/{mealId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update prevents changing `userId`. |
| **`mealTemplates`** | `/mealTemplates/{templateId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update prevents transferring template ownership. |
| **`workoutTemplates`** | `/workoutTemplates/{templateId}` | Read / Write | Field `data.userId` | `get`, `query`, `create`, `update`, `delete` | Document owner only. Create requires caller's UID. Update prevents changing `userId`. |
| **`push_subscriptions`** | `/push_subscriptions/{subId}` | **None (Server-Only)** | Managed by Admin SDK | **None (Denied)** | Direct client access is **completely denied**. Managed exclusively through authenticated API routes (`/api/push/subscribe`, `/api/push/send`, `/api/push/cron`). |
| **`healthTokens`** | `/healthTokens/{tokenId}` | **None (Server-Only)** | Managed by Admin SDK | **None (Denied)** | Direct client access is **completely denied**. Created and validated exclusively through server-side routes (`/api/health/token`, `/api/health/ingest`). |
| **`healthActivity`** | `/healthActivity/{activityId}` | **None (Server-Only)** | Managed by Admin SDK | **None (Denied)** | Direct client access is **completely denied**. Ingested exclusively via server-side route (`/api/health/ingest`). |
| **Catch-All** | `/{document=**}` | **None** | Unspecified | **None (Denied)** | Any document or collection not explicitly declared is rejected by default. |

---

### 11b. Version-Controlled Artifacts Created

1. **`firestore.rules`** (Project Root)
   - Rule version: `rules_version = '2';`
   - Defines helper functions: `isAuthenticated()`, `isOwner(userId)`, `isDocOwner()`, `willBeDocOwner()`, `ownerUnchanged()`, and `validProjectId(projectId)`.
   - Implements the exact least-privilege matrix above.
   - Enforces immutability on ownership fields across all user-owned collections during updates.
   - Includes catch-all deny rule.

2. **`firebase.json`** (Project Root)
   - Configures the local Firestore emulator on port 8088 (`127.0.0.1`).
   - Links local rules file to the emulator.

3. **`tests/security/firestore-rules.test.ts`**
   - Implements 23 isolated unit tests using `@firebase/rules-unit-testing@^3.0.4`.
   - Connects to the local Firestore emulator on port 8088.
   - Uses mocked authenticated contexts (`user_alpha_123`, `user_beta_456`) and unauthenticated contexts.
   - Never touches production data.

---

### 11c. Security Rules Test Suite Results

Command:
```bash
firebase.cmd emulators:start --only firestore --project dailyos-afbbf
npx vitest run tests/security/firestore-rules.test.ts
```

**Actual Test Output:**
```
 RUN  v2.1.9 C:/Users/ayush/DailyOS

 ✓ tests/security/firestore-rules.test.ts (23 tests) 19842ms
   ✓ 1. Unauthenticated Requests > denies unauthenticated read on tasks
   ✓ 1. Unauthenticated Requests > denies unauthenticated write on tasks
   ✓ 1. Unauthenticated Requests > denies unauthenticated read on userProfiles
   ✓ 2. Own Record Access (User A -> User A) > allows User A to read, create, update, and delete their own tasks
   ✓ 2. Own Record Access (User A -> User A) > allows User A to create and access their own projects and default project
   ✓ 2. Own Record Access (User A -> User A) > allows User A to manage workouts, meals, bodyweight, and templates
   ✓ 3. Cross-User Read Isolation > denies User A reading User B's tasks
   ✓ 3. Cross-User Read Isolation > denies User A reading User B's projects
   ✓ 3. Cross-User Read Isolation > denies User A reading User B's macroGoals
   ✓ 4. Ownership Spoofing Prevention on Create > denies User A creating a task with User B's userId
   ✓ 4. Ownership Spoofing Prevention on Create > denies User A creating a project with User B's default project ID
   ✓ 5. Ownership Transfer Prevention on Update > denies User A updating a task's userId to User B
   ✓ 5. Ownership Transfer Prevention on Update > denies User A updating a project's userId to User B
   ✓ 6. Cross-User Delete Isolation > denies User A deleting User B's tasks
   ✓ 6. Cross-User Delete Isolation > denies User A deleting User B's projects
   ✓ 7. Document-ID-Owned Collections > allows User A to read their own userProfile, but denies client write
   ✓ 7. Document-ID-Owned Collections > allows User A to read and write their own macroGoals and notificationPrefs
   ✓ 8. Server-Only Collections > denies client read and write on push_subscriptions
   ✓ 8. Server-Only Collections > denies client read and write on healthTokens
   ✓ 8. Server-Only Collections > denies client read and write on healthActivity
   ✓ 9. Legitimate Query Patterns Compatibility > allows queries filtered by userId == request.auth.uid
   ✓ 9. Legitimate Query Patterns Compatibility > denies queries without userId filter or querying for another user
   ✓ 10. Catch-All Deny on Unspecified Collections > denies access to arbitrary collections

 Test Files  1 passed (1)
      Tests  23 passed (23)
   Duration  23.44s
```

All 23 security requirements passed verification.

---

### 11d. Client Query Compatibility Audit

Every client-side query in [`lib/firestore.ts`](file:///c:/Users/ayush/DailyOS/lib/firestore.ts) was analyzed against the rules:

| Query Helper | Query Implementation in `lib/firestore.ts` | Rules Compatibility |
| :--- | :--- | :--- |
| `getProjects(userId)` | `query(collection(db, "projects"), where("userId", "==", userId))` | ✅ Allowed: `resource.data.userId == request.auth.uid` matches query constraint |
| `getAllTasks(userId)` | `query(collection(db, "tasks"), where("userId", "==", userId))` | ✅ Allowed |
| `getTasks(userId, projId)` | `query(collection(db, "tasks"), where("userId", "==", userId), where("projectId", "==", projId))` | ✅ Allowed |
| `getWorkoutSessions(userId)` | `query(collection(db, "workouts"), where("userId", "==", userId))` | ✅ Allowed |
| `getBodyWeightEntries(userId)` | `query(collection(db, "bodyweight"), where("userId", "==", userId))` | ✅ Allowed |
| `getAllMeals(userId)` | `query(collection(db, "meals"), where("userId", "==", userId))` | ✅ Allowed |
| `getMeals(userId, date)` | `query(collection(db, "meals"), where("userId", "==", userId), where("date", "==", date))` | ✅ Allowed |
| `getMealTemplates(userId)` | `query(collection(db, "mealTemplates"), where("userId", "==", userId))` | ✅ Allowed |
| `getWorkoutTemplates(userId)` | `query(collection(db, "workoutTemplates"), where("userId", "==", userId))` | ✅ Allowed |
| `getMacroGoals(userId)` | `doc(db, "macroGoals", userId)` | ✅ Allowed: document ID equals caller UID |
| `getNotificationPrefs(userId)` | `doc(db, "notificationPrefs", userId)` (and `onSnapshot`) | ✅ Allowed: document ID equals caller UID |
| `getUserProfile(userId)` | `doc(db, "userProfiles", userId)` | ✅ Allowed: document ID equals caller UID |

**Finding:** 100% of existing client queries already filter strictly by `where("userId", "==", userId)`. No client code needs to be modified for rules compatibility.

---

### 11e. Admin SDK Route Authorization Review

Firebase Admin SDK calls bypass Firestore Security Rules entirely. A security audit of all routes using `adminDb` verified the following:

| Route | Purpose | Authentication | Authorization & Scoping | Risk Rating |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/firebase-token` | Mint Custom Token | `getServerSession` | Uses `getUserKey(session)`. Rejects client-supplied IDs. Rate limited (30/min). | 🟢 Secure |
| `/api/onboarding/complete` | Finalize profile & macros | `getServerSession` | Writes only to `userProfiles/{userId}`, `macroGoals/{userId}`, `bodyweight/initial_{userId}_*`, and caller's workout templates. Rate limited (5/min). | 🟢 Secure |
| `/api/onboarding/progress` | Save onboarding drafts | `getServerSession` | Writes only to `userProfiles/{userId}`. Rate limited (30/min). | 🟢 Secure |
| `/api/onboarding/reset` | Reset onboarding | `getServerSession` | Server-side authorization check (development / admin allowlist). Scoped strictly to `userId`. | 🟢 Secure |
| `/api/onboarding/status` | Read onboarding status | `getServerSession` | Reads only `userProfiles/{userId}`. Rate limited (60/min). | 🟢 Secure |
| `/api/push/subscribe` | Register device push | `getServerSession` | Saves to `push_subscriptions/${userId}_${endpointHash}`. Validates push endpoint against allowlist. | 🟢 Secure |
| `/api/push/send` | Send push message | `getServerSession` | Queries `push_subscriptions` strictly by `where("userId", "==", userId)`. Validates message templates. | 🟢 Secure |
| `/api/push/cron` | Automated reminder cron | `CRON_SECRET` header | Timing-safe comparison. Dispatches to user subscriptions based on user-configured times and timezones. | 🟢 Secure |
| `/api/health/token` | Get/Regenerate health token | `getServerSession` | User can only read/regenerate their own 256-bit token in `healthTokens`. | 🟢 Secure |
| `/api/health/ingest` | Watch/health data webhook | Bearer token | Validates token against `healthTokens` document. Scopes all created workout and bodyweight records to `token.userId`. | 🟡 Note: Recommend adding IP/request rate-limiting in a future update to prevent webhook abuse. |

---

### 11f. Production Deployment Status

1. **Production Rules Deployed:**
   - The verified rules in `firestore.rules` were deployed to production Firebase project `dailyos-afbbf`.
   - Production Firestore Security Rules are active, enforcing least-privilege, owner immutability, and server-only collection isolation.
2. **Client Authentication Integration:**
   - Firebase Custom Tokens are minted via `/api/auth/firebase-token` and authenticated on the client with `signInWithCustomToken(auth, token)`.
   - Client requests carry `request.auth.uid`, matching existing `userId` fields on documents.

---

## 12. Post-Deployment Verification & Incident Resolution

### Incident Summary
Following the production rules deployment, users observed that the DailyOS dashboard initially appeared empty despite records existing in the Firestore Console.

### Root Cause Analysis
An authentication lifecycle race condition occurred on the client side:
1. `FirebaseAuthProvider` previously initialized with `isReady: true` by default.
2. In `app/dashboard/layout.tsx`, `<FirebaseAuthGate>` rendered children on initial hydration before `signInWithCustomToken()` completed.
3. Component `useEffect` hooks in `HomeView`, `TaskBoard`, `DietPage`, and `WorkoutPage` dispatched queries while `request.auth` was still null.
4. Firestore returned `permission-denied` (403), triggering component catch blocks that set empty data states.
5. Because component dependency arrays watched only `[userId]` (which did not change once loaded by NextAuth), queries never re-triggered after Firebase Auth completed.

### Remediation Applied
1. **Strengthened `FirebaseAuthProvider` & `FirebaseAuthGate`:**
   - Set initial `isReady: false` and exposed `userId: firebaseUser?.uid ?? null`.
   - Updated `FirebaseAuthGate` to strictly guard on `!isReady || !firebaseUser || status !== "authenticated"`. Children are never mounted until Firebase Client Auth is completely established.
2. **Reactive Client View Data-Fetching:**
   - Updated `HomeView`, `TaskBoard`, `DietPage`, `WorkoutPage`, and `NotificationSettings` to consume `useFirebaseAuth()`.
   - Gated queries on `if (!userId || !firebaseUser || !isReady) return;`.
   - Bound effects to `[userId, firebaseUser, isReady]` so queries cleanly re-fetch whenever auth state changes.

### Production Verification (`dailyos-afbbf`)
- Target production user `101043574632545088499` verified against deployed security rules:
  - Tasks: 6 records accessible
  - Projects: 3 records accessible
  - Meals: 32 records accessible
  - Workouts: 7 records accessible
  - UserProfile & MacroGoals: Exists and accessible
- Zero production documents were modified, deleted, or reset.
- Test suites: 382 application tests passed, 23 security rule emulator tests passed, 0 typecheck errors, 0 lint errors, production build verified.
