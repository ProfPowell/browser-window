# Device Mode for `<browser-window>`

The `/docs/mobile/` guide embeds four mobile demos inside `<browser-window>`. On desktop the component renders full-width macOS Safari chrome — traffic lights, URL bar, share button — which does nothing to convey a phone-sized viewport. Visitors see a wide desktop frame and have to imagine the mobile experience.

We need `<browser-window>` to render a phone or tablet bezel instead of browser chrome, constraining the iframe to real device dimensions so mobile demos look like mobile demos.

## Approach: Extend, Don't Fork

Add a `device` attribute to the existing component. When absent, behavior is unchanged — Safari chrome renders exactly as today. When set to a named preset (`device="iphone-16"`, `device="pixel-9"`), the component renders device chrome instead: bezel frame, status bar, notch or Dynamic Island, home indicator, and the iframe sized to real device logical pixels.

This avoids a second component. The iframe machinery, source view, CodePen export, share menu, dark mode sync, error recovery, and lazy loading all stay in place. Only the chrome layer around the iframe changes.

## API Additions

Four new observed attributes join the existing five (`url`, `title`, `mode`, `shadow`, `src`):

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `device` | Named preset string | _(none)_ | Switches to device chrome mode. Omitting = browser mode. |
| `orientation` | `portrait`, `landscape` | `portrait` | Device orientation. Swaps width/height and repositions chrome elements. |
| `device-color` | Named color preset | `midnight` | Bezel and frame color. |
| `show-safe-areas` | Boolean attribute | _(absent)_ | Draws translucent overlay bands showing safe area insets. |

Backward compatibility: no `device` attribute = existing browser chrome. Zero changes to current behavior.

## Device Presets

Nine named presets covering the devices students and reviewers are most likely to recognize. All dimensions are CSS logical pixels (not physical).

| Preset | Device | Width | Height | Bezel | Notch Type | Corner Radius | Safe Insets (T/R/B/L) |
|---|---|---|---|---|---|---|---|
| `iphone-16` | iPhone 16 | 393 | 852 | 12px | Dynamic Island | 55px | 59/0/34/0 |
| `iphone-16-pro-max` | iPhone 16 Pro Max | 440 | 956 | 12px | Dynamic Island | 55px | 59/0/34/0 |
| `iphone-se` | iPhone SE (3rd) | 375 | 667 | 12px | Home button | 0px | 20/0/0/0 |
| `pixel-9` | Pixel 9 | 412 | 923 | 10px | Punch-hole | 48px | 48/0/24/0 |
| `pixel-9-pro-xl` | Pixel 9 Pro XL | 448 | 998 | 10px | Punch-hole | 48px | 48/0/24/0 |
| `galaxy-s24` | Galaxy S24 | 360 | 780 | 10px | Punch-hole | 40px | 48/0/24/0 |
| `ipad-air` | iPad Air (M3) | 820 | 1180 | 16px | None | 18px | 24/0/20/0 |
| `ipad-pro-13` | iPad Pro 13″ | 1032 | 1376 | 16px | None | 18px | 24/0/20/0 |
| `ipad-mini` | iPad mini (A17) | 744 | 1133 | 16px | None | 18px | 24/0/20/0 |

Presets are stored as a plain object map inside the component — no external JSON file, no dynamic import. Unrecognized `device` values log a console warning and fall back to `iphone-16`.

## Render Branching

The current `render()` method writes all CSS and HTML into `shadowRoot.innerHTML` via template literals. The device-mode extension adds a branch at the top of the HTML output:

```js
render() {
  const device = this.getAttribute('device');
  const css = device ? this._deviceCSS() : this._browserCSS();
  const chrome = device ? this._deviceChrome() : this._browserChrome();

  this.shadowRoot.innerHTML = `
    <style>${this._sharedCSS()}${css}</style>
    ${chrome}
    <div class="browser-content" part="content">
      ${this._contentHTML()}
    </div>
  `;
  // … existing post-render setup (iframe, event listeners, etc.)
}
```

### What stays shared

- `_contentHTML()` — iframe, slotted content, source view panel, share menu
- `_sharedCSS()` — content area, iframe sizing, source view, share menu, dark mode variables, font stacks
- Post-render logic — iframe lazy loading, error recovery, source fetching, CodePen export, keyboard handlers
- Dark mode — 3-tier detection (explicit `mode` attr → page-level MutationObserver → OS media query) applies to device chrome just as it does to browser chrome

### What's different per mode

| Concern | Browser mode (`_browserChrome`) | Device mode (`_deviceChrome`) |
|---|---|---|
| Top bar | Traffic lights + URL bar + share button | Status bar (time, signal, wifi, battery) |
| Frame | Header border + optional shadow | Bezel frame with rounded corners |
| Controls | Minimize, maximize, source, share | Source, share (in a small toolbar below the bezel) |
| Bottom | None | Home indicator bar (phones) |

## CSS Architecture for Device Chrome

Everything is CSS — no images, no SVGs, no icon fonts.

### Bezel frame

The outer device frame is a container `div` with:
- `border-radius` matching the preset's corner radius
- `border` at the preset's bezel width
- `background` set by `--browser-window-bezel-color` (defaults to the `device-color` attribute mapping)
- Inner `border-radius` calculated as `outer-radius - bezel-width`

```css
.device-frame {
  border: var(--device-bezel) solid var(--browser-window-bezel-color, #1a1a1a);
  border-radius: var(--device-corner-radius);
  overflow: hidden;
  position: relative;
  width: calc(var(--device-width) + var(--device-bezel) * 2);
}
```

### Dynamic Island (iPhone 16 series)

A `::before` pseudo-element on the status bar:

```css
.status-bar::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 50%;
  translate: -50% 0;
  width: 126px;
  height: 37px;
  background: var(--browser-window-bezel-color, #1a1a1a);
  border-radius: 19px;
}
```

### Punch-hole camera (Pixel, Galaxy)

A smaller circular `::before`:

```css
.status-bar.punch-hole::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  translate: -50% 0;
  width: 12px;
  height: 12px;
  background: var(--browser-window-bezel-color, #1a1a1a);
  border-radius: 50%;
}
```

### Home button (iPhone SE)

A `::after` pseudo-element on the device frame:

```css
.device-frame.home-button::after {
  content: '';
  position: absolute;
  bottom: 16px;
  left: 50%;
  translate: -50% 0;
  width: 58px;
  height: 58px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}
```

### Status bar icons

CSS-only shapes for signal bars, wifi arcs, and battery indicator. These are decorative chrome — they don't need to be pixel-perfect, just recognizable at a glance.

**Signal bars** — four inline-block spans with increasing heights:

```css
.signal-bars span {
  display: inline-block;
  width: 3px;
  background: currentColor;
  border-radius: 1px;
  margin-inline-end: 1px;
}
.signal-bars span:nth-child(1) { height: 4px; }
.signal-bars span:nth-child(2) { height: 6px; }
.signal-bars span:nth-child(3) { height: 8px; }
.signal-bars span:nth-child(4) { height: 10px; }
```

**Wifi** — three nested box-shadow arcs on a pseudo-element.

**Battery** — a small rectangle with a 2px cap on the right end, fill width proportional (always shown "full" — this is decorative).

### Home indicator

A thin pill at the bottom center of phone presets:

```css
.home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  translate: -50% 0;
  width: 134px;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
```

### Device color presets

The `device-color` attribute maps to a bezel color value:

| Preset Name | Hex | Notes |
|---|---|---|
| `midnight` | `#1a1a1a` | Default. Near-black. |
| `silver` | `#c0c0c0` | Light aluminum. |
| `gold` | `#d4a574` | Warm gold. |
| `blue` | `#3a4f6f` | Muted navy. |
| `white` | `#f0f0f0` | Off-white. |

## Scaling

Device presets define dimensions in CSS logical pixels. A 393×852 iPhone 16 would overflow most page layouts at 1:1. The component scales the device frame to fit its container using `transform: scale()`.

### How it works

1. The iframe renders at the device's native logical resolution (e.g., 393×852) — this is important because the content inside should respond to the real device width for media queries and container queries to fire correctly.

2. The outer `.device-wrapper` gets `transform-origin: top center` and a `scale()` value calculated as:

```js
const wrapperWidth = this._deviceWrapper.clientWidth;
const deviceWidth = preset.width + (preset.bezel * 2);
const scale = Math.min(1, wrapperWidth / deviceWidth);
this._deviceWrapper.style.transform = `scale(${scale})`;
this._deviceWrapper.style.height = `${(preset.height + preset.bezel * 2 + statusBarHeight + homeIndicatorHeight) * scale}px`;
```

3. A `ResizeObserver` on the host element recalculates the scale when the container resizes (responsive layouts, maximize mode, window resize).

4. The host element's height is set explicitly to the scaled device height so surrounding layout doesn't collapse or overflow.

### Why `transform: scale()` instead of CSS `zoom` or container sizing

- `transform` doesn't affect the iframe's internal layout — the iframe still sees 393px width, so `@media (max-width: 400px)` fires correctly inside the demo.
- CSS `zoom` would change the iframe's effective viewport, defeating the purpose of device simulation.
- Sizing the iframe smaller via CSS width would also change the viewport the content sees.

## Safe Area Injection

After the iframe loads, the component injects a `<style>` element into the iframe document overriding VB's safe-area custom properties:

```js
_injectSafeAreas(iframe, preset) {
  const doc = iframe.contentDocument;
  if (!doc) return; // cross-origin, skip

  const style = doc.createElement('style');
  style.textContent = `
    :root {
      --safe-top: ${preset.safeInsets[0]}px;
      --safe-right: ${preset.safeInsets[1]}px;
      --safe-bottom: ${preset.safeInsets[2]}px;
      --safe-left: ${preset.safeInsets[3]}px;
    }
  `;
  doc.head.appendChild(style);
}
```

This only works for same-origin iframes (which all our `/docs/` demos are). Cross-origin frames skip injection silently.

### `show-safe-areas` overlay

When the `show-safe-areas` boolean attribute is present, translucent colored bands are drawn over the iframe content at the safe area boundaries. These are absolutely positioned elements inside the `.browser-content` container (not inside the iframe):

```css
.safe-area-overlay-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--safe-top) * var(--device-scale, 1));
  background: oklch(0.65 0.2 250 / 0.25);
  pointer-events: none;
}
```

Four overlay bands (top, right, bottom, left), each scaled by the current device scale factor so they line up visually with the content beneath.

## Orientation

`orientation="landscape"` swaps the device's width and height and repositions chrome elements. This is a layout swap, not a CSS rotation — the iframe width becomes the device height and vice versa.

### What changes in landscape

- Iframe dimensions swap: `width: preset.height, height: preset.width`
- Status bar moves to a horizontal strip (phones) or stays at top (tablets)
- Home indicator moves to the right edge (phones) or bottom (tablets)
- Dynamic Island / punch-hole repositions to the left edge
- Safe area insets rotate: `[T,R,B,L]` → `[L,T,R,B]`
- The scaling calculation uses the swapped dimensions

### What stays the same

- All interactive features (source view, share, etc.)
- Dark mode sync
- Device color and bezel rendering (just repositioned)

## New CSS Custom Properties

Added alongside the existing 17 browser-mode custom properties:

| Property | Default | Purpose |
|---|---|---|
| `--browser-window-bezel-color` | `#1a1a1a` | Device frame / bezel color |
| `--browser-window-status-bar-color` | `rgba(255,255,255,0.9)` | Status bar text/icon color |
| `--browser-window-status-bar-bg` | `transparent` | Status bar background |
| `--browser-window-home-indicator-color` | `rgba(255,255,255,0.3)` | Home indicator pill color |
| `--browser-window-safe-area-color` | `oklch(0.65 0.2 250 / 0.25)` | Safe area overlay tint |

Dark mode flips `--browser-window-status-bar-color` to `rgba(255,255,255,0.9)` (white on dark) in the dark palette, matching the existing dark-mode variable swap pattern in the component.

## Implementation Phases

### Phase 1: MVP — Portrait Phones

- Add `device` attribute to `observedAttributes`
- Implement preset map (all 9 presets, geometry only)
- Refactor `render()` to branch on `this.getAttribute('device')`
- Extract shared CSS and content HTML into helper methods
- Build device chrome template: bezel, status bar (with Dynamic Island / punch-hole / home button variants), home indicator
- Implement `transform: scale()` with `ResizeObserver`
- Add `device-color` attribute with 5 presets
- Tests: Playwright tests for render, attribute changes, scaling, dark mode in device mode
- Build: verify Vite library build still produces single ES module

### Phase 2: Enhanced

- `orientation="landscape"` support with dimension swap and chrome repositioning
- Safe area injection into same-origin iframes
- `show-safe-areas` overlay rendering
- Tablet presets verified at landscape aspect ratios
- Additional Playwright tests for orientation and safe areas

### Phase 3: Polish

- Device picker demo page in the browser-window docs (`docs/device-mode.html`)
- Interactive orientation toggle button on the device frame toolbar
- Animated orientation transition (frame rotates, iframe resizes)
- Accessibility: announce device type and orientation to screen readers via `aria-label`

## Testing Strategy

Tests live in `test/browser-window.spec.js` (currently 380 lines, ~44 tests). The existing Playwright config runs against Vite dev server on port 5174.

### New test sections

- **Device rendering** — verify device chrome appears when `device` attribute set, browser chrome appears when absent
- **Preset geometry** — verify iframe dimensions match preset values for each of the 9 presets
- **Scaling** — verify `transform: scale()` is applied and recalculates on container resize
- **Device color** — verify bezel color changes with `device-color` attribute
- **Orientation** — verify dimension swap and chrome repositioning in landscape
- **Safe area injection** — verify `--safe-top/right/bottom/left` values in iframe document
- **Safe area overlay** — verify overlay elements appear when `show-safe-areas` present
- **Dark mode in device mode** — verify 3-tier dark mode applies to device chrome
- **Backward compatibility** — verify no regressions in browser mode (run all existing tests unchanged)

### Test page additions

Add new test sections to `test/test-page.html`:

```html
<section id="device-default">
  <browser-window device="iphone-16" src="test-content.html">
  </browser-window>
</section>

<section id="device-landscape">
  <browser-window device="iphone-16" orientation="landscape" src="test-content.html">
  </browser-window>
</section>

<section id="device-tablet">
  <browser-window device="ipad-air" src="test-content.html">
  </browser-window>
</section>

<section id="device-safe-areas">
  <browser-window device="iphone-16" show-safe-areas src="test-content.html">
  </browser-window>
</section>
```

## Open Questions

1. **Tablet landscape aspect ratios** — iPad Air at 1180×820 landscape is very wide. Should the component cap the max-width or allow horizontal scroll? Leaning toward capping at container width and scaling down further.

2. **Android navigation bar variants** — Android has 3-button nav, 2-button nav, and gesture nav. Should we render a nav bar at the bottom for Android presets, or keep it simple with just the home indicator? Leaning toward gesture-nav only (no buttons) since that's the modern default.

3. **Status bar content** — Should the time, carrier name, or battery percentage be customizable via attributes? Probably not — static decorative content ("9:41", full signal, full battery) is sufficient. Real status bar data would be misleading.

4. **Notch vs. Dynamic Island** — Older iPhones (12–14) had a wider notch. Should we add presets for those? Only if there's a demo need. The current preset list covers current-generation devices.

5. **Cross-origin iframe safe areas** — For cross-origin content, safe area injection can't work. Should the component show a warning, or silently skip? Leaning toward silent skip with a console info message, matching the existing error recovery pattern.
