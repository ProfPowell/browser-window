# @ProfPowell/browser-window

A Safari-style browser window web component for demos and tutorials. Features source code viewing, full-screen expand mode, CodePen export, automatic theme detection, and full theming support.

**[View Documentation](https://profpowell.github.io/browser-window/)** | **[Live Demos](https://profpowell.github.io/browser-window/demos.html)** | **[API Reference](https://profpowell.github.io/browser-window/api.html)**

Based on [@zachleat/browser-window](https://github.com/zachleat/browser-window) with significant enhancements.

## Installation

### npm

```bash
npm install @profpowell/browser-window
```

```javascript
import '@profpowell/browser-window';
```

### CDN

```html
<!-- unpkg -->
<script type="module" src="https://unpkg.com/@profpowell/browser-window"></script>

<!-- jsdelivr -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@profpowell/browser-window"></script>
```

### Direct Download

```html
<script type="module" src="path/to/browser-window.js"></script>
```

## Usage

### Basic Usage

```html
<browser-window url="https://example.com" title="My Demo">
  <img src="screenshot.png" alt="Demo screenshot">
</browser-window>
```

### Loading External HTML

```html
<browser-window
  src="demos/my-demo.html"
  url="https://example.com"
  title="CSS Demo">
</browser-window>
```

### Dark Mode

The component automatically respects your system's `prefers-color-scheme` preference. You can also explicitly set the mode:

```html
<!-- Follows system preference (default) -->
<browser-window src="demo.html"></browser-window>

<!-- Always light -->
<browser-window mode="light" src="demo.html"></browser-window>

<!-- Always dark -->
<browser-window mode="dark" src="demo.html" shadow></browser-window>
```

### Resizable

The component is resizable by default. Drag the bottom-right corner to resize:

```html
<!-- Set initial size with CSS -->
<browser-window src="demo.html" style="height: 400px; width: 600px;">
</browser-window>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | `''` | URL to display in the address bar |
| `title` | string | hostname from url | Title shown in the URL bar |
| `src` | string | `''` | Path to HTML file to load in iframe (enables source viewing) |
| `mode` | `'light'` \| `'dark'` | auto | Color scheme. Omit to follow system preference |
| `shadow` | boolean | `false` | Add drop shadow to the window |

## Features

### Source Code Viewing
When `src` is set, a code icon appears in the URL bar. Click to toggle between the rendered content and syntax-highlighted source code.

### Maximize Mode
- **Double-click** the title bar to maximize/restore
- **Click the green button** to maximize
- **Press Escape** or click the overlay to restore
- Maximized windows display as a centered modal with backdrop

### Share Menu
When `src` is set, a share button provides:
- **Share...** - Native Web Share API (on supported devices)
- **Open in CodePen** - Export demo to CodePen with HTML/CSS/JS separated

### Download
Direct download link for the source HTML file.

### Automatic Theme Detection
The component automatically follows your operating system's light/dark mode preference using `prefers-color-scheme`. Set the `mode` attribute to override this behavior.

### Resizable Container
Drag the bottom-right corner to resize the component. The content area (iframe or source view) automatically adjusts to fill the available space. Resizing is disabled when maximized.

### Mobile-Friendly
- Touch-friendly control buttons with proper hit targets (44px minimum)
- Responsive layout that adapts to narrow screens
- URL bar text truncates gracefully on small screens

## CSS Custom Properties

All visual aspects can be customized via CSS custom properties:

```css
browser-window {
  --browser-window-bg: #ffffff;
  --browser-window-header-bg: #f6f8fa;
  --browser-window-border-color: #d1d5da;
  --browser-window-border-radius: 8px;
  --browser-window-text-color: #24292e;
  --browser-window-text-muted: #586069;
  --browser-window-url-bg: #ffffff;
  --browser-window-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --browser-window-close-color: #ff5f57;
  --browser-window-minimize-color: #febc2e;
  --browser-window-maximize-color: #28c840;
  --browser-window-accent-color: #2563eb;
  --browser-window-hover-bg: #f3f4f6;
  --browser-window-content-bg: #ffffff;
  --browser-window-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --browser-window-mono-font: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
```

### Custom Theme Example

```css
/* Purple theme */
browser-window.purple-theme {
  --browser-window-accent-color: #8b5cf6;
  --browser-window-header-bg: #faf5ff;
  --browser-window-border-color: #c4b5fd;
}
```

## Accessibility

- Full keyboard navigation with visible focus indicators
- ARIA labels on all interactive elements
- `role="dialog"` and `aria-modal` when maximized
- Respects `prefers-reduced-motion` for animations
- Escape key closes maximized view and menus
- Touch targets meet WCAG 2.1 minimum size requirements

## Browser Support

Works in all modern browsers that support Web Components:
- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Generate custom elements manifest
npm run analyze
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local dev server on port 3456 |
| `npm run build` | Build for production (JS + types) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run analyze` | Generate custom-elements.json manifest |

## Related Projects

- **[&lt;code-block&gt;](https://github.com/ProfPowell/code-block)** - Syntax-highlighted code block web component with copy button
- **[@zachleat/browser-window](https://github.com/zachleat/browser-window)** - The original component this project is based on

## License

MIT
