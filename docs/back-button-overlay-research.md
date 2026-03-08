# Back button & overlays – research summary

## Web standard: only one hook

**The only standard way to react to the back button is the History API:**

1. When an overlay opens: `history.pushState(state, '', url)` (same URL is fine).
2. Listen for `popstate`; in the handler, close the overlay (and optionally re-push if more overlays remain).

There is no other web API to “intercept” or “disable” the back button. You cannot prevent the navigation from happening; you can only add history entries so that “back” lands on an entry you control and you handle it in `popstate`.  
Ref: [MDN – Window: popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event), [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API).

---

## Svelte / libraries

- **SvelteKit** has “shallow routing”: `pushState` / `replaceState` from `$app/navigation` and handling back via `history.back()` so modals can be closed by back. Same idea as above, built into the framework.  
  Ref: [SvelteKit shallow routing](https://svelte.dev/docs/kit/shallow-routing).
- This project is **Vite + Svelte (no SvelteKit)**, so that built-in solution does not apply.
- There is **no widely used Svelte library** that only “hooks back button to close overlays”; router libs (e.g. svelte-history-router) are for routing, not this pattern.

So in a Vite+Svelte app, the only clean option is to use the History API yourself (push on overlay open, handle `popstate` to close).

---

## PWA and “native” back behavior

- **PWA manifest:** There is **no** manifest option to disable the back button or system back/swipe gestures. A [W3C manifest issue](https://github.com/w3c/manifest/issues/1041) requests an option to disable built-in navigation gestures; it is still **open** (as of 2025) and not part of the spec.
- **Chrome “Navigation management” for PWAs** (e.g. Chrome 139+): This is about **link capturing** (opening links in the installed PWA vs in the browser), not about controlling the back button.  
  Ref: [Chrome – Navigation management into installed PWAs](https://developer.chrome.com/docs/capabilities/pwa-navigation-management).
- **Conclusion:** There is no standard or PWA-specific way to “fully disable” the back button. Back/swipe is controlled by the browser/OS; the page can only add history entries and respond in `popstate`.

---

## Can the back button be fully disabled?

- **No**, in standard web APIs. You cannot prevent the user from going back; you can only make “back” go to a history entry you created and then handle it (e.g. close overlay, or re-push and do nothing visible).
- **Workarounds** (e.g. `touchstart` + `preventDefault()` near the screen edge to try to block iOS swipe-back) are **non-standard, fragile, and not reliable** (e.g. they can fail while the page is scrolling). Not recommended for a maintainable app.

---

## Cleaner, low-regression approach (if you try again)

To avoid regressions (preview URLs, build hash, stacking) while still using the only standard hook (History API):

1. **Never change the URL for overlay entries**  
   Always `pushState(..., window.location.href)`. Do not add fragments or query params for “overlay” so that preview/build `#` URLs are never overwritten or misinterpreted.

2. **Avoid fighting other history mutators**  
   - Either make URL sync (e.g. `updateUrlWithCurrentBuild`) **skip** `replaceState` while any overlay is open (e.g. `hasOverlays()`), so the overlay entry is not replaced.  
   - Or accept that when the app does `replaceState`, the overlay entry can be lost and the next back might navigate away; then you are not changing app URL behavior for preview/build.

3. **Single listener, simple stack**  
   One `popstate` listener (capture phase is fine). On popstate: if your stack is non-empty, pop one overlay and run its close callback; optionally re-push one entry if more overlays remain (knowing that same-URL re-push may not create a new entry in some browsers).

4. **Optional: only handle when state is “ours”**  
   Use a sentinel in the state object (e.g. `{ overlay: true, id }`). In `popstate`, if `event.state` matches that sentinel and your stack is non-empty, close the top overlay; otherwise do nothing (let the app handle real navigation). That keeps overlay logic from interfering with normal back navigation when there are no overlays.

5. **No Svelte-specific magic**  
   This is plain History API + a small module (push on open, pop on close, one listener). No framework API replaces that in a Vite-only Svelte app.

In short: **the only standard, reliable hook is History API + popstate**. A minimal implementation that never touches the URL and coordinates with URL sync (or doesn’t) is the cleanest way to avoid regressions while still supporting “back closes overlay” where the browser allows it.
