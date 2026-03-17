# Firebase Setup Guide for Cloud Save

This guide walks through every step of creating, configuring, and securing a Firebase project for the Backpack Planner Cloud Save feature. Follow it exactly and in order.

## Table of Contents

1. [Overview: What You're Setting Up](#1-overview)
2. [Create the Firebase Project](#2-create-the-firebase-project)
3. [Enable Authentication (Google Sign-In)](#3-enable-authentication)
4. [Create the Firestore Database](#4-create-the-firestore-database)
5. [Deploy Security Rules](#5-deploy-security-rules)
6. [Configure Authorized Domains](#6-configure-authorized-domains)
7. [Get the Firebase Config and Add It to the App](#7-get-the-firebase-config)
8. [Test Project vs Production Project](#8-test-project-vs-production-project)
9. [Manual Smoke Test Checklist](#9-manual-smoke-test-checklist)
10. [Firebase Console Monitoring](#10-firebase-console-monitoring)
11. [Cost and Quota Safety](#11-cost-and-quota-safety)
12. [Security Checklist](#12-security-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

The Cloud Save feature uses three Firebase services:

| Service | Purpose |
|---------|---------|
| **Firebase Auth** | Google Sign-In identity. Gives each user a stable `uid`. |
| **Cloud Firestore** | Stores one document per user at `sync/{uid}` containing their build presets. |
| **Firebase Hosting** *(optional)* | Not used — the app is hosted on GitHub Pages. Firebase config is client-side only. |

No Firebase Functions, no Cloud Storage, no Realtime Database, no Analytics, no Crashlytics. Only Auth and Firestore.

### What is safe to expose publicly

The Firebase config object (`apiKey`, `authDomain`, `projectId`, etc.) is **public by design**. It is not a secret. Firebase security comes from:

- **Firestore Security Rules** — server-enforced, cannot be bypassed by client code
- **Auth provider restrictions** — only Google Sign-In is enabled
- **Authorized domains** — Firebase Auth only works from domains you whitelist

References:
- https://firebase.google.com/docs/projects/api-keys — "API keys for Firebase are different from typical API keys... not used to control access to backend resources"
- https://firebase.google.com/support/guides/security-checklist — Firebase security checklist

---

## 2. Create the Firebase Project

### Option A: Use the recommended test project workflow

**Create two projects**: one for testing, one for production. This is the recommended approach.

- **Test project**: `rg-backpack-planner-dev` — for development and testing
- **Production project**: `rg-backpack-planner` — for the live app

You can start with just the test project and create the production project later when you're ready to ship.

### Option B: Single project

If you want to keep things simple, one project is fine. You can always add a second later.

### Steps

1. Go to https://console.firebase.google.com/
2. Click **Add project**
3. Enter the project name (e.g., `rg-backpack-planner-dev`)
4. **Google Analytics**: Toggle it **OFF** — not needed for this feature. It adds complexity and collects user data unnecessarily.
5. Click **Create project**
6. Wait for project creation to complete, then click **Continue**

### Register a Web App

1. On the project overview page, click the **Web** icon (`</>`) to add a web app
2. Enter an app nickname: `Backpack Planner` (or `Backpack Planner Dev` for the test project)
3. **Do NOT** check "Also set up Firebase Hosting" — the app is hosted on GitHub Pages
4. Click **Register app**
5. You'll see the Firebase config object — **copy it and save it somewhere**. You'll need it in Step 7. It looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "rg-backpack-planner-dev.firebaseapp.com",
  projectId: "rg-backpack-planner-dev",
  storageBucket: "rg-backpack-planner-dev.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

6. Click **Continue to console**

---

## 3. Enable Authentication

### Enable the Google Sign-In provider

1. In the Firebase Console, go to **Build → Authentication** (left sidebar)
2. Click **Get started** if this is your first time
3. Go to the **Sign-in method** tab
4. Click **Google** in the provider list
5. Toggle the **Enable** switch ON
6. Set the **Project support email** — choose your Google account email
7. Click **Save**

### Verify no other providers are enabled

On the Sign-in method tab, confirm that **only Google** is enabled. All other providers (Email/Password, Phone, Anonymous, etc.) should show as **Disabled**.

The app code only supports Google Sign-In. Enabling other providers creates unnecessary attack surface.

### Configure the OAuth consent screen (if prompted)

Firebase may take you to the Google Cloud Console to configure the OAuth consent screen. If so:

1. **User Type**: Select **External** (allows any Google account to sign in)
2. **App name**: `Backpack Planner`
3. **User support email**: Your email
4. **Developer contact email**: Your email
5. **Scopes**: Leave defaults (email, profile, openid) — do NOT add any extra scopes
6. **Test users**: Skip this for now — you don't need to restrict to test users
7. Click **Save and Continue** through each step
8. On the summary page, click **Back to Dashboard**

**Publishing status**: The consent screen will start in **Testing** mode. This means only test users you add can sign in. To allow anyone to sign in:

1. Go to Google Cloud Console → **APIs & Services → OAuth consent screen**
2. Click **Publish App**
3. Confirm

Note: For the test/dev project, you can leave it in Testing mode and just add your own Google account as a test user. For the production project, you'll want to publish it.

---

## 4. Create the Firestore Database

1. In the Firebase Console, go to **Build → Firestore Database** (left sidebar)
2. Click **Create database**
3. **Database ID**: Leave as `(default)` — the app code uses the default database
4. **Location**: Choose the region closest to your primary users. Recommendations:
   - If users are mostly in Japan/Asia: `asia-northeast1` (Tokyo)
   - If users are global: `us-central1` (Iowa) or `nam5` (United States)
   - If users are in Europe: `eur3` (Europe)

   **This cannot be changed later.** Pick carefully.

5. **Security rules**: Select **Start in production mode** (locked down by default). You'll deploy the real rules in the next step.
6. Click **Create**

### Verify the database is empty

After creation, the Firestore data browser should show an empty database with no collections. This is correct — the app creates the `sync` collection automatically when the first user signs in.

---

## 5. Deploy Security Rules

The app repository includes a `firestore.rules` file. These rules ensure:

- Each user can only read/write their own `sync/{uid}` document
- Documents are size-limited to 50KB (prevents abuse)
- Everything else is denied

### Option A: Deploy via Firebase CLI (recommended)

1. Install the Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in:
   ```bash
   firebase login
   ```

3. From the project root, initialize Firebase (if no `firebase.json` exists):
   ```bash
   firebase init firestore
   ```
   - Select your project
   - When asked for the rules file, enter `firestore.rules`
   - When asked for the indexes file, accept the default or press Enter

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. Verify in the Firebase Console: go to **Firestore Database → Rules** tab. You should see:

   ```
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       match /sync/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
         allow write: if request.auth != null && request.auth.uid == userId
                         && request.resource.size < 50000;
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

### Option B: Copy-paste via the Console

1. Go to **Firestore Database → Rules** tab
2. Delete the existing content
3. Paste the contents of `firestore.rules` from the repository
4. Click **Publish**

### Verify the rules

After deploying, the Rules tab should show the rules above with a green "Rules are live" indicator and no warnings.

---

## 6. Configure Authorized Domains

Firebase Auth will only allow sign-in from domains you authorize. This prevents someone from using your Firebase config on a phishing site.

### Add your domains

1. Go to **Authentication → Settings** tab
2. Find **Authorized domains**
3. The following should already be present:
   - `localhost`
   - `your-project-id.firebaseapp.com`
4. **Add** each domain where the app is hosted:
   - `shilocity.github.io` (or whatever your GitHub Pages domain is)
   - If you use a custom domain, add that too

### What this does

If someone copies your Firebase config and puts it on `evil-site.com`, Firebase Auth will reject the sign-in attempt because `evil-site.com` is not in your authorized domains list. This is a critical security layer.

### For the dev project

Add `localhost` (already there) — this is sufficient for local testing with `npm run dev`.

---

## 7. Get the Firebase Config

### Copy the config values

1. Go to **Project Settings** (gear icon in the top-left of the Firebase Console → Project settings)
2. Scroll down to **Your apps** section
3. Under the web app you registered, find the `firebaseConfig` object
4. Copy the values

### Update the app code

Open `src/lib/cloudSync/config.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
    apiKey: "AIzaSy...",                              // Your actual API key
    authDomain: "your-project.firebaseapp.com",       // Your actual authDomain
    projectId: "your-project-id",                     // Your actual project ID
    storageBucket: "your-project.firebasestorage.app", // Your actual storage bucket
    messagingSenderId: "123456789",                    // Your actual sender ID
    appId: "1:123456789:web:abcdef123456",            // Your actual app ID
};
```

### Environment-specific configs

If you have both a test and production project, you can switch configs based on environment:

```typescript
const firebaseConfig = import.meta.env.PROD
    ? {
        // Production config
        apiKey: "...",
        authDomain: "rg-backpack-planner.firebaseapp.com",
        projectId: "rg-backpack-planner",
        storageBucket: "rg-backpack-planner.firebasestorage.app",
        messagingSenderId: "...",
        appId: "...",
    }
    : {
        // Development config
        apiKey: "...",
        authDomain: "rg-backpack-planner-dev.firebaseapp.com",
        projectId: "rg-backpack-planner-dev",
        storageBucket: "rg-backpack-planner-dev.firebasestorage.app",
        messagingSenderId: "...",
        appId: "...",
    };
```

This way `npm run dev` uses the test project and `npm run build` uses production.

---

## 8. Test Project vs Production Project

### Should you use a test project?

**Yes, recommended.** Here's why:

| Concern | Single project | Two projects |
|---------|---------------|--------------|
| Accidentally corrupt real user data during dev | Possible | Impossible — separate databases |
| Test Firestore rules changes safely | Risky — mistakes affect live users | Safe — test project is isolated |
| Cost isolation | Dev traffic mixed with production | Dev traffic stays in dev |
| OAuth consent screen | Must be published for anyone to sign in | Dev can stay in Testing mode |
| Cleanup after testing | Must manually delete test documents | Delete the whole test project when done |

### Recommended workflow

1. **Create `rg-backpack-planner-dev`** — do all development and testing here
2. Complete the smoke test checklist (Step 9) against the dev project
3. **Create `rg-backpack-planner`** (production) — repeat Steps 2-6 for the production project
4. Update `config.ts` to use the production config (or the env-based switch from Step 7)
5. Deploy and test once more against production

### What's different between the two projects

Nothing in terms of setup — you follow the exact same Steps 2-6 for both. The only difference is which config values are in `config.ts`.

---

## 9. Manual Smoke Test Checklist

Run through these tests after setting up Firebase. Use `npm run dev` with the dev project config.

### Pre-test

- [ ] Firebase config values are filled in `src/lib/cloudSync/config.ts`
- [ ] `CLOUD_SAVE_ENABLED` is `true` in `src/config/cloudSave.ts`
- [ ] App loads at `http://localhost:5173/` without console errors

### Sign-In

- [ ] Open Settings → Cloud Save button is visible in the Application section
- [ ] Tap Cloud Save → Google Sign-In popup appears (or redirect on mobile)
- [ ] After signing in, the button shows a green cloud check icon
- [ ] Console has no auth errors

### First Sync (Upload)

- [ ] After sign-in, check the Firestore Console → `sync` collection exists
- [ ] A document with your Firebase UID exists
- [ ] The document contains `presets` (map), `order` (array), `revision` (number), `updatedAt` (timestamp)
- [ ] The preset data matches your local presets

### Cross-Device Sync

- [ ] Open the app in a second browser (or incognito window)
- [ ] Sign in with the same Google account
- [ ] Both browsers show the same presets
- [ ] Edit a preset name in Browser A → it appears in Browser B within a few seconds
- [ ] Add a new preset in Browser B → it appears in Browser A
- [ ] Delete a preset in Browser A → it disappears from Browser B

### Cloud Save Menu

- [ ] After signing in, tap the Cloud Save button again → context menu appears
- [ ] Menu shows your Google profile picture, name, and email
- [ ] Menu shows last synced time, build count, and revision number
- [ ] "Sync Now" button works (revision number increments if data changed)
- [ ] "Sign Out" button works → cloud icon returns to default, menu no longer shows profile

### Delete Cloud Data

- [ ] Sign in again after signing out
- [ ] Open Cloud Save menu → tap "Delete Cloud Data"
- [ ] Confirm the modal
- [ ] Check Firestore Console → the `sync/{uid}` document is deleted
- [ ] User is signed out
- [ ] Local presets are still present (not deleted)

### Clear All Data

- [ ] Sign in with Cloud Save
- [ ] Go to Settings → Storage → Clear All Data
- [ ] Confirm the modal
- [ ] Page reloads, app is in fresh state
- [ ] User is signed out from Cloud Save
- [ ] Check Firestore Console → the `sync/{uid}` document still exists (Clear All only signs out, it doesn't delete cloud data)

### Error Handling

- [ ] Disable your network (airplane mode or DevTools → Offline)
- [ ] Try to sign in → should show an error toast, not crash
- [ ] Re-enable network → sign in works

### Kill Switch

- [ ] Set `CLOUD_SAVE_ENABLED = false` in `src/config/cloudSave.ts`
- [ ] Restart dev server
- [ ] Verify: Cloud Save button is NOT visible in Settings
- [ ] Verify: No Firebase-related network requests in DevTools Network tab
- [ ] Verify: MenuToggleButton shows only the list icon, no cloud icons
- [ ] Set it back to `true` when done

---

## 10. Firebase Console Monitoring

### Usage tab

Go to **Firestore Database → Usage** tab to monitor:

- Document reads per day
- Document writes per day
- Document deletes per day
- Storage used

For a small user base, all of these should be near zero relative to the free tier limits.

### Auth users

Go to **Authentication → Users** tab to see:

- All signed-in users
- Their Firebase UID, email, creation date, last sign-in
- You can disable or delete individual users here if needed

### Firestore data browser

Go to **Firestore Database → Data** tab to:

- Browse all `sync/{uid}` documents
- Inspect individual user data
- Manually delete test data

---

## 11. Cost and Quota Safety

### Free tier limits (Spark plan)

Firebase's free tier (Spark plan) includes:

| Resource | Free quota |
|----------|-----------|
| Auth (Google Sign-In) | 50,000 MAU |
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Firestore deletes | 20,000/day |
| Firestore storage | 1 GiB |
| Firestore network egress | 10 GiB/month |

For Backpack Planner's expected usage (per the research doc: ~10 MAU, ~700 reads/month, ~500 writes/month), the free tier is more than sufficient. You would need thousands of active users before approaching any limit.

### Prevent surprise bills

The Spark plan (free) has **no billing**. You cannot be charged. If you exceed the free quotas, the service stops working — it does not start billing.

If you later upgrade to the Blaze (pay-as-you-go) plan for other Firebase features:

1. Go to Google Cloud Console → **Billing → Budgets & Alerts**
2. Create a budget alert at $1, $5, and $10
3. This sends you an email if spending approaches those thresholds

**Recommendation**: Stay on the Spark (free) plan unless you have a specific reason to upgrade. Cloud Save works entirely within the free tier.

### The 50KB document size rule

The Firestore security rules enforce `request.resource.size < 50000` (50KB). This prevents any single user from storing an excessively large document. A typical user with 10 presets uses about 1-2KB.

---

## 12. Security Checklist

Run through this checklist to confirm your Firebase project is properly secured.

### Authentication

- [ ] **Only Google Sign-In is enabled** — no Email/Password, Phone, Anonymous, or other providers
- [ ] **Authorized domains are configured** — only `localhost`, your `*.firebaseapp.com`, and your GitHub Pages domain
- [ ] **OAuth consent screen scopes** — only `email`, `profile`, `openid` (no extra scopes like Drive, Calendar, etc.)

### Firestore

- [ ] **Security rules are deployed** — the Rules tab shows the rules from `firestore.rules`
- [ ] **No open rules** — there is no `allow read, write: if true` anywhere in the rules
- [ ] **User isolation** — each user can only access `sync/{theirOwnUid}`
- [ ] **Size limit** — writes are rejected if the document exceeds 50KB
- [ ] **Catch-all deny** — `match /{document=**} { allow read, write: if false; }` is present

### Firebase Config

- [ ] **No secrets in the config** — `apiKey`, `authDomain`, etc. are public identifiers, not secrets
- [ ] **No server-side keys committed** — there should be no service account JSON files, no admin SDK keys, no `.env` files with Firebase secrets. The app is client-only.

### Google Cloud Console

- [ ] **No unnecessary APIs enabled** — go to Google Cloud Console → **APIs & Services → Enabled APIs**. Only these should be enabled:
  - Cloud Firestore API
  - Identity Toolkit API (Firebase Auth)
  - Token Service API
  - Firebase Rules API (if you deployed rules via CLI)
- [ ] **No service accounts with broad permissions** — go to **IAM & Admin → Service Accounts**. The default Firebase service accounts are fine. Do not create additional service accounts unless needed.

### Firebase Project Settings

- [ ] **Google Analytics is OFF** — unless you specifically want it. It adds tracking.
- [ ] **No Firebase Extensions installed** — unless you specifically added one.

---

## 13. Troubleshooting

### "auth/unauthorized-domain" error

**Cause**: The domain you're running the app on is not in the Authorized Domains list.

**Fix**: Go to Authentication → Settings → Authorized domains → Add your domain.

### "auth/popup-blocked" then redirect doesn't complete

**Cause**: The popup was blocked and the redirect flow navigated away, but on return the redirect result wasn't picked up.

**Fix**: The app calls `handleRedirectResult()` on boot via `initCloudSync()`. Verify that `CLOUD_SAVE_ENABLED` is `true` and `initCloudSync` is called in `App.svelte`'s `onMount`.

### "permission-denied" on Firestore writes

**Cause**: Security rules are rejecting the write. Possible reasons:
- Rules not deployed yet (still using default deny-all)
- Document exceeds 50KB size limit
- Auth token expired

**Fix**: Check the Firestore Rules tab. Verify rules match `firestore.rules`. Check the document size.

### Sign-in works but no data appears in Firestore

**Cause**: The sync service may not have started. Check browser console for errors.

**Fix**: After sign-in, the `onAuthChanged` callback in `init.ts` should trigger `startCloudSync`. Check for errors in the console. Verify the Firestore database was created in the correct project (dev vs production).

### "resource-exhausted" error

**Cause**: You've hit a Firestore quota limit (unlikely with small usage) or the document write is too large.

**Fix**: Check the Firestore Usage tab for quota status. If the document is approaching 50KB, the user may have an unusually large number of presets.

### Console shows "FirebaseError: Missing or insufficient permissions"

**Cause**: The Firestore security rules are not allowing the operation.

**Fix**: Verify rules are deployed. Check that the authenticated user's UID matches the document path. Use the Firestore Rules Playground (in the Rules tab, click **Rules Playground**) to simulate reads/writes and see which rule is failing.

### OAuth consent screen shows "This app isn't verified"

**Cause**: Normal for apps in Testing mode or newly published apps.

**Fix**: For testing, this is fine — click "Advanced" → "Go to [app name] (unsafe)" to proceed. For production, you can request Google verification, but it's not required for apps that only use basic scopes (email, profile, openid). The warning will still appear but users can proceed.

---

## Quick Reference: Complete Setup Sequence

```
1. Create Firebase project (Analytics OFF)
2. Register web app (no Hosting)
3. Enable Google Sign-In provider
4. Set support email on OAuth consent screen
5. Publish OAuth consent screen (or add test users for dev)
6. Create Firestore database (production mode, choose region)
7. Deploy security rules from firestore.rules
8. Add authorized domains (GitHub Pages domain)
9. Copy config values into src/lib/cloudSync/config.ts
10. Run smoke tests
11. Run security checklist
```
