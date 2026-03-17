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

## Recommended Strategy

Use a try-best-then-fallback approach triggered by a user action:

```
User taps "Enable Cloud Sync"
  → Try Google One Tap (.prompt())
  → User already signed into Google in this browser?
     YES → Small embedded card appears, one tap, done
     NO  → One Tap silently fails, fall back to signInWithRedirect
```

In practice:

- In a browser tab where the user is signed into Google: One Tap works, one click, seamless.
- In a standalone PWA or when not signed into Google: One Tap silently fails, redirect takes over. The user briefly sees Google's sign-in page and comes back.
- The user does not notice the difference. They tap "Enable Cloud Sync" and end up signed in either way.

Simpler alternative:

- Skip One Tap entirely. Just use `signInWithRedirect` as the only method. It works everywhere. The UX is slightly less seamless but simpler to build and test.

## Recommended Product Flow

1. User taps **Enable Cloud Sync**.
2. Google Sign-In happens (One Tap or redirect).
3. Identity established. Sync starts.
4. Any other device: same Google sign-in, same data.
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

## Recommendation By Scenario

If the question is "what is the simplest reliable approach?":

- Firebase `signInWithRedirect` with Google only.

If the question is "what gives the best UX in browsers?":

- Google One Tap with `signInWithRedirect` as fallback.

If the question is "what works best in standalone PWA?":

- Firebase `signInWithRedirect` with Google only.

## Final Recommendation

Best practical approach for Backpack Planner:

1. Use one opt-in surface: **Enable Cloud Sync**.
2. Use Google Sign-In as the only identity method.
3. Use `signInWithRedirect` as the primary (or only) sign-in method for maximum PWA compatibility.
4. Optionally try Google One Tap first for a smoother browser experience, falling back to redirect.
5. Skip anonymous auth entirely.
6. Skip Discord login unless Discord-specific features become a requirement.
7. Use Firebase Auth UID as the stable owner key for both sync and leaderboard.
8. Let public display names be chosen at publish time, independent of Google identity.

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
