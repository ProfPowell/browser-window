/**
 * Browser Window Web Component
 * Creates a Safari-style browser window frame for demonstrations
 * Based on @zachleat/browser-window but expanded for tutorial use
 *
 * @element browser-window
 * @attr {string} url - URL to display in the address bar
 * @attr {string} title - Title shown in the URL bar (defaults to hostname)
 * @attr {string} src - Path to HTML file to load in iframe
 * @attr {'light'|'dark'} mode - Color scheme (default: 'light')
 * @attr {boolean} shadow - Whether to show drop shadow
 *
 * @csspart header - The browser header/toolbar
 * @csspart content - The content area
 *
 * @cssprop [--browser-window-bg=#ffffff] - Background color
 * @cssprop [--browser-window-header-bg=#f6f8fa] - Header background
 * @cssprop [--browser-window-border-color=#d1d5da] - Border color
 * @cssprop [--browser-window-border-radius=8px] - Border radius
 * @cssprop [--browser-window-text-color=#24292e] - Primary text color
 * @cssprop [--browser-window-text-muted=#586069] - Muted text color
 * @cssprop [--browser-window-accent-color=#2563eb] - Accent color for active states
 *
 * @example
 * <browser-window url="https://example.com" title="Demo">
 *   <img src="screenshot.png" alt="Demo">
 * </browser-window>
 */
export class BrowserWindow extends HTMLElement {
    static get observedAttributes(): string[];
    isMinimized: boolean;
    isMaximized: boolean;
    overlay: HTMLDivElement | null;
    showSource: boolean;
    sourceCode: string;
    showShareMenu: boolean;
    handleKeydown(event: any): void;
    handleOutsideClick(e: any): void;
    connectedCallback(): Promise<void>;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get url(): string;
    get src(): string;
    get browserTitle(): string;
    get mode(): string;
    get hasShadow(): boolean;
    getHostname(): string;
    attachEventListeners(): void;
    handleIframeError(): void;
    retryLoad(): void;
    fetchSourceCode(): Promise<void>;
    toggleViewSource(): void;
    updateContentView(): void;
    copySourceCode(): Promise<void>;
    toggleShareMenu(): void;
    shareViaWebAPI(): Promise<void>;
    parseHTMLForCodePen(): {
        html: any;
        css: string;
        js: string;
    } | null;
    openInCodePen(): void;
    handleClose(): void;
    createOverlay(): void;
    removeOverlay(): void;
    toggleMinimize(): void;
    toggleMaximize(): void;
    render(): void;
    escapeHtml(text: any): string;
}
