class c extends HTMLElement {
  constructor() {
    super(), this.attachShadow({ mode: "open" }), this.isMinimized = !1, this.isMaximized = !1, this.overlay = null, this.showSource = !1, this.sourceCode = "", this.showShareMenu = !1, this.handleKeydown = this.handleKeydown.bind(this), this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }
  async connectedCallback() {
    this.render(), this.attachEventListeners(), this.src && await this.fetchSourceCode();
  }
  disconnectedCallback() {
    this.removeOverlay(), document.removeEventListener("keydown", this.handleKeydown), document.removeEventListener("click", this.handleOutsideClick);
  }
  static get observedAttributes() {
    return ["url", "title", "mode", "shadow", "src"];
  }
  attributeChangedCallback() {
    this.shadowRoot && (this.render(), this.attachEventListeners());
  }
  get url() {
    return this.getAttribute("url") || "";
  }
  get src() {
    return this.getAttribute("src") || "";
  }
  get browserTitle() {
    return this.getAttribute("title") || this.getHostname();
  }
  get mode() {
    return this.getAttribute("mode") || "light";
  }
  get hasShadow() {
    return this.hasAttribute("shadow");
  }
  getHostname() {
    try {
      return new URL(this.url).hostname;
    } catch {
      return this.url;
    }
  }
  attachEventListeners() {
    const e = this.shadowRoot.querySelector(".control-button.close"), o = this.shadowRoot.querySelector(".control-button.minimize"), t = this.shadowRoot.querySelector(".control-button.maximize"), i = this.shadowRoot.querySelector(".view-source-button"), n = this.shadowRoot.querySelector(".copy-source-button"), a = this.shadowRoot.querySelector(".share-button"), r = this.shadowRoot.querySelector(".browser-header");
    e?.addEventListener("click", () => this.handleClose()), o?.addEventListener("click", () => this.toggleMinimize()), t?.addEventListener("click", () => this.toggleMaximize()), i?.addEventListener("click", () => this.toggleViewSource()), n?.addEventListener("click", () => this.copySourceCode()), a?.addEventListener("click", (s) => {
      s.stopPropagation(), this.toggleShareMenu();
    }), r?.addEventListener("dblclick", (s) => {
      const d = s.target;
      (d.classList.contains("browser-header") || d.classList.contains("controls")) && this.toggleMaximize();
    }), this.shadowRoot.querySelector("iframe")?.addEventListener("error", () => this.handleIframeError());
  }
  handleIframeError() {
    const e = this.shadowRoot.querySelector(".browser-content");
    e && (e.innerHTML = `
      <div class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Failed to load content</p>
        <button class="retry-button" onclick="this.getRootNode().host.retryLoad()">Retry</button>
      </div>
    `);
  }
  retryLoad() {
    const e = this.shadowRoot.querySelector(".browser-content");
    if (!e || !this.src) return;
    e.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>`, e.querySelector("iframe")?.addEventListener("error", () => this.handleIframeError());
  }
  async fetchSourceCode() {
    if (this.src)
      try {
        const e = await fetch(this.src);
        e.ok && (this.sourceCode = await e.text());
      } catch (e) {
        console.error("Failed to fetch source code:", e), this.sourceCode = "// Failed to load source code";
      }
  }
  toggleViewSource() {
    this.showSource = !this.showSource, this.updateContentView();
  }
  updateContentView() {
    const e = this.shadowRoot.querySelector(".browser-content"), o = this.shadowRoot.querySelector(".view-source-button");
    e && (this.showSource ? (e.innerHTML = `
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
      `, o.classList.add("active"), e.querySelector(".copy-source-button")?.addEventListener("click", () => this.copySourceCode())) : (this.src ? e.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>` : e.innerHTML = "<slot></slot>", o.classList.remove("active")));
  }
  async copySourceCode() {
    if (this.sourceCode)
      try {
        await navigator.clipboard.writeText(this.sourceCode);
        const e = this.shadowRoot.querySelector(".copy-source-button");
        if (e) {
          const o = e.innerHTML;
          e.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3,8 6,11 13,4"/>
          </svg>
          Copied!
        `, e.classList.add("copied"), setTimeout(() => {
            e.innerHTML = o, e.classList.remove("copied");
          }, 2e3);
        }
      } catch (e) {
        console.error("Failed to copy source code:", e);
      }
  }
  toggleShareMenu() {
    this.showShareMenu = !this.showShareMenu;
    const e = this.shadowRoot.querySelector(".share-menu"), o = this.shadowRoot.querySelector(".share-button");
    this.showShareMenu ? (e.style.display = "block", o.classList.add("active"), setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick);
    }, 0)) : (e.style.display = "none", o.classList.remove("active"), document.removeEventListener("click", this.handleOutsideClick));
  }
  handleOutsideClick(e) {
    const o = this.shadowRoot.querySelector(".share-menu");
    o && !o.contains(e.target) && this.toggleShareMenu();
  }
  async shareViaWebAPI() {
    if (!navigator.share) {
      console.warn("Web Share API not supported");
      return;
    }
    const e = {
      title: this.browserTitle || "CSS Demo",
      text: `Check out this CSS demo: ${this.browserTitle}`,
      url: this.src || this.url
    };
    try {
      await navigator.share(e), this.toggleShareMenu();
    } catch (o) {
      o.name !== "AbortError" && console.error("Error sharing:", o);
    }
  }
  parseHTMLForCodePen() {
    if (!this.sourceCode) return null;
    const o = new DOMParser().parseFromString(this.sourceCode, "text/html"), t = Array.from(o.querySelectorAll("style")).map((r) => r.textContent).join(`

`), i = Array.from(o.querySelectorAll("script")).filter((r) => !r.src && r.type !== "module").map((r) => r.textContent).join(`

`), n = o.body.cloneNode(!0);
    return n.querySelectorAll("script, style").forEach((r) => r.remove()), {
      html: n.innerHTML.trim(),
      css: t.trim(),
      js: i.trim()
    };
  }
  openInCodePen() {
    const e = this.parseHTMLForCodePen();
    if (!e) return;
    const o = {
      title: this.browserTitle || "CSS Demo",
      description: `Demo from ${this.url}`,
      html: e.html,
      css: e.css,
      js: e.js,
      editors: "110"
      // Show HTML and CSS editors, hide JS if empty
    }, t = document.createElement("form");
    t.action = "https://codepen.io/pen/define", t.method = "POST", t.target = "_blank";
    const i = document.createElement("input");
    i.type = "hidden", i.name = "data", i.value = JSON.stringify(o), t.appendChild(i), document.body.appendChild(t), t.submit(), document.body.removeChild(t), this.toggleShareMenu();
  }
  handleClose() {
    this.isMaximized && this.toggleMaximize();
  }
  handleKeydown(e) {
    e.key === "Escape" && (this.showShareMenu ? this.toggleShareMenu() : this.isMaximized && this.toggleMaximize());
  }
  createOverlay() {
    if (this.overlay) return;
    this.overlay = document.createElement("div"), this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      cursor: pointer;
      animation: fadeIn 200ms ease;
    `;
    const e = document.createElement("style");
    e.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `, document.head.appendChild(e), this.overlay.addEventListener("click", () => this.toggleMaximize()), document.body.appendChild(this.overlay), document.addEventListener("keydown", this.handleKeydown);
  }
  removeOverlay() {
    this.overlay && (this.overlay.remove(), this.overlay = null), document.removeEventListener("keydown", this.handleKeydown);
  }
  toggleMinimize() {
    const e = this.shadowRoot.querySelector(".browser-content");
    e && (this.isMinimized = !this.isMinimized, this.isMinimized ? (this.isMaximized && this.toggleMaximize(), e.style.display = "none") : e.style.display = "");
  }
  toggleMaximize() {
    const e = this.shadowRoot.querySelector(".control-button.maximize");
    if (this.isMaximized) {
      this.classList.remove("browser-window-maximized"), this.removeAttribute("role"), this.removeAttribute("aria-modal");
      const o = this.shadowRoot.querySelector("iframe");
      o && (o.style.minHeight = ""), this.removeOverlay(), this.isMaximized = !1, e && (e.setAttribute("aria-label", "Maximize window"), e.setAttribute("aria-expanded", "false"));
    } else {
      this.isMinimized && this.toggleMinimize(), this.createOverlay(), this.classList.add("browser-window-maximized"), this.setAttribute("role", "dialog"), this.setAttribute("aria-modal", "true");
      const o = this.shadowRoot.querySelector("iframe");
      o && (o.style.minHeight = "calc(90vh - 50px)"), this.isMaximized = !0, e && (e.setAttribute("aria-label", "Restore window"), e.setAttribute("aria-expanded", "true"));
    }
  }
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* CSS Custom Properties with light mode defaults */
          --browser-window-bg: #ffffff;
          --browser-window-header-bg: #f6f8fa;
          --browser-window-border-color: #d1d5da;
          --browser-window-border-radius: 8px;
          --browser-window-text-color: #24292e;
          --browser-window-text-muted: #586069;
          --browser-window-url-bg: #ffffff;
          --browser-window-shadow: ${this.hasShadow ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none"};
          --browser-window-close-color: #ff5f57;
          --browser-window-minimize-color: #febc2e;
          --browser-window-maximize-color: #28c840;
          --browser-window-accent-color: #2563eb;
          --browser-window-hover-bg: #f3f4f6;
          --browser-window-active-bg: #dbeafe;
          --browser-window-content-bg: #ffffff;
          --browser-window-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --browser-window-mono-font: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

          display: flex;
          flex-direction: column;
          margin: 1rem 0;
          border-radius: var(--browser-window-border-radius);
          overflow: hidden;
          border: 1px solid var(--browser-window-border-color);
          background: var(--browser-window-bg);
          box-shadow: var(--browser-window-shadow);
          transition: all 250ms ease-out;
          font-family: var(--browser-window-font-family);

          /* Resizable container */
          resize: both;
          min-width: 280px;
          min-height: 150px;

        }

        /* Auto dark mode based on system preference (when no mode attribute) */
        @media (prefers-color-scheme: dark) {
          :host(:not([mode])) {
            --browser-window-bg: #1c1c1e;
            --browser-window-header-bg: #2c2c2e;
            --browser-window-border-color: #3a3a3c;
            --browser-window-text-color: #e5e5e7;
            --browser-window-text-muted: #98989d;
            --browser-window-url-bg: #1c1c1e;
            --browser-window-hover-bg: #3a3a3c;
            --browser-window-content-bg: #000000;
          }
        }

        /* Explicit dark mode override */
        :host([mode="dark"]) {
          --browser-window-bg: #1c1c1e;
          --browser-window-header-bg: #2c2c2e;
          --browser-window-border-color: #3a3a3c;
          --browser-window-text-color: #e5e5e7;
          --browser-window-text-muted: #98989d;
          --browser-window-url-bg: #1c1c1e;
          --browser-window-hover-bg: #3a3a3c;
          --browser-window-content-bg: #000000;
        }

        /* Explicit light mode override (for users on dark system who want light) */
        :host([mode="light"]) {
          --browser-window-bg: #ffffff;
          --browser-window-header-bg: #f6f8fa;
          --browser-window-border-color: #d1d5da;
          --browser-window-text-color: #24292e;
          --browser-window-text-muted: #586069;
          --browser-window-url-bg: #ffffff;
          --browser-window-hover-bg: #f3f4f6;
          --browser-window-content-bg: #ffffff;
        }

        :host(.browser-window-maximized) {
          position: fixed !important;
          top: 5vh !important;
          left: 5vw !important;
          width: 90vw !important;
          height: 90vh !important;
          z-index: 9999 !important;
          margin: 0 !important;
          resize: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          :host {
            transition: none;
          }
        }

        .browser-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--browser-window-header-bg);
          border-bottom: 1px solid var(--browser-window-border-color);
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
          background: var(--browser-window-url-bg);
          border: 1px solid var(--browser-window-border-color);
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--browser-window-text-muted);
          cursor: default !important;
        }

        .lock-icon {
          color: var(--browser-window-text-muted);
          font-size: 0.75rem;
        }

        .url-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--browser-window-text-muted);
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
          color: var(--browser-window-text-muted);
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .view-source-button:hover,
        .download-button:hover {
          color: var(--browser-window-text-color);
          background: var(--browser-window-hover-bg);
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

        .share-container {
          position: relative;
          display: inline-block;
        }

        .share-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--browser-window-text-muted);
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .share-button:hover {
          color: var(--browser-window-text-color);
          background: var(--browser-window-hover-bg);
        }

        .share-button:active {
          transform: scale(0.95);
        }

        .share-button.active {
          color: var(--browser-window-accent-color);
          background: var(--browser-window-active-bg);
        }

        .share-menu {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: var(--browser-window-header-bg);
          border: 1px solid var(--browser-window-border-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 180px;
          z-index: 1000;
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
          color: var(--browser-window-text-color);
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 150ms ease;
          border-bottom: 1px solid var(--browser-window-border-color);
        }

        .share-menu-item:last-child {
          border-bottom: none;
        }

        .share-menu-item:hover {
          background: var(--browser-window-hover-bg);
        }

        .share-menu-item:active {
          background: var(--browser-window-active-bg);
        }

        .share-menu-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .browser-content {
          background: var(--browser-window-content-bg);
          min-height: 200px;
          padding: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
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
          background: var(--browser-window-header-bg);
          min-height: 200px;
          /* Constrain source view height to prevent container expansion */
          max-height: 50vh;
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
          background: var(--browser-window-header-bg);
          border-bottom: 1px solid var(--browser-window-border-color);
          backdrop-filter: blur(8px);
        }

        .source-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--browser-window-text-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .copy-source-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: var(--browser-window-bg);
          border: 1px solid var(--browser-window-border-color);
          border-radius: 6px;
          color: var(--browser-window-text-color);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .copy-source-button:hover {
          background: var(--browser-window-hover-bg);
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
          background: var(--browser-window-content-bg);
          border: 1px solid var(--browser-window-border-color);
          border-radius: 6px;
          overflow-x: auto;
          font-family: var(--browser-window-mono-font);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .source-view code {
          color: var(--browser-window-text-color);
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
          color: var(--browser-window-text-muted);
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
      </style>
      <div class="browser-header" role="toolbar" aria-label="Window controls">
        <div class="controls">
          <button class="control-button close" aria-label="Close window" tabindex="0"></button>
          <button class="control-button minimize" aria-label="Minimize window" tabindex="0"></button>
          <button class="control-button maximize" aria-label="${this.isMaximized ? "Restore window" : "Maximize window"}" aria-expanded="${this.isMaximized}" tabindex="0"></button>
        </div>
        <div class="url-bar">
          ${this.url.startsWith("https") ? '<span class="lock-icon">🔒</span>' : ""}
          <span class="url-text" title="${this.escapeHtml(this.url)}">${this.escapeHtml(this.browserTitle)}</span>
          ${this.src ? `
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
                ${navigator.share ? `
                  <button class="share-menu-item" onclick="this.getRootNode().host.shareViaWebAPI()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="4" r="2"/>
                      <circle cx="4" cy="8" r="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <path d="M6 9l4 2M6 7l4-2"/>
                    </svg>
                    Share...
                  </button>
                ` : ""}
                <button class="share-menu-item" onclick="this.getRootNode().host.openInCodePen()">
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
          ` : ""}
        </div>
      </div>
      <div class="browser-content">
        ${this.src ? `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>` : "<slot></slot>"}
      </div>
    `;
  }
  escapeHtml(e) {
    const o = document.createElement("div");
    return o.textContent = e, o.innerHTML;
  }
}
customElements.define("browser-window", c);
export {
  c as BrowserWindow
};
