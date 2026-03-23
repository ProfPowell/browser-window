# Codex Review

Date: 2026-03-23

Scope:
- Review based on the current working tree in this repository.
- Validation run locally with `npm run lint` and `npm test`.

Quality gate status:
- `npm run lint`: fails with 3 errors
- `npm test`: 66 passed, 3 failed

## Findings

1. High: `src` changes do not refresh source-dependent features.
   - `connectedCallback()` fetches source once in `src/browser-window.js:281-288`, but `attributeChangedCallback()` in `src/browser-window.js:319-340` never refetches when `src` changes later.
   - `updateContentView()`, `copySourceCode()`, and `openInCodePen()` all depend on `this.sourceCode` (`src/browser-window.js:557-623`, `src/browser-window.js:702-731`), so a dynamic `src` update leaves view-source, copy, and CodePen export stale or empty.
   - Suggestion: handle `src` explicitly in `attributeChangedCallback()`: reset `showSource`, clear stale source, refetch, and re-sync the iframe once the new content loads.

2. High: automatic theme handling is inconsistent between CSS and JavaScript.
   - Visual auto-dark mode is implemented in CSS with `prefers-color-scheme` in `src/browser-window.js:924-937`, but the `mode` getter in `src/browser-window.js:355-357` falls back to `'light'`.
   - `_syncIframeColorScheme()` in `src/browser-window.js:411-423` uses that getter, so an iframe is forced to `light` unless dark mode came from an explicit `mode` attribute or `data-page-mode`.
   - That contradicts the README promise that the component follows the system preference (`README.md:57-70`, `README.md:111-112`) and can leave the chrome dark while the embedded document is told to render light.
   - Suggestion: introduce a single "effective mode" helper that resolves `mode` attribute, page-level signal, then `matchMedia('(prefers-color-scheme: dark)')`, and use that everywhere.

3. High: inline `onclick` handlers make the component brittle under strict CSP.
   - The retry button and share menu actions are rendered with inline handlers in `src/browser-window.js:513-523` and `src/browser-window.js:1489-1505`.
   - Reusable web components often end up in sites that disallow inline JavaScript. Under a strict `Content-Security-Policy`, these controls simply stop working.
   - Suggestion: move those bindings into `attachEventListeners()` and keep the rendered HTML passive.

4. Medium: the repo is currently red, and the publish path does not prevent shipping red builds.
   - Lint currently fails on `src/browser-window.js:95`, `src/browser-window.js:420`, and `src/browser-window.js:449`.
   - The Playwright suite currently fails 3 tests in `test/browser-window.spec.js:76-142`; the failing assertions still expect old CSS token strings that no longer exist in the component implementation.
   - `prepublishOnly` in `package.json:37` runs only build and manifest generation, so broken lint/tests can still be published.
   - Suggestion: fix the current failures, then make `prepublishOnly` or CI run at least lint + test before release.

5. Medium: maximize mode leaks style tags into the page.
   - `createOverlay()` appends a fresh `<style>` tag to `document.head` every time maximize is entered (`src/browser-window.js:751-779`), but `removeOverlay()` only removes the overlay node (`src/browser-window.js:782-788`).
   - Repeated maximize/restore cycles steadily accumulate redundant global styles.
   - Suggestion: define the animation once, or keep the overlay styling inside component-managed CSS instead of creating ad hoc global style elements.

6. Medium: the custom element registration is not idempotent.
   - `customElements.define('browser-window', BrowserWindow);` in `src/browser-window.js:2025` is unconditional.
   - Duplicate imports, HMR, or multiple bundles loading the same library can throw and break the page.
   - Suggestion: guard registration with `if (!customElements.get('browser-window'))`.

7. Low: public docs and generated metadata are out of sync with the implementation.
   - The README attribute table only lists `url`, `title`, `src`, `mode`, and `shadow` (`README.md:82-90`), but the implementation also supports `device`, `device-color`, `orientation`, and `show-safe-areas` (`src/browser-window.js:12-15`, `src/browser-window.js:305-316`).
   - The README advertises `npm run test:watch` (`README.md:196-207`), but no such script exists in `package.json`.
   - `browser-window.d.ts:7-73` does not expose the `device` and `deviceColor` getters that exist in the class, while `custom-elements.json:45-220` currently exposes many internal helper methods as part of the generated surface.
   - Suggestion: decide on a curated public API and regenerate docs/types/manifests from that contract.

## Additional Suggestions

- Break `src/browser-window.js` into smaller modules. At 2,025 lines, state management, DOM rendering, theme detection, and device preset logic are tightly coupled and difficult to test in isolation.
- Add ignores for generated artifacts. `.gitignore:1-24` does not exclude `playwright-report/`, `test-results/`, package tarballs, or local screenshot directories, which leaves routine test output showing up as untracked noise.
- Reduce string-heavy `innerHTML` rendering for interactive subtrees. Moving more of the component to explicit DOM updates or a small templating helper would reduce CSP exposure, event rebinding churn, and future escaping mistakes.
