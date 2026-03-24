# Codex Review

Date: 2026-03-23
Reviewed commit: `5285b32545a55c707ed32d1a619c0184f7195fcb`

Validation:
- `npm run lint`: passes
- `npm test`: 71 passed

## Findings

1. High: the share menu outside-click logic is still brittle under Shadow DOM event retargeting.
   - `toggleShareMenu()` registers a document-level click handler in `src/browser-window.js:724-743`.
   - `handleOutsideClick()` then checks `menu.contains(e.target)` in `src/browser-window.js:746-750`.
   - Because menu clicks originate inside the component's shadow tree, `e.target` is retargeted when observed from `document`, so internal menu clicks can be misclassified as outside clicks. That is especially risky for the share/codepen buttons rendered in `src/browser-window.js:1597-1618` and `src/browser-window.js:2183-2204`.
   - Suggestion: use `e.composedPath().includes(menu)` or scope the outside-click listener to a boundary where the real composed path is available.

2. Medium: re-created iframes do not restore the full lifecycle handler set.
   - The initial iframe wiring in `src/browser-window.js:547-555` attaches both `error` and `load`, and device mode also re-injects safe-area variables.
   - The retry path in `src/browser-window.js:587-596` only restores `error` plus basic color-scheme sync; it does not re-run safe-area injection for device mode.
   - The source-toggle restore paths in `src/browser-window.js:639-642` and `src/browser-window.js:662-668` restore `load`, but not `error`, so iframe failures after toggling source view no longer show the retry UI.
   - Suggestion: centralize iframe creation/wiring in one helper and reuse it everywhere the component recreates an iframe.

3. Medium: the copy-feedback timer is only cleaned up on disconnect, not when the source-view DOM is replaced.
   - The timer is set in `src/browser-window.js:713-717` and cleared in `src/browser-window.js:306-307`.
   - `updateContentView()` and its browser/device helpers replace the source-view subtree in `src/browser-window.js:618-675`, but they do not clear `_copyFeedbackTimer` first.
   - That leaves a timer holding a stale button reference and later mutating detached DOM.
   - Suggestion: clear `_copyFeedbackTimer` before any source-view teardown or content swap, not just in `disconnectedCallback()`.

4. Medium: the browser toolbar still exposes two minimize actions and no clearly labeled close action.
   - In `_browserChrome()`, both the red and yellow traffic-light buttons are labeled "Minimize window" in `src/browser-window.js:1573-1575`.
   - `handleClose()` in `src/browser-window.js:836-843` now collapses the window instead of acting like a close affordance, so the red button is visually "close" but behaviorally another minimize control.
   - Suggestion: either restore a distinct close/collapse semantic for the red button or relabel/restyle the control so the red and yellow buttons do not advertise the same action.

5. Low: the README's device dimension table has drifted from the source presets.
   - `galaxy-s24` is documented as `412 x 915` in `README.md:105`, but the preset in `src/browser-window.js:206-214` is `360 x 780`.
   - `ipad-pro-13` is documented as `1024 x 1366` in `README.md:107`, but the preset in `src/browser-window.js:226-234` is `1032 x 1376`.
   - Suggestion: generate the public preset table from `DEVICE_PRESETS` or at least keep one canonical source of truth.

6. Low: `custom-elements.json` is still a weak public contract for the component.
   - The source now exposes `part="header"` and `part="content"` in `src/browser-window.js:1571` and `src/browser-window.js:1637`, but the generated manifest still does not include css parts metadata.
   - The manifest also exports internal fields like `_outsideClickTimer` and `_copyFeedbackTimer` in `custom-elements.json:323-336`, which adds noise to downstream tooling.
   - Suggestion: curate the manifest output so it highlights the intended public surface and hides internal implementation details.

## Additional Suggestions

- Add Playwright coverage for the remaining weak spots: share-menu item clicks, close-button accessibility labeling, and iframe error/retry after source-view toggles.
- Review the publish path after the new `prepublishOnly` change. `package.json` now runs Playwright before publish, but `.github/workflows/publish.yml:21-22` still goes straight from `npm ci` to `npm publish`; if the runner image ever lacks Playwright browsers, tag releases may fail.
