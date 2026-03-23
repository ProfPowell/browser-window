/**
 * Browser Window Web Component
 * Creates a Safari-style browser window frame for demonstrations.
 *
 * @element browser-window
 */
export class BrowserWindow extends HTMLElement {
  /** URL to display in the address bar */
  url: string

  /** Title shown in the URL bar (defaults to hostname from url) */
  browserTitle: string

  /** Path to HTML file to load in iframe */
  src: string

  /** Color scheme - 'light', 'dark', or resolved from system/page signals */
  mode: string

  /** Named device preset (e.g., 'iphone-16', 'pixel-9', 'ipad-air') */
  device: string

  /** Device bezel color preset ('midnight', 'silver', 'gold', 'blue', 'white') */
  deviceColor: string

  /** Whether the window has a drop shadow */
  readonly hasShadow: boolean

  /** Whether the window is currently minimized */
  isMinimized: boolean

  /** Whether the window is currently maximized */
  isMaximized: boolean

  /** Whether source code view is currently showing */
  showSource: boolean

  /** The fetched source code content */
  sourceCode: string

  /** Whether the share menu is currently open */
  showShareMenu: boolean

  /** The maximize overlay element (when maximized) */
  overlay: HTMLDivElement | null

  /** Extract hostname from the URL */
  getHostname(): string

  /** Fetch source code from the src attribute */
  fetchSourceCode(): Promise<void>

  /** Toggle between rendered content and source code view */
  toggleViewSource(): void

  /** Copy source code to clipboard */
  copySourceCode(): Promise<void>

  /** Toggle the share menu visibility */
  toggleShareMenu(): void

  /** Share via Web Share API */
  shareViaWebAPI(): Promise<void>

  /** Parse HTML content for CodePen export */
  parseHTMLForCodePen(): { html: string; css: string; js: string } | null

  /** Open demo in CodePen */
  openInCodePen(): void

  /** Toggle minimize state */
  toggleMinimize(): void

  /** Toggle maximize state */
  toggleMaximize(): void

  /** Re-render the component */
  render(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'browser-window': BrowserWindow
  }
}
