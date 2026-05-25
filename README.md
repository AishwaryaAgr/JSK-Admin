# JSK Admin

Member directory and payments admin for JSK.

## Authentication (local)

Add these variables to `.env.local`:

```
AUTH_SECRET=your-long-random-secret-string
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password
```

Sign in at `/login` with the configured username and password. Sessions last 7 days (httpOnly cookie).

## Tech Stack

* **Framework:** Next.js (App Router)
* **Styling:** CSS Modules with CSS Variables (Dark/Light mode support)
* **Icons:** Lucide React
* **Database:** Firebase (Firestore + Storage)
* **Hosting:** Firebase App Hosting (Cloud Run)

## Getting Started (local)

1. Set up your Firebase project at [Firebase.com](https://firebase.google.com/).
2. Create a **Firestore Database** and a **Storage Bucket**.
3. Register a web app in your Firebase project settings to get your configuration keys.
4. Create `.env.local` with your Firebase keys, `GOOGLE_MAPS_API_KEY`, and the authentication variables above.
5. Run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Deploy to Firebase App Hosting (GitHub auto-deploy)

This app uses **SSR, middleware, and API routes** — deploy with [Firebase App Hosting](https://firebase.google.com/docs/app-hosting), not static Hosting alone.

### Prerequisites

1. Firebase project **jsk-db** on the **Blaze** plan.
2. This repository pushed to **GitHub** (branch `main` for rollouts).
3. [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools` and `firebase login`.

### 1. Connect GitHub in Firebase Console

1. [Firebase Console](https://console.firebase.google.com/) → project **jsk-db**.
2. **Build** → **App Hosting** → **Create backend** (or use existing).
3. **Backend ID:** `jsk-admin` (must match [firebase.json](firebase.json)).
4. **Connect GitHub** → select this repo and branch **`main`**.
5. **App root directory:** `.` (repository root — where `package.json` lives).
6. Enable **automatic rollouts** on push to `main`.

The Console app root and `firebase.json` → `apphosting[].rootDir` must both be `.` or GitHub builds fail with “No buildpack groups passed detection.”

### 2. Production secrets (Secret Manager)

Do **not** commit real secrets. Use new production values for `AUTH_SECRET` and `ADMIN_PASSWORD` (rotate away from any dev credentials shared in chat).

Create each secret (CLI prompts for the value):

```bash
firebase apphosting:secrets:set AUTH_SECRET
firebase apphosting:secrets:set ADMIN_USERNAME
firebase apphosting:secrets:set ADMIN_PASSWORD
firebase apphosting:secrets:set GOOGLE_MAPS_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
```

Grant the App Hosting backend access (repeat per secret, or use the Console **Secrets** UI):

```bash
for s in AUTH_SECRET ADMIN_USERNAME ADMIN_PASSWORD GOOGLE_MAPS_API_KEY \
  NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID NEXT_PUBLIC_FIREBASE_APP_ID; do
  firebase apphosting:secrets:grantaccess "$s" --backend jsk-admin
done
```

Alternatively, paste `NEXT_PUBLIC_*` and admin vars in **App Hosting → Environment variables** in the Console (quicker for first deploy). [apphosting.yaml](apphosting.yaml) references the same names when using secrets.

### 3. Push to deploy

Commit and push to `main`. App Hosting builds with `output: "standalone"` ([next.config.ts](next.config.ts)) and deploys to Cloud Run.

Optional manual rollout from your machine:

```bash
firebase deploy --only apphosting:jsk-admin
```

### 4. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

Current [firestore.rules](firestore.rules) allow broad read/write for prototyping. Tighten rules before sharing the production URL widely (app auth is cookie-based today, not Firebase Auth).

### 5. Post-deploy checks

- Open the App Hosting URL → should redirect to `/login`.
- Sign in with production admin credentials.
- Test Directory, Add Member, Payments, bulk upload, and map search.
- Restrict **Google Maps API key** to your hosting domain in Google Cloud Console.

### Custom domain

After the first deploy: App Hosting → **Domains** → add your domain and follow DNS instructions.
