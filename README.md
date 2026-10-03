# DailyOS

Your personal operating system — tasks, gym tracking, and nutrition in one clean app.

## Tech Stack
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — clean & minimal design
- **Firebase Firestore** — real-time data storage
- **NextAuth.js** — Google OAuth authentication
- **OpenAI GPT-4o** — workout summaries & meal photo scanning

---

## Quick Start

### 1. Install dependencies
```bash
cd dailyos-app
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Then fill in your values in `.env.local`:

| Variable | Where to get it |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in terminal |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev; your domain for prod |
| `NEXT_PUBLIC_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps → Web |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) |

### 3. Set up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable **Firestore Database** (start in production or test mode)
3. Enable **Storage** (for meal photos)
4. Add these Firestore collections (they're created automatically on first write):
   - `projects`, `tasks`, `workouts`, `bodyweight`, `meals`, `macroGoals`

### 4. Set up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. For production, add your domain's callback URL too

### 5. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Features

### ✅ Task Management
- Create projects with custom colors
- Add daily and weekly to-dos per project
- Mark tasks complete with a single tap
- Clean project switcher with color coding

### 💪 Workout Tracking
- Log exercises with sets, reps, and weight (kg / lbs / bodyweight)
- Log body weight daily with history
- Set workout duration
- **AI Summary** — tap "AI Summary" after logging to get a personalized GPT-powered report covering intensity, strengths, and improvement areas
- Full workout history with expandable sessions

### 🥗 Diet & Nutrition
- Set daily macro goals (calories, protein, carbs, fat)
- Log meals with full macro breakdown
- Visual macro progress bars per day
- Date navigation to view past days
- **📷 Meal Scanner** — take a photo of your meal and GPT-4o estimates the macros automatically (review and edit before logging)

---

## Adding to iPhone (PWA)
1. Open the app in Safari on your iPhone
2. Tap the Share button → "Add to Home Screen"
3. DailyOS will behave like a native app with full-screen mode

---

## Deployment (Vercel)
```bash
npm run build
vercel --prod
```
Set all environment variables in Vercel dashboard → Settings → Environment Variables.
Make sure to update `NEXTAUTH_URL` to your production domain.

---

## Firestore Security Rules (recommended)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.userId;
    }
  }
}
```

---

## Scheduled Reminders Setup (External Cron)

The reminders route (`/api/push/cron`) evaluates user notification preferences (meals, workouts, and tasks) and sends web push notifications when the current minute matches a user's scheduled reminder time.

Because Vercel's Hobby plan limits Vercel Cron jobs to at most **once per day**, minute-by-minute execution requires an external cron scheduler (such as [cron-job.org](https://cron-job.org), Upstash QStash, or EasyCron).

### Setup with cron-job.org (Free):
1. Sign up for a free account at [cron-job.org](https://cron-job.org).
2. Create a new Cronjob:
   - **Title:** `DailyOS Push Reminders`
   - **URL:** `https://<your-vercel-domain>/api/push/cron`
   - **Execution Schedule:** Every minute (`* * * * *`)
   - **Request Method:** `GET`
   - **Headers:** Add authorization header:
     - Header Key: `Authorization`
     - Header Value: `Bearer <YOUR_CRON_SECRET>`
3. In your Vercel Project Settings (`Settings -> Environment Variables`), ensure `CRON_SECRET` matches `<YOUR_CRON_SECRET>`.
4. Enable the cron job. Requests without this header return `401 Unauthorized`.

