# Code Review: @profpowell/browser-window

**Date:** 2026-03-23
**Version reviewed:** 1.2.0 (commit e38dc2b)

---

## Critical / High Priority

### 1. Document click listener leak on share menu
**File:** `src/browser-window.js` ~line 635
When the share menu opens, a `handleOutsideClick` listener is added to `document` via `setTimeout`. If the component is removed from the DOM while the menu is open, `disconnectedCallback` never removes this listener. It persists on the global document, leaking memory and potentially throwing errors.

**Fix:** Track the bound handler and explicitly remove it in `disconnectedCallback`.

**Codex Call**: Partial disagreement. There is a real leak/race here, but not for the reason stated. `disconnectedCallback()` does remove the document listener; the actual bug is that `toggleShareMenu()` adds it asynchronously with `setTimeout`, so the listener can be attached after disconnect.

### 2. Full innerHTML replacement on every attribute change
**File:** `src/browser-window.js` ~line 321
`attributeChangedCallback` calls `render()` which replaces the entire Shadow DOM via `innerHTML`, then re-attaches all event listeners. This is expensive and fragile:
- All DOM state (scroll position, focus, selection) is lost
- Rapid attribute changes cause redundant full re-renders with no batching
- Event listeners are destroyed and recreated each time

**Fix:** Update only the affected DOM elements per attribute change, or batch renders with `requestAnimationFrame`.

**Codex Call**: Agree. This is a real structural weakness in the component and one of the larger maintainability costs in the current implementation.

### 3. Overlay style tags accumulate in document head
**File:** `src/browser-window.js` ~line 775
`createOverlay()` appends a new `<style>` element with `@keyframes fadeIn` to `document.head` every time maximize is toggled. Repeated maximize/restore cycles bloat the head with duplicate style tags.

**Fix:** Create the animation style once (e.g., a module-level singleton) and reuse it.

**Codex Call**: Agree. This one is straightforward and I called it out in my own review as well.

### 4. Multiple listener accumulation on rapid toggling
**File:** `src/browser-window.js` ~lines 584, 635
- `toggleShareMenu()` adds a new document click listener each time without checking if one already exists.
- `updateContentView()` creates a new copy button with a new listener each call.
- `retryLoad()` creates new iframes with new load/error listeners.

Rapid toggling accumulates duplicate handlers.

**Fix:** Guard against duplicate registration or use `{ once: true }` where appropriate.

**Codex Call**: Partial disagreement. The share-menu path has a real async listener bug, but the copy button and retry iframe cases replace the old DOM nodes, so they do not accumulate handlers in the same way. This point is directionally right but overstates the blast radius.

---

## Medium Priority

### 5. No focus management in maximize (dialog) mode
**File:** `src/browser-window.js` ~line 842
When maximized, the component sets `role="dialog"` and `aria-modal="true"` but:
- Focus is not moved into the dialog
- There is no focus trap (Tab can escape to background content)
- Focus is not restored to the trigger element on close

**Fix:** Implement standard dialog focus management: trap focus, move focus on open, restore on close.

**Codex Call**: Agree. Once the component claims dialog semantics, it should also honor the expected focus behavior.

### 6. Missing null checks in toggleShareMenu
**File:** `src/browser-window.js` ~line 628
`menu.style.display = 'block'` will throw if `.share-menu` is not in the DOM (e.g., during render or after attribute change).

**Fix:** Add null guards before accessing `menu` and `shareBtn`.

**Codex Call**: Partial agreement. Normal click flows create these nodes before the method is called, so this is not an immediate user-path bug, but `toggleShareMenu()` is public and can currently throw if called when the share UI is absent or mid-rerender.

### 7. Copy button timeout not cleaned up
**File:** `src/browser-window.js` ~line 616
The 2-second `setTimeout` for copy feedback is never cleared. If the component is removed or the view is toggled before it fires, it writes to a detached DOM node.

**Fix:** Store the timeout ID and clear it in `disconnectedCallback` and `updateContentView`.

**Codex Call**: Agree. This is a cleanup issue more than a headline bug, but the timer should be tracked and cleared.

### 8. ResizeObserver callback not debounced
**File:** `src/browser-window.js` ~line 1983
`_updateDeviceScale()` runs on every ResizeObserver callback with no throttle. In responsive layouts this can fire at 60fps during animations, causing layout thrashing.

**Fix:** Debounce or throttle with `requestAnimationFrame`.

**Codex Call**: Disagree. This reads more like a performance hypothesis than a demonstrated problem. `_updateDeviceScale()` is small, and I would not add throttling complexity without profiling evidence.

### 9. MutationObserver watches `style` attribute on html/body
**File:** `src/browser-window.js` ~line 119
The page-mode observer's `attributeFilter` includes `style`, which fires on every inline style change to `<html>` or `<body>`. Libraries that animate or adjust these elements will trigger unnecessary mode re-detection across all instances.

**Fix:** Remove `style` from the filter. Rely on `class`, `data-theme`, `data-bs-theme`, and `data-mode` only.

**Codex Call**: Disagree. The component explicitly supports computed `color-scheme` detection, so watching `style` is intentional for inline `style="color-scheme: dark"` changes. If this becomes noisy, coalescing observer work is safer than dropping `style` entirely.

### 10. Dark mode CSS is tripled
**File:** `src/browser-window.js` ~lines 925-975
The same dark palette is defined in three separate blocks: `@media (prefers-color-scheme: dark)`, `:host([data-page-mode="dark"])`, and `:host([mode="dark"])`. Any color change requires updating all three.

**Fix:** Extract dark values into a shared mixin or use a single set of CSS custom property overrides applied by a common selector (e.g., a `:host(.dark)` class toggled by JS).

**Codex Call**: Agree. This is a real maintenance burden even if the selectors are currently intentional.

---

## Low Priority / Polish

### 11. Hardcoded z-index values
Overlay uses `z-index: 9998`, maximized host uses `9999`, share menu uses `1000`. These can conflict with host page stacking contexts.

**Fix:** Expose as CSS custom properties (e.g., `--browser-window-z-index`).

**Codex Call**: Agree. Low severity, but this is a sensible integration improvement for an embeddable component.

### 12. Status bar / home indicator colors wrong on light bezels
Device colors `silver`, `gold`, `white` use light bezels but status bar text is white (`rgba(255,255,255,0.9)`), making it invisible. The `.light-bezel` class exists but doesn't cover all elements (e.g., home indicator).

**Fix:** Apply dark text/icon colors consistently when `.light-bezel` is active.

**Codex Call**: Disagree. The current code already adjusts `.light-bezel .status-bar`, `.light-bezel .home-indicator-pill`, and the home-button ring, so this looks fixed in the reviewed version.

### 13. No property setters (attribute reflection)
Getters exist for `url`, `src`, `mode`, etc., but no setters. Setting `element.url = '...'` changes the JS property but doesn't update the attribute or trigger a re-render.

**Fix:** Add setters that call `this.setAttribute()`.

**Codex Call**: Partial agreement. The component does lack a proper property API, but the wording is slightly off: with getter-only accessors, property assignment will usually fail or be ignored rather than update a shadow JS value. Still worth fixing if property-style consumption is intended.

### 14. `ipad-mini` device preset undocumented
The preset exists in source code but is missing from:
- `/docs/api.html` device preset table
- `/docs/demos.html` device demo grid
- README.md

**Codex Call**: Agree. I verified this one.

### 15. Private state exposed as public properties
`isMinimized`, `isMaximized`, `showSource`, `showShareMenu` are plain public properties. External code can set them directly, bypassing the toggle methods and leaving the DOM out of sync.

**Fix:** Use private fields (`#isMinimized`) with public getter-only access.

**Codex Call**: Agree. These mutable public fields are easy to desynchronize from the rendered DOM.

### 16. Close button behavior is misleading
The red close button (with `aria-label="Close window"`) only restores from maximized state. In non-maximized state it does nothing visible. This doesn't match the macOS metaphor or the aria label.

**Fix:** Either disable/hide when not maximized, or give it a meaningful non-maximized action (e.g., collapse). Update the aria-label to match actual behavior.

**Codex Call**: Agree. This is both a UX mismatch and an accessibility labeling issue.

### 17. Inline SVG icons repeated
Traffic light button SVGs and action bar icons are duplicated as HTML strings. Updating an icon requires finding every occurrence.

**Fix:** Extract to template functions or shared constants.

**Codex Call**: Partial agreement. There is repeated inline icon markup, but the traffic-light controls are CSS circles, not SVGs. The maintainability concern still stands for the action icons.

### 18. `custom-elements.json` missing data
- CSS `::part()` exports (`header`, `content`) are not documented in the manifest
- Many method descriptions are empty strings
- Device preset enumeration not included in the `device` attribute description

**Codex Call**: Agree. The manifest is sparse, and there is an additional nuance here: `content` is emitted as a part, but `header` is documented without actually being rendered as a part in the DOM.

---

## Documentation Gaps

- `ipad-mini` preset: Missing from docs and demos.
  **Codex Call**: Agree. This gap is real.

- CSS Parts (`::part(header)`, `::part(content)`): Mentioned in JSDoc but absent from API docs page.
  **Codex Call**: Disagree. The API docs already include a CSS Parts section. The better critique is that the manifest omits cssParts metadata and `header` is documented even though the rendered DOM does not expose `part="header"`.

- Keyboard shortcuts (Escape to close): Not documented in API reference.
  **Codex Call**: Disagree. `Escape` is documented in both the API docs and README.

- Resize behavior (`resize: both`): Not mentioned in API docs.
  **Codex Call**: Disagree. The API docs already include a dedicated Resizable section.

- Event list (component fires no custom events): Worth documenting explicitly.
  **Codex Call**: Agree. Even "no custom events" is useful API information.

- `data-page-mode` internal attribute: Undocumented; consumers may depend on it.
  **Codex Call**: Partial agreement. It is undocumented, but I would document it as internal and unstable rather than treat it as supported surface area.

---

## Testing Gaps

The Playwright test suite covers basic rendering, attributes, and mode switching. Consider adding:

- **Share menu:** Open/close, outside click dismissal, Web Share API mock
  **Codex Call**: Agree. I did not see coverage for the share menu behaviors.

- **Maximize mode:** Overlay creation/removal, Escape key, focus management
  **Codex Call**: Partial disagreement. Overlay creation/removal is already tested; `Escape` handling and focus management are the real gaps.

- **Source view sizing:** Verify source panel fills available height (recent fix)
  **Codex Call**: Agree. That specific behavior is not covered.

- **Device mode scaling:** ResizeObserver-driven scale calculation
  **Codex Call**: Disagree. The current Playwright suite already exercises device scaling and resize-driven recalculation.

- **Error/retry flow:** Failed iframe loads, retry button behavior
  **Codex Call**: Agree. I did not see coverage for this path.

- **Memory cleanup:** Listener removal on `disconnectedCallback`
  **Codex Call**: Agree. Cleanup behavior is largely untested.

- **Rapid toggling:** No duplicate listeners or DOM corruption
  **Codex Call**: Agree. This is a good stress-test addition.

---

## Positive Observations

- Clean single-file architecture with no runtime dependencies
  **Codex Call**: Partial agreement. No runtime dependencies is a real strength. The single-file structure is simple, but at about 2,000 lines it has also become a maintenance problem.

- Comprehensive CSS custom property surface for theming
  **Codex Call**: Agree. This is one of the component's stronger design choices.

- Thoughtful dark mode auto-detection across multiple framework conventions
  **Codex Call**: Partial agreement. The detection breadth is thoughtful, but the implementation is currently inconsistent between CSS theme selection and iframe color-scheme syncing.

- Device mode with accurate preset dimensions is a strong differentiator
  **Codex Call**: Agree. This feature stands out and is backed by decent test coverage.

- Good use of Shadow DOM encapsulation
  **Codex Call**: Agree. The encapsulation story is generally solid.

- TypeScript definitions are accurate and well-typed
  **Codex Call**: Disagree. The definitions omit existing getters like `device` and `deviceColor`, and the public surface is not fully aligned with the implementation.

- CI/CD pipeline with npm provenance is production-ready
  **Codex Call**: Partial disagreement. The publish workflow does use npm provenance, but I would not call it production-ready while lint/tests are not enforced there and the current tree is red.

- `escapeHtml` is correctly implemented and applied where needed
  **Codex Call**: Partial agreement. The helper itself is fine and is used in the important interpolations I checked, but "where needed" is broader than I would claim given the component's heavy `innerHTML` rendering strategy.
