# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript web component (`<browser-window>`) that renders a Safari-style browser window frame for demos and tutorials. It extends Zack Leatherman's original component with source viewing, maximize/expand mode, and sharing capabilities.

## Development

No build step required. This is a vanilla ES module-based web component.

To test locally, serve the project with any static file server and open `demos/index.html`:
```bash
npx serve .
# Then open http://localhost:3000/demos/
```

## Architecture

Single-file web component (`browser-window.js`) using Shadow DOM. The component:

- Uses `src` attribute to load external HTML files in an iframe
- Fetches and displays source code when "View Source" is toggled
- Supports maximize mode with overlay backdrop (Escape to close)
- Exports to CodePen via form POST to their API
- Supports light/dark mode via `mode` attribute

**Key attributes:** `url`, `title`, `mode` (light/dark), `shadow`, `src`

**State properties:** `isMinimized`, `isMaximized`, `showSource`, `showShareMenu`
