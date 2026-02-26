# Phase 2: Device Mode Enhanced Features

Phase 1 shipped device chrome with portrait phones and tablets, preset geometry, scaling, and device colors. Phase 2 adds orientation support, safe area injection, and safe area overlays.

## New Attributes

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `orientation` | `portrait`, `landscape` | `portrait` | Swaps device dimensions and repositions chrome |
| `show-safe-areas` | Boolean | _(absent)_ | Draws translucent overlay bands at safe area boundaries |

Add both to `observedAttributes` in `src/browser-window.js`.

## Orientation Support

### `orientation="landscape"` Behavior

When `orientation="landscape"` is set, the component swaps the device's width and height and repositions chrome elements. This is a layout swap, not a CSS rotation.

**Dimension swap:**
```js
_getEffectiveDimensions(preset) {
  const isLandscape = this.getAttribute('orientation') === 'landscape';
  return {
    width: isLandscape ? preset.height : preset.width,
    height: isLandscape ? preset.width : preset.height,
  };
}
```

**Chrome repositioning in landscape (phones):**
- Dynamic Island moves to the left edge (vertical pill, 37×126px)
- Home indicator moves to the right edge (vertical pill)
- Status bar repositions: time at top-left of content, icons at top-right
- Safe area insets rotate: `[T,R,B,L]` → `[L,T,R,B]`

**Chrome repositioning in landscape (tablets):**
- Status bar stays at top
- Home indicator stays at bottom
- Safe insets rotate same as phones
- No notch repositioning needed (iPads have `notch: 'none'`)

**Scaling recalculation:**
- Uses swapped dimensions for scale factor
- `deviceTotalWidth` in landscape = `preset.height + preset.bezel * 2`

### Implementation

Modify these methods in `src/browser-window.js`:

- `_deviceCSS(preset)` — swap `--device-width`/`--device-height` based on orientation; add landscape-specific CSS for repositioned chrome
- `_deviceChrome(preset)` — add `.landscape` class to `.device-frame`; conditionally swap Dynamic Island to vertical orientation
- `_updateDeviceScale()` — use effective dimensions instead of raw preset values
- Add `_getEffectiveDimensions(preset)` helper

### Tablet Landscape Considerations

iPad Air at 1180×820 landscape is very wide. Cap the rendered width at the container width and scale down further. The scaling logic already handles this via `Math.min(1, hostWidth / deviceTotalWidth)`, but test that very wide aspect ratios don't cause layout issues.

## Safe Area Injection

### `_injectSafeAreas(iframe, preset)`

After the iframe loads, inject a `<style>` element into the iframe document setting CSS custom properties for safe area insets:

```js
_injectSafeAreas(iframe, preset) {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const [top, right, bottom, left] = this._getEffectiveSafeInsets(preset);
    const style = doc.createElement('style');
    style.setAttribute('data-browser-window-safe-areas', '');
    style.textContent = `
      :root {
        --safe-top: ${top}px;
        --safe-right: ${right}px;
        --safe-bottom: ${bottom}px;
        --safe-left: ${left}px;
      }
    `;
    doc.head.appendChild(style);
  } catch (e) {
    // Cross-origin iframe — skip with info message
    console.info('<browser-window>: Cannot inject safe areas into cross-origin iframe');
  }
}

_getEffectiveSafeInsets(preset) {
  const [t, r, b, l] = preset.safeInsets;
  if (this.getAttribute('orientation') === 'landscape') {
    return [l, t, r, b]; // Rotated
  }
  return [t, r, b, l];
}
```

**Wiring:** Call from the iframe `load` event handler in `attachEventListeners()` and `_syncIframeColorScheme()` when device mode is active.

**Same-origin only:** The `try/catch` handles cross-origin frames. Only our `/docs/` demos (same-origin) get injection.

## Safe Area Overlay

### `show-safe-areas` Attribute

When present, renders translucent colored bands over the iframe content at safe area boundaries.

**HTML structure** (added inside `.device-frame`, after `.browser-content`):
```html
<div class="safe-area-overlays">
  <div class="safe-area-overlay safe-area-top"></div>
  <div class="safe-area-overlay safe-area-right"></div>
  <div class="safe-area-overlay safe-area-bottom"></div>
  <div class="safe-area-overlay safe-area-left"></div>
</div>
```

**CSS:**
```css
.safe-area-overlays {
  position: absolute;
  top: var(--status-bar-height);
  left: 0;
  right: 0;
  bottom: var(--home-indicator-height);
  pointer-events: none;
  z-index: 2;
}

.safe-area-overlay {
  position: absolute;
  background: var(--browser-window-safe-area-color, oklch(0.65 0.2 250 / 0.25));
}

.safe-area-top {
  top: 0; left: 0; right: 0;
  height: calc(var(--safe-top, 0) * 1px);
}

.safe-area-right {
  top: 0; right: 0; bottom: 0;
  width: calc(var(--safe-right, 0) * 1px);
}

.safe-area-bottom {
  bottom: 0; left: 0; right: 0;
  height: calc(var(--safe-bottom, 0) * 1px);
}

.safe-area-left {
  top: 0; left: 0; bottom: 0;
  width: calc(var(--safe-left, 0) * 1px);
}
```

**Implementation:** Add safe area overlay HTML conditionally in `_deviceChrome()` when `this.hasAttribute('show-safe-areas')`. Set `--safe-top/right/bottom/left` CSS custom properties from the preset's `safeInsets` (rotated if landscape).

## Android Navigation

Modern Android uses gesture navigation only (no buttons). Phase 1 already renders this correctly — the home indicator pill serves as the gesture hint. No changes needed for Phase 2.

## Preset Data (from Phase 1)

Phase 2 builds on the existing `DEVICE_PRESETS` — specifically the `safeInsets` arrays already stored in each preset:

```js
// Already defined in Phase 1:
'iphone-16':        { safeInsets: [59, 0, 34, 0], ... }
'iphone-16-pro-max': { safeInsets: [59, 0, 34, 0], ... }
'iphone-se':        { safeInsets: [20, 0, 0, 0], ... }
'pixel-9':          { safeInsets: [48, 0, 24, 0], ... }
'pixel-9-pro-xl':   { safeInsets: [48, 0, 24, 0], ... }
'galaxy-s24':       { safeInsets: [48, 0, 24, 0], ... }
'ipad-air':         { safeInsets: [24, 0, 20, 0], ... }
'ipad-pro-13':      { safeInsets: [24, 0, 20, 0], ... }
'ipad-mini':        { safeInsets: [24, 0, 20, 0], ... }
```

## Tests to Add

Add to `test/browser-window.spec.js` in a new `test.describe('device mode phase 2', ...)` block:

### Orientation Tests
- Landscape dimensions: iframe width = preset.height, iframe height = preset.width
- Dynamic Island repositioned to left edge in landscape (vertical pill)
- Home indicator repositioned to right edge in landscape
- Status bar repositioned in landscape
- Scaling uses swapped dimensions
- Tablet landscape stays within container bounds

### Safe Area Injection Tests
- `--safe-top/right/bottom/left` CSS variables present in same-origin iframe document
- Values match preset's `safeInsets` in portrait
- Values rotate correctly in landscape
- Cross-origin iframe: no error thrown, console.info message logged

### Safe Area Overlay Tests
- Four overlay elements present when `show-safe-areas` attribute set
- Overlay elements absent when attribute not set
- Overlay dimensions match safe area values
- Overlays scale correctly with device scaling
- Overlay color customizable via `--browser-window-safe-area-color`

### Test Page Fixtures

Add to `test/test-page.html`:
```html
<browser-window id="device-landscape" device="iphone-16" orientation="landscape" src="../docs/example.html"></browser-window>
<browser-window id="device-safe-areas" device="iphone-16" show-safe-areas src="../docs/example.html"></browser-window>
<browser-window id="device-landscape-tablet" device="ipad-air" orientation="landscape" src="../docs/example.html"></browser-window>
```

## File Changes Summary

| File | Changes |
|---|---|
| `src/browser-window.js` | Add `orientation`, `show-safe-areas` to `observedAttributes`; add `_getEffectiveDimensions()`, `_getEffectiveSafeInsets()`, `_injectSafeAreas()`; modify `_deviceCSS()`, `_deviceChrome()`, `_updateDeviceScale()` for landscape; add safe area overlay CSS/HTML |
| `test/test-page.html` | Add landscape and safe-area test fixtures |
| `test/browser-window.spec.js` | Add Phase 2 test suite |
