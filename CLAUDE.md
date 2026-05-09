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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
