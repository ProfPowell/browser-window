# Code Review: @profpowell/browser-window v1.4.1

**Date:** 2026-03-23
**Reviewer:** Claude Opus 4.6

---

## Critical / High Priority

### 1. Event listener accumulation on attribute changes
**File:** `src/browser-window.js` ~line 328-329
`attributeChangedCallback` calls `render()` + `attachEventListeners()` on every attribute change. Since `render()` replaces innerHTML (destroying old DOM), old listeners are garbage-collected — but `attachEventListeners()` also adds new document-level listeners. The real risk: rapid attribute changes cause multiple render/attach cycles with no batching.

**Fix:** Batch renders with `requestAnimationFrame`, or skip re-render when `oldValue === newValue`.

**Codex Call:** Partial disagreement. The repeated re-render path is real, but the listener-leak framing is off: `attachEventListeners()` binds to freshly rendered shadow DOM nodes, and the document-level listeners are added elsewhere (`createOverlay()` / `toggleShareMenu()`), not here. I would keep the recommendation to compare `oldValue`/`newValue` and possibly batch churny updates, but I would treat this as a medium performance cleanup rather than a high-priority leak.

### 2. Duplicate aria-label: both close and minimize say "Minimize window"
**File:** `src/browser-window.js` ~line 1573-1574
The close button and minimize button both have `aria-label="Minimize window"`. Screen readers can't distinguish them.

**Fix:** Close button should say "Close window" or, since it now minimizes, rename the button semantically.

**Codex Call:** Agree. This is a concrete accessibility defect and one of the clearer issues in the current build.

### 3. Fetch not cancelled on disconnect
**File:** `src/browser-window.js` ~line 286-288, 603-615
`fetchSourceCode()` is awaited in `connectedCallback`. If the element is removed before fetch completes, the response still updates `this.sourceCode` on a disconnected element.

**Fix:** Use an `AbortController`, abort it in `disconnectedCallback`.

**Codex Call:** Agree, with lower severity. This is an async lifecycle cleanup gap more than a user-facing bug, but `AbortController` would make the component more disciplined and avoid stale updates.

### 4. custom-elements.json exposes 18+ private methods
**File:** `custom-elements.json`
The CEM analyzer picks up all `_`-prefixed methods (`_darkPalette`, `_sharedCSS`, `_deviceChrome`, `_setupDeviceScaling`, etc.) as public API. Internal state properties (`_resizeObserver`, `_currentScale`, `_outsideClickTimer`) are also exposed.

**Fix:** Configure CEM to exclude `_`-prefixed members, or add `@internal` JSDoc tags.

**Codex Call:** Agree. The manifest is currently a noisy contract and should stop advertising internals as supported API.

### 5. browser-window.d.ts missing device properties and internal methods leaked
**File:** `browser-window.d.ts`
- `mode` typed as `string` — should be `'light' | 'dark' | string`
- `device` doesn't list valid preset values
- Internal methods like `handleIframeError`, `retryLoad`, `updateContentView`, `handleOutsideClick`, `createOverlay`, `removeOverlay`, `escapeHtml` are in custom-elements.json but not in d.ts — inconsistency
- Should either exclude private methods from manifest or include them in d.ts with `@internal`

**Codex Call:** Partial agreement. Narrower unions for `mode`, `device`, and `deviceColor` would improve the declaration file. The internal-method mismatch is mostly a manifest problem, though. I would not add those helpers to the public `.d.ts`; I would remove or mark them internal in the generated metadata instead.

---

## Medium Priority

### 6. No focus trap in maximize (dialog) mode
**File:** `src/browser-window.js` ~line 958-970
When maximized, `role="dialog"` and `aria-modal="true"` are set. Focus is moved to the component with `tabindex="-1"`. But:
- `tabindex="-1"` means Tab key skips the element — users can Tab out of the "modal"
- No focus trap to keep keyboard navigation within the dialog
- Should be `tabindex="0"` or implement a proper focus trap

**Codex Call:** Mostly agree. The real gap is the missing focus containment after opting into modal dialog semantics. I would not insist on `tabindex="0"` specifically; `tabindex="-1"` is fine for programmatic focus, but a trap and clearer focus-restoration behavior are still needed.

### 7. Share menu missing semantic roles
**File:** `src/browser-window.js` ~line 1275-1310
The share menu has no `role="menu"` and items have no `role="menuitem"`. Screen readers won't announce it as a menu.

**Codex Call:** Partial agreement. The current controls are still buttons, so they are not inaccessible by default. The broader issue is that the popover lacks an explicit interaction model: if this wants to behave like a menu, it also needs the corresponding keyboard navigation and focus handling, not just ARIA roles stapled on.

### 8. Missing test coverage for key features
**File:** `test/browser-window.spec.js`
Not tested:
- Keyboard navigation (Escape closes maximize/menus, Tab navigation)
- Clipboard copy (`copySourceCode()`)
- CodePen export (`openInCodePen()`, `parseHTMLForCodePen()`)
- Web Share API (`shareViaWebAPI()`)
- Resize behavior (drag to resize, min-width/min-height constraints)
- Error/retry flow (broken iframe src)

**Codex Call:** Agree. The biggest gaps are share/copy/CodePen/retry flows and keyboard behavior around maximize and menus.

### 9. Hardcoded timeouts in tests
**File:** `test/browser-window.spec.js` ~lines 252, 275, 430, 654, 795
Multiple `page.waitForTimeout(500)` calls. These are brittle and slow. Replace with `waitForFunction()` predicates.

**Codex Call:** Agree. Condition-based waits would make the suite less flaky and reduce idle time.

### 10. CLAUDE.md says port 3000, package.json uses Vite (port 5173+)
**File:** `CLAUDE.md` line 13
States `npx serve .` on port 3000, but actual dev workflow is `npm run dev` (Vite). Also says "no build step required" which is misleading — production requires `npm run build`.

**Codex Call:** Agree. The repo guidance is stale and should match the actual Vite workflow.

---

## Low Priority / Polish

### 11. Outer frame margin hardcoded
`:host` sets `margin: 1rem 0` which may conflict with host page layout. Should be a CSS custom property or removed.

**Codex Call:** Partial agreement. This is more of an embedding default than a defect, but default outer spacing is opinionated enough that making it opt-in or tokenized would be cleaner.

### 12. Share menu shadow hardcoded
`.share-menu` uses `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` instead of a token. Vanilla Breeze themes can't override it.

**Codex Call:** Agree. Low priority, but it is a real theming escape hatch worth exposing.

### 13. Device toolbar pill fallback radius mismatch
`.device-toolbar` uses `var(--browser-window-border-radius, 20px)` — the 20px fallback doesn't match the default 8px. On pages without Vanilla Breeze tokens, if `--browser-window-border-radius` is unset, the pill gets 20px instead of 8px.

**Codex Call:** Agree. The fallback is inconsistent with the rest of the component and looks accidental.

### 14. Magic number: maximized iframe height
`iframe.style.minHeight = 'calc(90vh - 50px)'` — what is 50px? Should be a named constant or reference the header height.

**Codex Call:** Agree. This should be derived from layout structure or a CSS variable instead of a bare number in JS.

### 15. Source code view has no syntax highlighting
Code is displayed in `<pre><code>` with no color. For a component designed for tutorials, basic syntax highlighting would significantly improve the experience.

**Codex Call:** Partial agreement. It would improve the source view, but I would treat it as an enhancement rather than a review finding on par with lifecycle/accessibility bugs. For a zero-dependency component, this needs a deliberate tradeoff rather than an automatic add.

### 16. `--cem-analyze` uses `--litelement` flag
**File:** `package.json` line 36
The `analyze` script uses `--litelement` but this is a vanilla web component, not LitElement. The flag may cause the analyzer to miss or misinterpret features.

**Codex Call:** Partial agreement. The flag looks suspicious and should be validated or removed, but I would not claim it is the root cause of the current manifest problems without checking analyzer behavior directly.

### 17. retryLoad() doesn't inject safe areas in device mode
**File:** `src/browser-window.js` ~line 596
After retry, the new iframe load handler calls `_syncIframeColorScheme()` but doesn't call `_injectSafeAreas()` for device mode.

**Codex Call:** Agree. This is a concrete bug and one of the stronger functional findings in the review.

### 18. Device toolbar `.share-button.active` styling missing
The view-source button has `.active` styling in the device toolbar, but the share button does not. Inconsistent visual feedback when the share menu is open.

**Codex Call:** Partial disagreement. `.share-button.active` already exists globally, so the active state is not missing. The smaller point is that device mode has a custom active treatment for view-source but not for share, so the toolbar visuals are inconsistent.

---

## Documentation Gaps

| Item | Status |
|------|--------|
| `--browser-window-inner-radius` (new token) | Not in README, API docs, or d.ts JSDoc |
| `--browser-window-border-width` (new token) | Not in README, API docs, or d.ts JSDoc |
| `--browser-window-border-style` (new token) | Not in README, API docs, or d.ts JSDoc |
| Device toolbar (source/share/download in device mode) | Not documented anywhere |
| Local dev preview (`npm run dev` loads local source) | Not documented |
| `data-page-mode` internal attribute | Not documented; consumers may depend on it |
| Safe area inset values per device preset | Not documented (users must read source) |
| `--browser-window-overlay-z-index` | In README but not in API docs table |
| `--browser-window-menu-z-index` | In README but not in API docs table |

**Codex Call:** Partial agreement. The missing token/docs coverage is real, especially for the new CSS variables and device-toolbar behavior. I would not document `data-page-mode` as public API, though; if it is intentionally internal, it should stay undocumented and be treated as private implementation detail.

---

## Test Coverage Summary

| Feature | Tested | Notes |
|---------|--------|-------|
| Rendering & attributes | Yes | Comprehensive |
| Light/dark mode | Yes | Good coverage |
| Page-level dark detection | Yes | Good coverage |
| Minimize/maximize | Yes | Basic — no keyboard tests |
| Source view toggle | Yes | Basic — no copy test |
| Device mode rendering | Yes | Excellent |
| Device presets & geometry | Yes | Excellent |
| Device scaling | Yes | Good |
| Device orientation | Yes | Good |
| Safe areas | Yes | Good |
| Device toolbar | Yes | 2 tests |
| Iframe dark mode sync | Yes | Good |
| Share menu | No | Not tested |
| CodePen export | No | Not tested |
| Web Share API | No | Not tested |
| Clipboard copy | No | Not tested |
| Keyboard navigation | No | Not tested |
| Resize behavior | No | Not tested |
| Error/retry flow | No | Not tested |
| Download link | No | Not tested |
| Maximize focus management | No | Not tested |

**Codex Call:** Mostly agree. The untested interactive paths are the main gap. I would tighten the wording on a couple of rows: download behavior is not covered, but the toolbar/download affordance itself is asserted, and maximize/minimize already have basic functional coverage even though accessibility-focused assertions are missing.

---

## Positive Observations

- Clean single-file architecture with zero runtime dependencies
- Comprehensive CSS custom property surface (30+ tokens) with Vanilla Breeze integration
- Device mode with 9 accurate presets is a strong differentiator
- Background+padding bezel rendering eliminates anti-aliasing artifacts
- Page-level dark mode auto-detection across 5 framework conventions
- Compact icon-only device toolbar is elegant
- Local dev preview with automatic localhost detection is developer-friendly
- `escapeHtml()` is correctly implemented and applied for content rendering
- `prepublishOnly` gates on lint + test before npm publish
- Idempotent `customElements.define` guard prevents HMR crashes

**Codex Call:** Agree overall. The review's positive read on the core architecture and the recent release-hardening changes matches what I see in the code.
