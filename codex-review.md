# Codex Review

Date: 2026-03-23
Reviewed commit: `4a62c33eca11c46d0e86fd934ce4303545897fea`

Validation:
- `npm run lint`: passes
- `npm test`: 82 passed

## Findings

1. High: share-menu outside-click handling is still fragile under Shadow DOM retargeting.
   - `toggleShareMenu()` still installs a document-level click listener in `src/browser-window.js:743-761`.
   - `_handleOutsideClick()` still decides "inside vs outside" with `menu.contains(e.target)` in `src/browser-window.js:765-769`.
   - At the `document` boundary, clicks from inside the shadow tree are retargeted, so menu-item clicks are not reliably classified as "inside". That is especially risky for the native share path in `src/browser-window.js:772-787`, because the menu is only closed after `await navigator.share(...)`; a misclassified document click can close the menu early and then the success path can toggle it back open.
   - Suggestion: switch to `e.composedPath().includes(menu)` (or another composed-path based boundary check) and add a Playwright test that clicks the actual share/codepen menu items rather than only opening the menu.

2. Medium: restoring the iframe after source-view toggles still drops the error/retry wiring.
   - The initial iframe setup in `src/browser-window.js:549-564` and the retry path in `src/browser-window.js:596-610` attach both `load` and `error` behavior.
   - The source-view restore paths in `src/browser-window.js:658-662` and `src/browser-window.js:680-688` only reattach `load`.
   - That means a broken iframe `src` can show the retry UI on first render, but the same broken source will silently lose that recovery path after toggling source view on and back off.
   - Suggestion: centralize iframe creation/wiring in one helper and reuse it for initial render, retry, and source-view restoration.

3. Medium: maximize mode still advertises modal-dialog semantics without modal keyboard behavior.
   - `toggleMaximize()` sets `role="dialog"` and `aria-modal="true"` in `src/browser-window.js:975-989`, then focuses the host with `tabindex="-1"`.
   - Escape is handled, but there is still no focus trap or tab-loop containment, so keyboard users can tab out of what is announced as a modal dialog.
   - Suggestion: either implement focus containment/restoration consistent with a modal dialog, or stop advertising `aria-modal="true"` until the interaction model matches the semantics.

4. Low: the public docs still drift from the implementation in a few visible places.
   - The README device table still lists `galaxy-s24` as `412 x 915` and `ipad-pro-13` as `1024 x 1366` in `README.md:100-107`, but the actual presets are `360 x 780` and `1032 x 1376` in `src/browser-window.js:206-228`.
   - The README also still says source view is "syntax-highlighted" in `README.md:129`, but the implementation is still plain `<pre><code>` output in `src/browser-window.js:696-710`.
   - `--browser-window-margin` is now implemented in `src/browser-window.js:1070` but is not documented alongside the other CSS custom properties in `README.md:156-192`.
   - Suggestion: treat the source presets/CSS token list as the canonical source for docs, or generate the README tables from code.

5. Low: the generated public API surface is cleaner now, but it still underspecifies some real consumer hooks.
   - `browser-window.d.ts:20-29` still leaves `device` as a generic `string` even though the component exposes a fixed preset set.
   - The source exposes `part="header"` and `part="content"` in `src/browser-window.js:1590` and `src/browser-window.js:1656`, but `custom-elements.json` still only lists members/attributes and does not advertise those styling hooks.
   - Suggestion: tighten the TypeScript declaration for `device` and extend the manifest generation so editor/tooling consumers can discover the supported parts.

## Additional Suggestions

- Add targeted Playwright coverage for the remaining gaps around share-menu item clicks, native share behavior, and tab navigation while maximized.
- Once the iframe recreation logic is centralized, test the broken-`src` retry flow both before and after toggling source view so that regression does not come back.
