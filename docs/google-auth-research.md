# Google Auth Research

Research date: 2026-03-16

## Purpose

Document how Google Sign-In should work as the shared identity for `Sync + Leaderboard` in Backpack Planner, including the three available sign-in methods and their trade-offs for a standalone PWA.

This is research-only documentation. It does not implement anything.

## Short Answer

Google Sign-In through Firebase Auth is the recommended identity for Backpack Planner.

Why:

- The app is shared via Discord, but no Discord-specific features are needed. Discord login adds OAuth friction without delivering Discord-specific value.
- Almost every user has a Google account.
- Firebase Auth handles Google Sign-In natively with minimal code.
- One sign-in per device establishes the shared identity for both private sync and public leaderboard.

## Why Not Discord Login

Discord login is strong when the app uses Discord-specific features like server-membership gating or Discord identity display. But if the app will not use any Discord features, Discord OAuth is pure friction:

- Users see a permissions page listing scopes and wonder why a backpack planner needs Discord access.
- The OAuth redirect flow is heavier than Google Sign-In.
- Not every user has Discord on every device.
- The app would need Supabase or Appwrite instead of Firestore just to get a first-class Discord provider, adding backend complexity for no product benefit.

If Discord features become important later, see [discord-auth-research.md](./discord-auth-research.md).

## Why Not Anonymous Auth

Firebase supports anonymous authentication, which creates an invisible server-side user ID with no user input.

Why it does not fit Backpack Planner:

- The whole point of cloud sync is cross-device access. Anonymous auth does not solve that because it creates a device-local identity with no way to find it from another device.
- The user must sign in with a real identity (Google, email, etc.) to link devices. If they have to do that anyway, the anonymous step is wasted.
- On a single device, localStorage already works. Anonymous cloud sync adds nothing useful because the user already has their data locally.
- If the user clears browser data or uninstalls the PWA, the anonymous UID is lost and the cloud data is orphaned with no way to recover.

When anonymous auth is useful (not this app):

- Deferred sign-up funnels where server-side state must exist before the user commits to an account.
- Firestore security rules that require an authenticated user even before real sign-up.
- Server-side rate limiting per anonymous identity.
- Try-before-you-sign-up SaaS where the server holds work during a trial.

All of these assume the server does something the client cannot. Backpack Planner stores everything in localStorage, so anonymous auth adds no value.

## Three Google Sign-In Methods

Firebase Auth supports three ways to sign in with Google. Each has different UX, implementation complexity, and PWA compatibility.

### 1. Google One Tap

Source: <https://developers.google.com/identity/gsi/web/guides/display-google-one-tap>

Overview: <https://developers.google.com/identity/gsi/web>

What it is:

- A small embedded card that appears inside the page showing the user's existing Google identity.
- Rendered inside a Google-controlled iframe on Google's origin.
- The user's Google credentials never touch your site. Your site receives a signed JWT token only.
- Same security model as Stripe's embedded payment forms (iframe isolation via same-origin policy).
- In newer browsers, may use the FedCM API (Federated Credential Management), which is a browser-native UI that no website can spoof.

How it works:

- Only appears if the user is already signed into Google in their browser.
- If the user is not signed into Google, One Tap silently does not appear. It does not fall back to anything on its own.
- The user does not type an email or password into the iframe. There is nothing to phish.
- Has a `.prompt()` method that can be called on demand (e.g., when the user taps "Enable Cloud Sync"), not only on page load.

Pros:

- Lowest friction when it works: one tap, no redirect, no popup.
- No email or password fields, so no phishing risk.
- Embedded in the page, feels seamless.

Cons:

- Does not work if the user is not signed into Google in the browser.
- Likely does not work in standalone PWA mode because the installed PWA runs in its own window without access to the browser's Google session cookies.
- Does not fall back automatically. You must implement a separate fallback.
- Separate library from Firebase Auth. Requires additional integration code to pass the JWT credential to Firebase.

### 2. Firebase `signInWithPopup`

Source: <https://firebase.google.com/docs/auth/web/google-signin>

What it is:

- Firebase Auth's built-in method that opens a separate browser popup window to Google's sign-in page.
- The popup shows the full google.com URL bar so the user can verify it is real.
- One line of Firebase code.

How it works:

- Opens a popup window to Google's OAuth consent screen.
- User signs in or selects their Google account in the popup.
- Popup closes and Firebase receives the credential automatically.

Pros:

- Simple to implement. One function call.
- User can verify the Google URL in the popup window.
- No additional libraries beyond Firebase Auth.

Cons:

- Opens a separate window, similar to Discord OAuth.
- Popup behavior in standalone PWAs is unreliable, especially on iOS.
- Some browsers and ad blockers may block popups.

### 3. Firebase `signInWithRedirect`

Source: <https://firebase.google.com/docs/auth/web/google-signin>

What it is:

- Firebase Auth's built-in method that redirects the entire app window to Google's sign-in page, then redirects back.
- One line of Firebase code.

How it works:

- The app navigates away to Google's sign-in page.
- User signs in or selects their Google account.
- Google redirects back to the app.
- Firebase picks up the result automatically on return.

Pros:

- Most reliable across all environments: browser, standalone PWA, iOS, Android.
- No popup to block.
- No iframe cookie issues.
- Works in standalone PWA mode because it navigates the app window itself.
- One function call.

Cons:

- The app briefly leaves to Google and comes back. Less seamless than One Tap.
- The user sees a page transition.

## Standalone PWA Compatibility

This is a critical consideration because Backpack Planner is a PWA that users may install.

| Method | Browser tab | Standalone PWA |
|--------|------------|----------------|
| Google One Tap | Works if signed into Google | Likely does not work (no access to browser's Google cookies) |
| `signInWithPopup` | Works | Unreliable, especially on iOS |
| `signInWithRedirect` | Works | Works |

`signInWithRedirect` is the only method that reliably works in all PWA modes.

## Recommended Strategy: Cascading Fallback

The goal is one "Enable Cloud Sync" button that always works, using the best available method for the current environment. The app tries each method in order, falling back silently on failure.

### Fallback chain

```
User taps "Enable Cloud Sync"
  │
  ├─ Step 1: Try Google One Tap (.prompt())
  │   → Works if user is signed into Google AND running in a browser tab
  │   → One tap on the embedded card, done
  │   → If it fails (not signed in, standalone PWA, cookies unavailable):
  │
  ├─ Step 2: Try signInWithPopup
  │   → Opens a Google sign-in popup window
  │   → Works in most browser tabs and some standalone PWA environments
  │   → If it fails (popup blocked, standalone PWA on iOS):
  │
  └─ Step 3: signInWithRedirect (final fallback, always works)
      → Redirects the app window to Google sign-in, then back
      → Works everywhere: browser, standalone PWA, iOS, Android
```

### What the user experiences per environment

| Environment | What happens |
|-------------|-------------|
| Browser tab, signed into Google | One Tap card appears in-page, one click, seamless |
| Browser tab, not signed into Google | One Tap silently fails → popup opens with Google sign-in |
| Standalone PWA (Android) | One Tap likely fails → popup may work → redirect if not |
| Standalone PWA (iOS) | One Tap fails → popup likely fails → redirect takes over |

The user never sees the fallback logic. They tap "Enable Cloud Sync" and end up signed in. The method that worked is invisible to them.

### Implementation notes

- Each step should fail fast and silently. One Tap has a `notDisplayed` callback. `signInWithPopup` rejects with an error code if blocked.
- The cascade should complete in under a second for the first two checks. The user only waits if the redirect path is needed.
- All three methods produce the same Firebase Auth credential. The rest of the app does not need to know which method succeeded.

## Recommended Product Flow

1. User taps **Enable Cloud Sync**.
2. Cascading sign-in runs (One Tap → popup → redirect).
3. Identity established. Sync starts.
4. Any other device: same button, same cascade, same data.
5. Leaderboard: same identity. Display name chosen at publish time, independent of Google account name.

One sign-in per device. No anonymous step. No deferred sign-up. No Discord OAuth.

## Identity and Data Model

Use Google's stable user ID (the Firebase Auth UID, which is consistent across sign-in methods) as the owner key for both private sync and public leaderboard.

Recommended private identity fields:

- `provider: "google"`
- `firebaseUid`
- `email` (optional, only if needed)
- `displayName` (from Google profile, used as a default for leaderboard but overridable)

Recommended public leaderboard fields:

- `ownerRef` tied to the Firebase UID
- `displayName` chosen by the user at publish time (not forced to be the Google name)

## Security Notes

- Google One Tap iframe is on Google's origin. Your site cannot read into it. Same-origin policy protects credentials.
- One Tap does not show email or password fields. Nothing to phish.
- `signInWithPopup` shows the full Google URL bar in the popup for user verification.
- `signInWithRedirect` navigates to the real google.com domain.
- In all three methods, your site only receives a Firebase Auth credential or JWT token. Your site never handles Google passwords.

## Final Recommendation

Best practical approach for Backpack Planner:

1. Use one opt-in surface: **Enable Cloud Sync**.
2. Use Google Sign-In as the only identity method.
3. Use the cascading fallback chain: One Tap → `signInWithPopup` → `signInWithRedirect`. This gives the best UX in browsers while guaranteeing it works in standalone PWA mode.
4. Skip anonymous auth entirely.
5. Skip Discord login unless Discord-specific features become a requirement.
6. Use Firebase Auth UID as the stable owner key for both sync and leaderboard.
7. Let public display names be chosen at publish time, independent of Google identity.

## Sources

- Google One Tap for web
- <https://developers.google.com/identity/gsi/web/guides/display-google-one-tap>

- Google Identity Services overview
- <https://developers.google.com/identity/gsi/web>

- Firebase Google Sign-In for web
- <https://firebase.google.com/docs/auth/web/google-signin>

- Firebase account linking
- <https://firebase.google.com/docs/auth/web/account-linking>

- Firebase anonymous auth
- <https://firebase.google.com/docs/auth/web/anonymous-auth>

- FedCM (Federated Credential Management)
- <https://developer.chrome.com/docs/privacy-sandbox/fedcm/>
