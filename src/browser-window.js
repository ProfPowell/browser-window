/**
 * Browser Window Web Component
 * Creates a Safari-style browser window frame for demonstrations
 * Based on @zachleat/browser-window but expanded for tutorial use
 *
 * @element browser-window
 * @attr {string} url - URL to display in the address bar
 * @attr {string} title - Title shown in the URL bar (defaults to hostname)
 * @attr {string} src - Path to the HTML file to load in iframe
 * @attr {'light'|'dark'} mode - Color scheme. When omitted, auto-detects from page-level signals (body.dark, data-theme, data-bs-theme, color-scheme) then falls back to OS prefers-color-scheme.
 * @attr {boolean} shadow - Whether to show drop shadow
 * @attr {string} device - Named device preset for device chrome mode (e.g., 'iphone-16', 'pixel-9')
 * @attr {string} device-color - Device bezel color preset (midnight, silver, gold, blue, white)
 * @attr {'portrait'|'landscape'} orientation - Device orientation. Swaps width/height and repositions chrome.
 * @attr {boolean} show-safe-areas - Draw translucent overlay bands showing safe area insets
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
 * @cssprop [--browser-window-url-bg=#ffffff] - URL bar background color
 * @cssprop [--browser-window-shadow=0 4px 12px rgba(0,0,0,0.15)] - Drop shadow (when shadow attr is set)
 * @cssprop [--browser-window-close-color=#ff5f57] - Close button color
 * @cssprop [--browser-window-minimize-color=#febc2e] - Minimize button color
 * @cssprop [--browser-window-maximize-color=#28c840] - Maximize button color
 * @cssprop [--browser-window-accent-color=#2563eb] - Accent color for active states
 * @cssprop [--browser-window-hover-bg=#f3f4f6] - Hover background color for buttons
 * @cssprop [--browser-window-content-bg=#ffffff] - Content area background
 * @cssprop [--browser-window-font-family=-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif] - Font family
 * @cssprop [--browser-window-mono-font='Monaco', 'Menlo', 'Ubuntu Mono', monospace] - Monospace font for code
 * @cssprop [--browser-window-bezel-color=#1a1a1a] - Device frame/bezel color
 * @cssprop [--browser-window-status-bar-color=rgba(255,255,255,0.9)] - Status bar text/icon color
 * @cssprop [--browser-window-home-indicator-color=rgba(255,255,255,0.3)] - Home indicator pill color
 * @cssprop [--browser-window-safe-area-color=oklch(0.65 0.2 250 / 0.25)] - Safe area overlay tint
 *
 * @example
 * <browser-window url="https://example.com" title="Demo">
 *   <img src="screenshot.png" alt="Demo">
 * </browser-window>
 *
 * @example
 * <browser-window device="iphone-16" src="demo.html">
 * </browser-window>
 */

// --- Anti-FOUC: hide element until custom element is defined ---
if (typeof document !== 'undefined') {
  const _antiFlash = document.createElement('style');
  _antiFlash.textContent =
    'browser-window:not(:defined){display:block;opacity:0}';
  document.head.appendChild(_antiFlash);
}

// --- Page-level dark mode observer (shared singleton) ---
const _registeredInstances = new Set();
let _pageObserver = null;
let _currentPageDark = null;

function _detectPageDarkMode() {
  const html = document.documentElement;
  const body = document.body;
  if (!html || !body) return null;

  // Check class-based signals (Tailwind, docs sites)
  if (html.classList.contains('dark') || body.classList.contains('dark')) return true;

  // Check data-theme attribute
  if (html.getAttribute('data-theme') === 'dark' || body.getAttribute('data-theme') === 'dark')
    return true;
  if (html.getAttribute('data-theme') === 'light' || body.getAttribute('data-theme') === 'light')
    return false;

  // Check Bootstrap 5 data-bs-theme
  if (
    html.getAttribute('data-bs-theme') === 'dark' ||
    body.getAttribute('data-bs-theme') === 'dark'
  )
    return true;
  if (
    html.getAttribute('data-bs-theme') === 'light' ||
    body.getAttribute('data-bs-theme') === 'light'
  )
    return false;

  // Check Vanilla Breeze data-mode attribute
  if (html.getAttribute('data-mode') === 'dark') return true;
  if (html.getAttribute('data-mode') === 'light') return false;

  // Check computed color-scheme
  const colorScheme = getComputedStyle(html).colorScheme;
  if (colorScheme === 'dark') return true;
  if (colorScheme === 'light') return false;

  return null; // No page-level signal found
}

function _notifyInstances() {
  const newState = _detectPageDarkMode();
  if (newState === _currentPageDark) return;
  _currentPageDark = newState;

  for (const instance of _registeredInstances) {
    instance._onPageModeChange(newState);
  }
}

function _startObserving() {
  if (_pageObserver) return;

  _pageObserver = new MutationObserver(_notifyInstances);

  const observeOptions = {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-bs-theme', 'data-mode', 'style'],
  };

  _pageObserver.observe(document.documentElement, observeOptions);
  if (document.body) {
    _pageObserver.observe(document.body, observeOptions);
  }
}

function _stopObserving() {
  if (_pageObserver) {
    _pageObserver.disconnect();
    _pageObserver = null;
  }
}

function _registerInstance(instance) {
  _registeredInstances.add(instance);
  if (_registeredInstances.size === 1) {
    _startObserving();
  }
  // Apply current state immediately
  const state = _detectPageDarkMode();
  _currentPageDark = state;
  instance._onPageModeChange(state);
}

function _unregisterInstance(instance) {
  _registeredInstances.delete(instance);
  if (_registeredInstances.size === 0) {
    _stopObserving();
    _currentPageDark = null;
  }
}

// --- Device preset data ---
const DEVICE_PRESETS = {
  'iphone-16': {
    width: 393,
    height: 852,
    bezel: 12,
    notch: 'dynamic-island',
    cornerRadius: 55,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [59, 0, 34, 0],
  },
  'iphone-16-pro-max': {
    width: 440,
    height: 956,
    bezel: 12,
    notch: 'dynamic-island',
    cornerRadius: 55,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [59, 0, 34, 0],
  },
  'iphone-se': {
    width: 375,
    height: 667,
    bezel: 12,
    notch: 'none',
    cornerRadius: 0,
    homeIndicator: false,
    homeButton: true,
    safeInsets: [20, 0, 0, 0],
  },
  'pixel-9': {
    width: 412,
    height: 923,
    bezel: 10,
    notch: 'punch-hole',
    cornerRadius: 48,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [48, 0, 24, 0],
  },
  'pixel-9-pro-xl': {
    width: 448,
    height: 998,
    bezel: 10,
    notch: 'punch-hole',
    cornerRadius: 48,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [48, 0, 24, 0],
  },
  'galaxy-s24': {
    width: 360,
    height: 780,
    bezel: 10,
    notch: 'punch-hole',
    cornerRadius: 40,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [48, 0, 24, 0],
  },
  'ipad-air': {
    width: 820,
    height: 1180,
    bezel: 16,
    notch: 'none',
    cornerRadius: 18,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [24, 0, 20, 0],
  },
  'ipad-pro-13': {
    width: 1032,
    height: 1376,
    bezel: 16,
    notch: 'none',
    cornerRadius: 18,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [24, 0, 20, 0],
  },
  'ipad-mini': {
    width: 744,
    height: 1133,
    bezel: 16,
    notch: 'none',
    cornerRadius: 18,
    homeIndicator: true,
    homeButton: false,
    safeInsets: [24, 0, 20, 0],
  },
};

const DEVICE_COLORS = {
  midnight: '#1a1a1a',
  silver: '#c0c0c0',
  gold: '#d4a574',
  blue: '#3a4f6f',
  white: '#f0f0f0',
};

const STATUS_BAR_HEIGHT = {
  'dynamic-island': 54,
  'punch-hole': 36,
  none: 24,
};

const HOME_INDICATOR_HEIGHT = 28;
const HOME_BUTTON_AREA = 80;

// Shared fadeIn animation — injected once into document.head
let _fadeInStyleInjected = false;

export class BrowserWindow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isMinimized = false;
    this.isMaximized = false;
    this.overlay = null;
    this.showSource = false;
    this.sourceCode = '';
    this.showShareMenu = false;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this._resizeObserver = null;
    this._currentScale = 1;
    this._outsideClickTimer = null;
    this._copyFeedbackTimer = null;
  }

  async connectedCallback() {
    this.render();
    this.attachEventListeners();

    // Fetch source code if a src attribute is present
    if (this.src) {
      await this.fetchSourceCode();
    }

    _registerInstance(this);

    if (this._getDevicePreset()) {
      this._setupDeviceScaling();
    }
  }

  disconnectedCallback() {
    _unregisterInstance(this);
    this.removeOverlay();
    this._teardownDeviceScaling();
    clearTimeout(this._outsideClickTimer);
    clearTimeout(this._copyFeedbackTimer);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleOutsideClick);
  }

  static get observedAttributes() {
    return [
      'url',
      'title',
      'mode',
      'shadow',
      'src',
      'device',
      'device-color',
      'orientation',
      'show-safe-areas',
    ];
  }

  attributeChangedCallback(name) {
    if (this.shadowRoot) {
      this.render();
      this.attachEventListeners();
    }

    if (name === 'src') {
      this.showSource = false;
      this.sourceCode = '';
      if (this.src) {
        this.fetchSourceCode();
      }
    }

    if (name === 'device' || name === 'orientation') {
      this._teardownDeviceScaling();
      if (this._getDevicePreset()) {
        this._setupDeviceScaling();
      }
    }

    if (name === 'mode') {
      if (this.hasAttribute('mode')) {
        // Explicit mode set — remove page-level detection
        this.removeAttribute('data-page-mode');
      } else {
        // Mode removed — re-detect page-level signal
        this._onPageModeChange(_detectPageDarkMode());
      }
    }
  }

  get url() {
    return this.getAttribute('url') || '';
  }

  set url(value) {
    this.setAttribute('url', value);
  }

  get src() {
    return this.getAttribute('src') || '';
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  get browserTitle() {
    return this.getAttribute('title') || this.getHostname();
  }

  set browserTitle(value) {
    this.setAttribute('title', value);
  }

  get mode() {
    return (
      this.getAttribute('mode') ||
      this.getAttribute('data-page-mode') ||
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')
    );
  }

  set mode(value) {
    if (value) {
      this.setAttribute('mode', value);
    } else {
      this.removeAttribute('mode');
    }
  }

  get device() {
    return this.getAttribute('device') || '';
  }

  set device(value) {
    if (value) {
      this.setAttribute('device', value);
    } else {
      this.removeAttribute('device');
    }
  }

  get deviceColor() {
    return this.getAttribute('device-color') || 'midnight';
  }

  set deviceColor(value) {
    this.setAttribute('device-color', value);
  }

  _getDevicePreset() {
    const device = this.getAttribute('device');
    if (!device) return null;

    const preset = DEVICE_PRESETS[device];
    if (preset) return preset;

    console.warn(
      `<browser-window>: Unknown device preset "${device}", falling back to "iphone-16"`
    );
    return DEVICE_PRESETS['iphone-16'];
  }

  _getEffectiveDimensions(preset) {
    const isLandscape = this.getAttribute('orientation') === 'landscape';
    return {
      width: isLandscape ? preset.height : preset.width,
      height: isLandscape ? preset.width : preset.height,
    };
  }

  _getEffectiveSafeInsets(preset) {
    const [t, r, b, l] = preset.safeInsets;
    if (this.getAttribute('orientation') === 'landscape') {
      return [l, t, r, b];
    }
    return [t, r, b, l];
  }

  _onPageModeChange(isDark) {
    if (this.hasAttribute('mode')) {
      this.removeAttribute('data-page-mode');
      return;
    }
    if (isDark === true) {
      this.setAttribute('data-page-mode', 'dark');
    } else if (isDark === false) {
      this.setAttribute('data-page-mode', 'light');
    } else {
      this.removeAttribute('data-page-mode');
    }
    this._syncIframeColorScheme();
  }

  _syncIframeColorScheme() {
    const iframe = this.shadowRoot?.querySelector('iframe');
    if (!iframe) return;
    const isDark = this.mode === 'dark';
    try {
      const doc = iframe.contentDocument;
      if (doc?.documentElement) {
        doc.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      }
    } catch (_e) {
      // Cross-origin iframe — silently ignore
    }
  }

  _injectSafeAreas(iframe) {
    const preset = this._getDevicePreset();
    if (!preset) return;

    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Remove previously injected style if any
      const existing = doc.querySelector('style[data-browser-window-safe-areas]');
      if (existing) existing.remove();

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
    } catch (_e) {
      // Cross-origin iframe — skip silently
      console.info('<browser-window>: Cannot inject safe areas into cross-origin iframe');
    }
  }

  get hasShadow() {
    return this.hasAttribute('shadow');
  }

  getHostname() {
    try {
      const urlObj = new URL(this.url);
      return urlObj.hostname;
    } catch {
      return this.url;
    }
  }

  attachEventListeners() {
    const closeBtn = this.shadowRoot.querySelector('.control-button.close');
    const minimizeBtn = this.shadowRoot.querySelector('.control-button.minimize');
    const maximizeBtn = this.shadowRoot.querySelector('.control-button.maximize');
    const viewSourceBtn = this.shadowRoot.querySelector('.view-source-button');
    const copyBtn = this.shadowRoot.querySelector('.copy-source-button');
    const shareBtn = this.shadowRoot.querySelector('.share-button');
    const header = this.shadowRoot.querySelector('.browser-header');

    closeBtn?.addEventListener('click', () => this.handleClose());
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    maximizeBtn?.addEventListener('click', () => this.toggleMaximize());
    viewSourceBtn?.addEventListener('click', () => this.toggleViewSource());
    copyBtn?.addEventListener('click', () => this.copySourceCode());
    shareBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleShareMenu();
    });

    // Double-click on the header to maximize (except on interactive elements)
    header?.addEventListener('dblclick', (e) => {
      const target = e.target;
      if (target.closest('button, a, .share-menu')) return;
      this.toggleMaximize();
    });

    // Handle iframe load errors and sync color scheme
    const iframe = this.shadowRoot.querySelector('iframe');
    iframe?.addEventListener('error', () => this.handleIframeError());
    iframe?.addEventListener('load', () => {
      this._syncIframeColorScheme();
      if (this._getDevicePreset()) {
        this._injectSafeAreas(iframe);
      }
    });

    // Share menu actions (CSP-safe — no inline onclick)
    this.shadowRoot.querySelector('[data-action="share"]')
      ?.addEventListener('click', () => this.shareViaWebAPI());
    this.shadowRoot.querySelector('[data-action="codepen"]')
      ?.addEventListener('click', () => this.openInCodePen());

    // Retry button in error state
    this.shadowRoot.querySelector('.retry-button')
      ?.addEventListener('click', () => this.retryLoad());
  }

  handleIframeError() {
    const content = this.shadowRoot.querySelector('.browser-content');
    if (!content) return;

    content.innerHTML = `
      <div class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Failed to load content</p>
        <button class="retry-button">Retry</button>
      </div>
    `;
    content.querySelector('.retry-button')
      ?.addEventListener('click', () => this.retryLoad());
  }

  retryLoad() {
    const content = this.shadowRoot.querySelector('.browser-content');
    if (!content || !this.src) return;

    content.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>`;

    // Re-attach error handler and sync color scheme
    const iframe = content.querySelector('iframe');
    iframe?.addEventListener('error', () => this.handleIframeError());
    iframe?.addEventListener('load', () => this._syncIframeColorScheme());
  }

  async fetchSourceCode() {
    if (!this.src) return;

    try {
      const response = await fetch(this.src);
      if (response.ok) {
        this.sourceCode = await response.text();
      }
    } catch (error) {
      console.error('Failed to fetch source code:', error);
      this.sourceCode = '// Failed to load source code';
    }
  }

  toggleViewSource() {
    this.showSource = !this.showSource;
    this.updateContentView();
  }

  updateContentView() {
    const viewSourceBtn = this.shadowRoot.querySelector('.view-source-button');
    const isDeviceMode = !!this._getDevicePreset();

    if (isDeviceMode) {
      this._updateDeviceSourceView(viewSourceBtn);
    } else {
      this._updateBrowserSourceView(viewSourceBtn);
    }
  }

  _updateBrowserSourceView(viewSourceBtn) {
    const content = this.shadowRoot.querySelector('.browser-content');
    if (!content) return;

    if (this.showSource) {
      content.innerHTML = this._sourceViewHTML();
      viewSourceBtn?.classList.add('active');
      content.querySelector('.copy-source-button')
        ?.addEventListener('click', () => this.copySourceCode());
    } else {
      if (this.src) {
        content.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>`;
        const newIframe = content.querySelector('iframe');
        newIframe?.addEventListener('load', () => this._syncIframeColorScheme());
      } else {
        content.innerHTML = '<slot></slot>';
      }
      viewSourceBtn?.classList.remove('active');
    }
  }

  _updateDeviceSourceView(viewSourceBtn) {
    // Render source inside the device frame, replacing the iframe
    const content = this.shadowRoot.querySelector('.browser-content');
    if (!content) return;

    if (this.showSource) {
      content.innerHTML = this._sourceViewHTML();
      viewSourceBtn?.classList.add('active');
      content.querySelector('.copy-source-button')
        ?.addEventListener('click', () => this.copySourceCode());
    } else {
      if (this.src) {
        content.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>`;
        const newIframe = content.querySelector('iframe');
        newIframe?.addEventListener('load', () => {
          this._syncIframeColorScheme();
          if (this._getDevicePreset()) {
            this._injectSafeAreas(newIframe);
          }
        });
      } else {
        content.innerHTML = '<slot></slot>';
      }
      viewSourceBtn?.classList.remove('active');
    }
  }

  _sourceViewHTML() {
    return `
      <div class="source-view">
        <div class="source-header">
          <span class="source-label">Source Code</span>
          <button class="copy-source-button" title="Copy source code">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1"/>
              <path d="M3 11V3a1 1 0 011-1h8"/>
            </svg>
            Copy
          </button>
        </div>
        <pre><code>${this.escapeHtml(this.sourceCode)}</code></pre>
      </div>
    `;
  }

  async copySourceCode() {
    if (!this.sourceCode) return;

    try {
      await navigator.clipboard.writeText(this.sourceCode);

      // Show feedback
      const copyBtn = this.shadowRoot.querySelector('.copy-source-button');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3,8 6,11 13,4"/>
          </svg>
          Copied!
        `;
        copyBtn.classList.add('copied');

        clearTimeout(this._copyFeedbackTimer);
        this._copyFeedbackTimer = setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('copied');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy source code:', error);
    }
  }

  toggleShareMenu() {
    this.showShareMenu = !this.showShareMenu;
    const menu = this.shadowRoot?.querySelector('.share-menu');
    const shareBtn = this.shadowRoot?.querySelector('.share-button');

    if (!menu || !shareBtn) return;

    if (this.showShareMenu) {
      menu.style.display = 'block';
      shareBtn.classList.add('active');
      clearTimeout(this._outsideClickTimer);
      this._outsideClickTimer = setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    } else {
      menu.style.display = 'none';
      shareBtn.classList.remove('active');
      clearTimeout(this._outsideClickTimer);
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  handleOutsideClick(e) {
    const menu = this.shadowRoot.querySelector('.share-menu');
    if (menu && !menu.contains(e.target)) {
      this.toggleShareMenu();
    }
  }

  async shareViaWebAPI() {
    if (!navigator.share) {
      console.warn('Web Share API not supported');
      return;
    }

    const shareData = {
      title: this.browserTitle || 'CSS Demo',
      text: `Check out this CSS demo: ${this.browserTitle}`,
      url: this.src || this.url,
    };

    try {
      await navigator.share(shareData);
      this.toggleShareMenu();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  }

  parseHTMLForCodePen() {
    if (!this.sourceCode) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(this.sourceCode, 'text/html');

    // Extract CSS from style tags
    const styles = Array.from(doc.querySelectorAll('style'))
      .map((style) => style.textContent)
      .join('\n\n');

    // Extract JavaScript from script tags (excluding module imports)
    const scripts = Array.from(doc.querySelectorAll('script'))
      .filter((script) => !script.src && script.type !== 'module')
      .map((script) => script.textContent)
      .join('\n\n');

    // Extract HTML from the document body (excluding scripts and styles)
    const bodyClone = doc.body.cloneNode(true);
    bodyClone.querySelectorAll('script, style').forEach((el) => el.remove());
    const html = bodyClone.innerHTML;

    return {
      html: html.trim(),
      css: styles.trim(),
      js: scripts.trim(),
    };
  }

  openInCodePen() {
    const parsed = this.parseHTMLForCodePen();
    if (!parsed) return;

    const data = {
      title: this.browserTitle || 'CSS Demo',
      description: `Demo from ${this.url}`,
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
      editors: '110', // Show HTML and CSS editors, hide JS if empty
    };

    // Create a temporary form and submit to CodePen to send the data
    const form = document.createElement('form');
    form.action = 'https://codepen.io/pen/define';
    form.method = 'POST';
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(data);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    this.toggleShareMenu();
  }

  handleClose() {
    if (this.isMaximized) {
      this.toggleMaximize();
    }
    // Minimize (collapse) the content area
    if (!this.isMinimized) {
      this.toggleMinimize();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      if (this.showShareMenu) {
        this.toggleShareMenu();
      } else if (this.isMaximized) {
        this.toggleMaximize();
      }
    }
  }

  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: var(--browser-window-overlay-z-index, 9998);
      cursor: pointer;
      animation: fadeIn 200ms ease;
    `;

    // Add fade-in animation (once per page)
    if (!_fadeInStyleInjected) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      _fadeInStyleInjected = true;
    }

    this.overlay.addEventListener('click', () => this.toggleMaximize());
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.handleKeydown);
  }

  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    document.removeEventListener('keydown', this.handleKeydown);
  }

  toggleMinimize() {
    const content = this.shadowRoot.querySelector('.browser-content');
    if (!content) return;

    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      // Restore from maximized if needed
      if (this.isMaximized) {
        this.toggleMaximize();
      }
      content.style.display = 'none';
    } else {
      content.style.display = '';
    }
  }

  toggleMaximize() {
    const maximizeBtn = this.shadowRoot.querySelector('.control-button.maximize');

    if (this.isMaximized) {
      // Remove maximized class to restore the original state
      this.classList.remove('browser-window-maximized');
      this.removeAttribute('role');
      this.removeAttribute('aria-modal');
      this.removeAttribute('tabindex');

      // Reset iframe height if present
      const iframe = this.shadowRoot.querySelector('iframe');
      if (iframe) {
        iframe.style.minHeight = '';
      }

      // Remove overlay
      this.removeOverlay();

      this.isMaximized = false;

      // Restore focus to the element that triggered maximize
      if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
        this._previousFocus.focus();
        this._previousFocus = null;
      }

      // Update ARIA attributes
      if (maximizeBtn) {
        maximizeBtn.setAttribute('aria-label', 'Maximize window');
        maximizeBtn.setAttribute('aria-expanded', 'false');
      }
    } else {
      // Restore from minimized if needed
      if (this.isMinimized) {
        this.toggleMinimize();
      }

      // Create an overlay backdrop
      this.createOverlay();

      // Add maximized class for styling
      this.classList.add('browser-window-maximized');
      this.setAttribute('role', 'dialog');
      this.setAttribute('aria-modal', 'true');

      // Update iframe height if present
      const iframe = this.shadowRoot.querySelector('iframe');
      if (iframe) {
        iframe.style.minHeight = 'calc(90vh - 50px)';
      }

      this.isMaximized = true;
      this._previousFocus = document.activeElement;
      this.setAttribute('tabindex', '-1');
      this.focus();

      // Update ARIA attributes
      if (maximizeBtn) {
        maximizeBtn.setAttribute('aria-label', 'Restore window');
        maximizeBtn.setAttribute('aria-expanded', 'true');
      }
    }
  }

  // --- Render pipeline ---

  render() {
    const preset = this._getDevicePreset();
    const css = preset ? this._deviceCSS(preset) : this._browserCSS();
    const chrome = preset ? this._deviceChrome(preset) : this._browserChrome();

    this.shadowRoot.innerHTML = `
      <style>${this._sharedCSS()}${css}</style>
      ${chrome}
      ${preset ? '' : this._contentHTML()}
    `;

    if (preset) {
      this._updateDeviceScale();
    }
  }

  _darkPalette() {
    return `
            --_bw-bg: var(--color-surface, #1c1c1e);
            --_bw-header-bg: var(--color-surface-raised, #2c2c2e);
            --_bw-border-color: var(--color-border, #3a3a3c);
            --_bw-text-color: var(--color-text, #e5e5e7);
            --_bw-text-muted: var(--color-text-muted, #98989d);
            --_bw-url-bg: var(--color-surface, #1c1c1e);
            --_bw-hover-bg: #3a3a3c;
            --_bw-content-bg: var(--color-surface, #000000);
            color-scheme: dark;`;
  }

  _lightPalette() {
    return `
            --_bw-bg: var(--color-surface, #ffffff);
            --_bw-header-bg: var(--color-surface-raised, #f6f8fa);
            --_bw-border-color: var(--color-border, #d1d5da);
            --_bw-text-color: var(--color-text, #24292e);
            --_bw-text-muted: var(--color-text-muted, #586069);
            --_bw-url-bg: var(--color-surface, #ffffff);
            --_bw-hover-bg: #f3f4f6;
            --_bw-content-bg: var(--color-surface, #ffffff);
            color-scheme: light;`;
  }

  _sharedCSS() {
    return `
        :host {
          /* Internal defaults — external --browser-window-* overrides always win */
          --_bw-bg: var(--color-surface, #ffffff);
          --_bw-header-bg: var(--color-surface-raised, #f6f8fa);
          --_bw-border-color: var(--color-border, #d1d5da);
          --_bw-text-color: var(--color-text, #24292e);
          --_bw-text-muted: var(--color-text-muted, #586069);
          --_bw-url-bg: var(--color-surface, #ffffff);
          --_bw-hover-bg: #f3f4f6;
          --_bw-content-bg: var(--color-surface, #ffffff);

          /* Non-structural properties */
          --browser-window-border-radius: 8px;
          --browser-window-shadow: ${this.hasShadow ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'};
          --browser-window-close-color: #ff5f57;
          --browser-window-minimize-color: #febc2e;
          --browser-window-maximize-color: #28c840;
          --browser-window-accent-color: #2563eb;
          --browser-window-active-bg: #dbeafe;
          --browser-window-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --browser-window-mono-font: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

          display: flex;
          flex-direction: column;
          margin: 1rem 0;
          border-radius: var(--browser-window-border-radius);
          overflow: hidden;
          border: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          background: var(--browser-window-bg, var(--_bw-bg));
          box-shadow: var(--browser-window-shadow);
          transition: all 250ms ease-out;
          font-family: var(--browser-window-font-family);
          color: var(--browser-window-text-color, var(--_bw-text-color));
          color-scheme: light;

          /* Resizable container */
          resize: both;
          min-width: 280px;
          min-height: 150px;

        }

        /* Auto dark mode based on system preference (when no mode attribute) */
        @media (prefers-color-scheme: dark) {
          :host(:not([mode])) {
            ${this._darkPalette()}
          }
        }

        /* Page-level dark mode detection (overrides media query via higher specificity) */
        :host([data-page-mode="dark"]:not([mode])) {
          ${this._darkPalette()}
        }

        :host([data-page-mode="light"]:not([mode])) {
          ${this._lightPalette()}
        }

        /* Explicit dark mode override */
        :host([mode="dark"]) {
          ${this._darkPalette()}
        }

        /* Explicit light mode override (for users on dark system who want light) */
        :host([mode="light"]) {
          ${this._lightPalette()}
        }

        :host(.browser-window-maximized) {
          position: fixed !important;
          top: 5vh !important;
          left: 5vw !important;
          width: 90vw !important;
          height: 90vh !important;
          z-index: var(--browser-window-z-index, 9999) !important;
          margin: 0 !important;
          resize: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          :host {
            transition: none;
          }
        }

        .browser-content {
          background: var(--browser-window-content-bg, var(--_bw-content-bg));
          min-height: 200px;
          padding: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Slot fills available space */
        slot {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        /* Slotted content fills the slot */
        ::slotted(*) {
          flex: 1;
          width: 100%;
          min-height: 0;
        }

        iframe {
          display: block;
          width: 100%;
          border: none;
          flex: 1;
          min-height: 200px;
        }

        ::slotted(img),
        ::slotted(iframe) {
          display: block;
          border: none;
          margin: 0;
        }

        .source-view {
          padding: 0;
          background: var(--browser-window-header-bg, var(--_bw-header-bg));
          min-height: 0;
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
        }

        .source-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--browser-window-header-bg, var(--_bw-header-bg));
          border-bottom: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          backdrop-filter: blur(8px);
        }

        .source-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--browser-window-text-color, var(--_bw-text-color));
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .copy-source-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: var(--browser-window-bg, var(--_bw-bg));
          border: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          border-radius: 6px;
          color: var(--browser-window-text-color, var(--_bw-text-color));
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .copy-source-button:hover {
          background: var(--browser-window-hover-bg, var(--_bw-hover-bg));
        }

        .copy-source-button:active {
          transform: scale(0.97);
        }

        .copy-source-button.copied {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .source-view pre {
          margin: 0;
          padding: 1rem;
          background: var(--browser-window-content-bg, var(--_bw-content-bg));
          border: none;
          border-radius: 0;
          overflow-x: auto;
          flex: 1;
          font-family: var(--browser-window-mono-font);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .source-view code {
          color: var(--browser-window-text-color, var(--_bw-text-color));
          display: block;
          white-space: pre;
        }

        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          min-height: 200px;
        }

        .error-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .error-state p {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
        }

        .retry-button {
          padding: 0.5rem 1rem;
          background: var(--browser-window-accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 150ms ease;
        }

        .retry-button:hover {
          opacity: 0.9;
        }

        .retry-button:active {
          transform: scale(0.98);
        }

        .share-container {
          position: relative;
          display: inline-block;
        }

        .share-menu {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: var(--browser-window-header-bg, var(--_bw-header-bg));
          border: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 180px;
          z-index: var(--browser-window-menu-z-index, 1000);
          overflow: hidden;
        }

        .share-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.625rem 1rem;
          background: none;
          border: none;
          color: var(--browser-window-text-color, var(--_bw-text-color));
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 150ms ease;
          border-bottom: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
        }

        .share-menu-item:last-child {
          border-bottom: none;
        }

        .share-menu-item:hover {
          background: var(--browser-window-hover-bg, var(--_bw-hover-bg));
        }

        .share-menu-item:active {
          background: var(--browser-window-active-bg);
        }

        .share-menu-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
    `;
  }

  _browserCSS() {
    return `
        .browser-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--browser-window-header-bg, var(--_bw-header-bg));
          border-bottom: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          cursor: zoom-in;
          user-select: none;
        }

        :host(.browser-window-maximized) .browser-header {
          cursor: zoom-out;
        }

        .controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .control-button {
          /* Touch target size - transparent background */
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer !important;
          transition: opacity 150ms ease;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -8px;
        }

        /* Visual circle via pseudo-element */
        .control-button::after {
          content: '';
          width: 12px;
          height: 12px;
          border-radius: 50%;
          transition: opacity 150ms ease;
        }

        /* Larger touch targets on touch devices */
        @media (pointer: coarse) {
          .control-button {
            width: 44px;
            height: 44px;
            margin: -16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .control-button {
            transition: none;
          }
          .control-button::after {
            transition: none;
          }
        }

        .control-button:hover::after {
          opacity: 0.8;
        }

        .control-button:active::after {
          opacity: 0.6;
          transform: scale(0.9);
        }

        .control-button:focus {
          outline: 2px solid var(--browser-window-accent-color);
          outline-offset: 2px;
        }

        .control-button:focus:not(:focus-visible) {
          outline: none;
        }

        .control-button.close::after {
          background: var(--browser-window-close-color);
        }

        .control-button.minimize::after {
          background: var(--browser-window-minimize-color);
        }

        .control-button.maximize::after {
          background: var(--browser-window-maximize-color);
        }

        .url-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: var(--browser-window-url-bg, var(--_bw-url-bg));
          border: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          cursor: default !important;
        }

        .lock-icon {
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          font-size: 0.75rem;
        }

        .url-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
        }

        .view-source-button,
        .download-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .view-source-button:hover,
        .download-button:hover {
          color: var(--browser-window-text-color, var(--_bw-text-color));
          background: var(--browser-window-hover-bg, var(--_bw-hover-bg));
        }

        .view-source-button:active,
        .download-button:active {
          transform: scale(0.95);
        }

        .view-source-button.active {
          color: var(--browser-window-accent-color);
          background: var(--browser-window-active-bg);
        }

        .download-icon {
          width: 16px;
          height: 16px;
        }

        .share-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .share-button:hover {
          color: var(--browser-window-text-color, var(--_bw-text-color));
          background: var(--browser-window-hover-bg, var(--_bw-hover-bg));
        }

        .share-button:active {
          transform: scale(0.95);
        }

        .share-button.active {
          color: var(--browser-window-accent-color);
          background: var(--browser-window-active-bg);
        }

        /* Responsive: narrow screens */
        @media (max-width: 480px) {
          .browser-header {
            padding: 0.5rem 0.75rem;
            gap: 0.5rem;
          }

          .url-bar {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }

          .url-text {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .view-source-button svg,
          .share-button svg {
            width: 14px;
            height: 14px;
          }
        }

        /* Very narrow: hide URL text */
        @media (max-width: 320px) {
          .url-text {
            display: none;
          }

          .lock-icon {
            display: none;
          }
        }

        /* Touch devices: larger button padding */
        @media (pointer: coarse) {
          .view-source-button,
          .share-button,
          .download-button {
            padding: 0.5rem;
            min-width: 44px;
            min-height: 44px;
          }

          .share-menu-item {
            padding: 0.875rem 1rem;
          }
        }
    `;
  }

  _browserChrome() {
    return `
      <div class="browser-header" part="header" role="toolbar" aria-label="Window controls">
        <div class="controls">
          <button class="control-button close" aria-label="Minimize window" tabindex="0"></button>
          <button class="control-button minimize" aria-label="Minimize window" tabindex="0"></button>
          <button class="control-button maximize" aria-label="${this.isMaximized ? 'Restore window' : 'Maximize window'}" aria-expanded="${this.isMaximized}" tabindex="0"></button>
        </div>
        <div class="url-bar">
          ${this.url.startsWith('https') ? '<span class="lock-icon">🔒</span>' : ''}
          <span class="url-text" title="${this.escapeHtml(this.url)}">${this.escapeHtml(this.browserTitle)}</span>
          ${
            this.src
              ? `
            <button class="view-source-button" title="View source code">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4,6 2,8 4,10"/>
                <polyline points="12,6 14,8 12,10"/>
                <line x1="10" y1="4" x2="6" y2="12"/>
              </svg>
            </button>
            <div class="share-container">
              <button class="share-button" title="Share demo">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 12V3M8 3L5 6M8 3l3 3"/>
                  <path d="M3 9v4a1 1 0 001 1h8a1 1 0 001-1V9"/>
                </svg>
              </button>
              <div class="share-menu">
                ${
                  navigator.share
                    ? `
                  <button class="share-menu-item" data-action="share">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="4" r="2"/>
                      <circle cx="4" cy="8" r="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <path d="M6 9l4 2M6 7l4-2"/>
                    </svg>
                    Share...
                  </button>
                `
                    : ''
                }
                <button class="share-menu-item" data-action="codepen">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0L0 5v6l8 5 8-5V5L8 0zM7 10.5L2 7.5v-2l5 3v2zm1-3l-5-3L8 2l5 2.5-5 3zm1 3v-2l5-3v2l-5 3z"/>
                  </svg>
                  Open in CodePen
                </button>
              </div>
            </div>
            <a href="${this.escapeHtml(this.src)}" download class="download-button" title="Download demo HTML file">
              <svg class="download-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 1v10M8 11l-3-3M8 11l3-3"/>
                <path d="M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"/>
              </svg>
            </a>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  _contentHTML() {
    return `
      <div class="browser-content" part="content">
        ${this.src ? `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>` : '<slot></slot>'}
      </div>
    `;
  }

  // --- Device mode ---

  _deviceCSS(preset) {
    const bezelColor = DEVICE_COLORS[this.deviceColor] || DEVICE_COLORS.midnight;
    const isLandscape = this.getAttribute('orientation') === 'landscape';
    const dims = this._getEffectiveDimensions(preset);
    const [safeT, safeR, safeB, safeL] = this._getEffectiveSafeInsets(preset);
    const statusBarH = STATUS_BAR_HEIGHT[preset.notch] || 24;
    const homeIndH = preset.homeIndicator && !preset.homeButton ? HOME_INDICATOR_HEIGHT : 0;
    const homeBtnArea = preset.homeButton ? HOME_BUTTON_AREA : 0;
    const hasNotch = preset.notch !== 'none';

    return `
        :host([device]) {
          --device-width: ${dims.width}px;
          --device-height: ${dims.height}px;
          --device-bezel: ${preset.bezel}px;
          --device-corner-radius: ${preset.cornerRadius}px;
          --browser-window-bezel-color: ${bezelColor};
          --status-bar-height: ${isLandscape && hasNotch ? 24 : statusBarH}px;
          --home-indicator-height: ${homeIndH}px;
          --home-button-area: ${homeBtnArea}px;
          --safe-top: ${safeT}px;
          --safe-right: ${safeR}px;
          --safe-bottom: ${safeB}px;
          --safe-left: ${safeL}px;

          border: none;
          border-radius: 0;
          resize: none;
          overflow: visible;
          background: transparent;
          box-shadow: none;
          min-width: 0;
          min-height: 0;
        }

        .device-wrapper {
          display: flex;
          justify-content: center;
          overflow: hidden;
          width: 100%;
        }

        .device-frame {
          display: flex;
          flex-direction: column;
          width: var(--device-width);
          height: var(--device-height);
          padding: var(--device-bezel);
          border: none;
          box-sizing: content-box;
          border-radius: var(--device-corner-radius);
          overflow: hidden;
          position: relative;
          background: var(--browser-window-bezel-color);
          flex-shrink: 0;
          transform-origin: top center;
          box-shadow: none;
        }

        .device-frame.home-button {
          padding-bottom: var(--home-button-area);
        }

        /* Landscape with notch: horizontal layout */
        .device-frame.landscape.dynamic-island,
        .device-frame.landscape.punch-hole {
          flex-direction: row;
        }

        .device-main {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        /* Notch sidebar (landscape phones with notch) */
        .notch-sidebar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }

        .notch-sidebar.dynamic-island {
          width: 59px;
        }

        .notch-sidebar.dynamic-island::before {
          content: '';
          width: 37px;
          height: 126px;
          background: var(--browser-window-bezel-color);
          border-radius: 19px;
        }

        .notch-sidebar.punch-hole {
          width: 48px;
        }

        .notch-sidebar.punch-hole::before {
          content: '';
          width: 12px;
          height: 12px;
          background: var(--browser-window-bezel-color);
          border-radius: 50%;
        }

        /* Status bar */
        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px;
          height: var(--status-bar-height);
          position: relative;
          color: var(--browser-window-status-bar-color, rgba(255,255,255,0.9));
          font-size: 14px;
          font-weight: 600;
          flex-shrink: 0;
          z-index: 1;
          background: transparent;
        }

        .status-bar.dynamic-island {
          padding-top: 14px;
        }

        /* Dynamic Island pill (portrait only) */
        .status-bar.dynamic-island::before {
          content: '';
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 126px;
          height: 37px;
          background: var(--browser-window-bezel-color);
          border-radius: 19px;
        }

        /* Punch-hole camera (portrait only) */
        .status-bar.punch-hole::before {
          content: '';
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: var(--browser-window-bezel-color);
          border-radius: 50%;
        }

        /* Home button (iPhone SE) */
        .device-frame.home-button::after {
          content: '';
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 58px;
          height: 58px;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          z-index: 1;
        }

        /* Home indicator pill */
        .home-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          height: var(--home-indicator-height);
          flex-shrink: 0;
        }

        .home-indicator-pill {
          width: 134px;
          height: 5px;
          background: var(--browser-window-home-indicator-color, rgba(255,255,255,0.3));
          border-radius: 3px;
        }

        /* Device mode content area */
        :host([device]) .browser-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: var(--browser-window-content-bg, var(--_bw-content-bg));
        }

        :host([device]) .browser-content iframe {
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        /* Status bar icons */
        .status-time {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 1;
        }

        .status-icons {
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          z-index: 1;
        }

        .signal-bars {
          display: inline-flex;
          align-items: flex-end;
          gap: 1px;
          height: 12px;
        }

        .signal-bars span {
          display: inline-block;
          width: 3px;
          background: currentColor;
          border-radius: 1px;
        }

        .signal-bars span:nth-child(1) { height: 4px; }
        .signal-bars span:nth-child(2) { height: 6px; }
        .signal-bars span:nth-child(3) { height: 8px; }
        .signal-bars span:nth-child(4) { height: 10px; }

        /* Wifi icon - dot with two arcs */
        .wifi-icon {
          display: inline-block;
          width: 3px;
          height: 3px;
          background: currentColor;
          border-radius: 50%;
          position: relative;
          margin: 0 5px;
          vertical-align: middle;
        }

        .wifi-icon::before {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
          border: 1.5px solid currentColor;
          border-color: currentColor transparent transparent;
          border-radius: 50%;
        }

        .wifi-icon::after {
          content: '';
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 15px;
          height: 15px;
          border: 1.5px solid currentColor;
          border-color: currentColor transparent transparent;
          border-radius: 50%;
        }

        /* Battery icon */
        .battery-icon {
          display: inline-block;
          width: 22px;
          height: 10px;
          border: 1.5px solid currentColor;
          border-radius: 2px;
          position: relative;
          vertical-align: middle;
        }

        .battery-icon::before {
          /* Battery fill */
          content: '';
          position: absolute;
          top: 1.5px;
          left: 1.5px;
          right: 1.5px;
          bottom: 1.5px;
          background: currentColor;
          border-radius: 0.5px;
        }

        .battery-icon::after {
          /* Battery cap */
          content: '';
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 5px;
          background: currentColor;
          border-radius: 0 1px 1px 0;
        }

        /* Light bezel: dark status bar text */
        .device-frame.light-bezel .status-bar {
          color: rgba(0, 0, 0, 0.8);
        }

        .device-frame.light-bezel .home-indicator-pill {
          background: rgba(0, 0, 0, 0.3);
        }

        .device-frame.light-bezel.home-button::after {
          border-color: rgba(0, 0, 0, 0.15);
        }

        /* Dark mode in device mode */
        :host([device][mode="dark"]) .browser-content,
        :host([device][data-page-mode="dark"]:not([mode])) .browser-content {
          background: #000000;
        }

        :host([device][mode="dark"]) .device-frame,
        :host([device][data-page-mode="dark"]:not([mode])) .device-frame {
          outline: 1px solid rgba(255, 255, 255, 0.12);
          outline-offset: -1px;
        }

        @media (prefers-color-scheme: dark) {
          :host([device]:not([mode])) .device-frame {
            outline: 1px solid rgba(255, 255, 255, 0.12);
            outline-offset: -1px;
          }
        }

        /* Safe area overlays */
        .safe-area-overlays {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: var(--home-button-area);
          pointer-events: none;
          z-index: 3;
        }

        .safe-area-overlay {
          position: absolute;
          background: var(--browser-window-safe-area-color, oklch(0.65 0.2 250 / 0.25));
        }

        .safe-area-top {
          top: 0;
          left: 0;
          right: 0;
          height: var(--safe-top);
        }

        .safe-area-right {
          top: 0;
          right: 0;
          bottom: 0;
          width: var(--safe-right);
        }

        .safe-area-bottom {
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--safe-bottom);
        }

        .safe-area-left {
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--safe-left);
        }

        .device-toolbar {
          display: inline-flex;
          align-items: center;
          align-self: center;
          gap: 2px;
          padding: 3px;
          margin-top: 0.5rem;
          border-radius: 20px;
          background: var(--browser-window-header-bg, var(--_bw-header-bg));
          border: 1px solid var(--browser-window-border-color, var(--_bw-border-color));
        }

        .device-toolbar .view-source-button,
        .device-toolbar .share-button,
        .device-toolbar .download-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: none;
          border: none;
          border-radius: 50%;
          color: var(--browser-window-text-muted, var(--_bw-text-muted));
          cursor: pointer;
          text-decoration: none;
          transition: all 150ms ease;
        }

        .device-toolbar .view-source-button:hover,
        .device-toolbar .share-button:hover,
        .device-toolbar .download-button:hover {
          background: var(--browser-window-hover-bg, var(--_bw-hover-bg));
          color: var(--browser-window-text-color, var(--_bw-text-color));
        }

        .device-toolbar .view-source-button.active {
          background: var(--browser-window-accent-color, #2563eb);
          color: white;
        }

        .device-toolbar .share-container {
          position: relative;
        }

        .device-toolbar .share-menu {
          bottom: calc(100% + 6px);
          top: auto;
          right: 50%;
          transform: translateX(50%);
        }

        .device-toolbar svg {
          width: 16px;
          height: 16px;
        }
    `;
  }

  _deviceChrome(preset) {
    const isLandscape = this.getAttribute('orientation') === 'landscape';
    const hasNotch = preset.notch !== 'none';
    const notchClass = hasNotch ? preset.notch : '';
    const homeButtonClass = preset.homeButton ? 'home-button' : '';
    const lightBezels = ['silver', 'gold', 'white'];
    const lightBezelClass = lightBezels.includes(this.deviceColor) ? 'light-bezel' : '';
    const landscapeClass = isLandscape ? 'landscape' : '';

    const classes = ['device-frame', notchClass, homeButtonClass, lightBezelClass, landscapeClass]
      .filter(Boolean)
      .join(' ');

    // In landscape with notch, the status bar doesn't show the notch (it's in the sidebar)
    const statusBarNotchClass = isLandscape && hasNotch ? '' : notchClass;

    const statusBar = `
      <div class="status-bar ${statusBarNotchClass}">
        <span class="status-time">9:41</span>
        <div class="status-icons">
          <span class="signal-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
          <span class="wifi-icon" aria-hidden="true"></span>
          <span class="battery-icon" aria-hidden="true"></span>
        </div>
      </div>
    `;

    const homeIndicator =
      preset.homeIndicator && !preset.homeButton
        ? '<div class="home-indicator"><div class="home-indicator-pill"></div></div>'
        : '';

    const safeAreaOverlays = this.hasAttribute('show-safe-areas')
      ? `<div class="safe-area-overlays">
          <div class="safe-area-overlay safe-area-top"></div>
          <div class="safe-area-overlay safe-area-right"></div>
          <div class="safe-area-overlay safe-area-bottom"></div>
          <div class="safe-area-overlay safe-area-left"></div>
        </div>`
      : '';

    const toolbar = this._deviceToolbar();

    // In landscape with notch, use sidebar layout for the notch
    if (isLandscape && hasNotch) {
      return `
        <div class="device-wrapper">
          <div class="${classes}">
            <div class="notch-sidebar ${notchClass}"></div>
            <div class="device-main">
              ${statusBar}
              ${this._contentHTML()}
              ${homeIndicator}
            </div>
            ${safeAreaOverlays}
          </div>
        </div>
        ${toolbar}
      `;
    }

    return `
      <div class="device-wrapper">
        <div class="${classes}">
          ${statusBar}
          ${this._contentHTML()}
          ${homeIndicator}
          ${safeAreaOverlays}
        </div>
      </div>
      ${toolbar}
    `;
  }

  _deviceToolbar() {
    if (!this.src) return '';
    return `
      <div class="device-toolbar">
        <button class="view-source-button" title="View source code">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4,6 2,8 4,10"/>
            <polyline points="12,6 14,8 12,10"/>
            <line x1="10" y1="4" x2="6" y2="12"/>
          </svg>
        </button>
        <div class="share-container">
          <button class="share-button" title="Share demo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 12V3M8 3L5 6M8 3l3 3"/>
              <path d="M3 9v4a1 1 0 001 1h8a1 1 0 001-1V9"/>
            </svg>
          </button>
          <div class="share-menu">
            ${
              navigator.share
                ? `
              <button class="share-menu-item" data-action="share">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="4" r="2"/>
                  <circle cx="4" cy="8" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M6 9l4 2M6 7l4-2"/>
                </svg>
                Share...
              </button>
            `
                : ''
            }
            <button class="share-menu-item" data-action="codepen">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L0 5v6l8 5 8-5V5L8 0zM7 10.5L2 7.5v-2l5 3v2zm1-3l-5-3L8 2l5 2.5-5 3zm1 3v-2l5-3v2l-5 3z"/>
              </svg>
              Open in CodePen
            </button>
          </div>
        </div>
        <a href="${this.escapeHtml(this.src)}" download class="download-button" title="Download demo HTML file">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 1v10M8 11l-3-3M8 11l3-3"/>
            <path d="M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"/>
          </svg>
        </a>
      </div>
    `;
  }

  // --- Device scaling ---

  _setupDeviceScaling() {
    if (this._resizeObserver) return;
    this._resizeObserver = new ResizeObserver(() => this._updateDeviceScale());
    this._resizeObserver.observe(this);
  }

  _updateDeviceScale() {
    const preset = this._getDevicePreset();
    if (!preset) return;

    const wrapper = this.shadowRoot.querySelector('.device-wrapper');
    const frame = this.shadowRoot.querySelector('.device-frame');
    if (!wrapper || !frame) return;

    const hostWidth = this.clientWidth;
    if (hostWidth === 0) return; // not yet laid out

    const dims = this._getEffectiveDimensions(preset);
    const deviceTotalWidth = dims.width + preset.bezel * 2;
    const scale = Math.min(1, hostWidth / deviceTotalWidth);
    this._currentScale = scale;

    frame.style.transform = `scale(${scale})`;

    const homeBtnArea = preset.homeButton ? HOME_BUTTON_AREA : 0;
    const totalHeight = dims.height + preset.bezel * 2 + homeBtnArea;
    wrapper.style.height = `${totalHeight * scale}px`;
  }

  _teardownDeviceScaling() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._currentScale = 1;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

if (!customElements.get('browser-window')) {
  customElements.define('browser-window', BrowserWindow);
}
