# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript web component (`<browser-window>`) that renders a Safari-style browser window frame for demos and tutorials. It extends Zack Leatherman's original component with source viewing, maximize/expand mode, device mode bezels, and sharing capabilities.

## Development

```bash
# Start Vite dev server (opens docs site with hot reload)
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Build for production
npm run build

# Regenerate custom-elements.json manifest
npm run analyze
```

The docs pages (`/docs/*.html`) automatically load from `/src/browser-window.js` on localhost (live source) and from unpkg in production. No need to publish to npm to preview changes.

## Architecture

Single-file web component (`src/browser-window.js`) using Shadow DOM. The component:

- Uses `src` attribute to load external HTML files in an iframe
- Fetches and displays source code when "View Source" is toggled
- Supports maximize mode with overlay backdrop (Escape to close)
- Exports to CodePen via form POST to their API
- Supports light/dark mode via `mode` attribute with auto-detection
- Device mode renders phone/tablet bezels with status bar, notch, and home indicator
- Compact icon toolbar in device mode for source/share/download

**Key attributes:** `url`, `title`, `mode`, `shadow`, `src`, `device`, `device-color`, `orientation`, `show-safe-areas`

**State properties:** `isMinimized`, `isMaximized`, `showSource`, `showShareMenu`

**CSS custom properties:** 30+ tokens for theming. Integrates with Vanilla Breeze design tokens (`--radius-*`, `--color-*`).
