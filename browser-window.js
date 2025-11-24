/**
 * Browser Window Web Component
 * Creates a Safari-style browser window frame for demonstrations
 * Based on @zachleat/browser-window but expanded for tutorial use
 */
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
  }

  async connectedCallback() {
    this.render();
    this.attachEventListeners();

    // Fetch source code if src attribute is present
    if (this.src) {
      await this.fetchSourceCode();
    }
  }

  disconnectedCallback() {
    this.removeOverlay();
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleOutsideClick);
  }

  static get observedAttributes() {
    return ['url', 'title', 'mode', 'shadow', 'src'];
  }

  attributeChangedCallback() {
    if (this.shadowRoot) {
      this.render();
      this.attachEventListeners();
    }
  }

  get url() {
    return this.getAttribute('url') || '';
  }

  get src() {
    return this.getAttribute('src') || '';
  }

  get browserTitle() {
    return this.getAttribute('title') || this.getHostname();
  }

  get mode() {
    return this.getAttribute('mode') || 'light';
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

    closeBtn?.addEventListener('click', () => this.handleClose());
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    maximizeBtn?.addEventListener('click', () => this.toggleMaximize());
    viewSourceBtn?.addEventListener('click', () => this.toggleViewSource());
    copyBtn?.addEventListener('click', () => this.copySourceCode());
    shareBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleShareMenu();
    });
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
    const content = this.shadowRoot.querySelector('.browser-content');
    const viewSourceBtn = this.shadowRoot.querySelector('.view-source-button');

    if (!content) return;

    if (this.showSource) {
      // Show source code
      content.innerHTML = `
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
      viewSourceBtn.classList.add('active');

      // Re-attach copy button listener
      const copyBtn = content.querySelector('.copy-source-button');
      copyBtn?.addEventListener('click', () => this.copySourceCode());
    } else {
      // Restore original content
      if (this.src) {
        content.innerHTML = `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>`;
      } else {
        content.innerHTML = '<slot></slot>';
      }
      viewSourceBtn.classList.remove('active');
    }
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

        setTimeout(() => {
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
    const menu = this.shadowRoot.querySelector('.share-menu');
    const shareBtn = this.shadowRoot.querySelector('.share-button');

    if (this.showShareMenu) {
      menu.style.display = 'block';
      shareBtn.classList.add('active');
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    } else {
      menu.style.display = 'none';
      shareBtn.classList.remove('active');
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
      url: this.src || this.url
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
      .map(style => style.textContent)
      .join('\n\n');

    // Extract JavaScript from script tags (excluding module imports)
    const scripts = Array.from(doc.querySelectorAll('script'))
      .filter(script => !script.src && script.type !== 'module')
      .map(script => script.textContent)
      .join('\n\n');

    // Extract HTML from body (excluding scripts and styles)
    const bodyClone = doc.body.cloneNode(true);
    bodyClone.querySelectorAll('script, style').forEach(el => el.remove());
    const html = bodyClone.innerHTML;

    return {
      html: html.trim(),
      css: styles.trim(),
      js: scripts.trim()
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
      editors: '110' // Show HTML and CSS editors, hide JS if empty
    };

    // Create form and submit to CodePen
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
    // If maximized, restore to normal size
    if (this.isMaximized) {
      this.toggleMaximize();
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
      z-index: 9998;
      cursor: pointer;
      animation: fadeIn 200ms ease;
    `;

    // Add fade-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

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
      content.style.display = 'block';
    }
  }

  toggleMaximize() {
    if (this.isMaximized) {
      // Remove maximized class to restore original state
      this.classList.remove('browser-window-maximized');

      // Reset iframe height if present
      const iframe = this.shadowRoot.querySelector('iframe');
      if (iframe) {
        iframe.style.minHeight = '';
      }

      // Remove overlay
      this.removeOverlay();

      this.isMaximized = false;
    } else {
      // Restore from minimized if needed
      if (this.isMinimized) {
        this.toggleMinimize();
      }

      // Create overlay backdrop
      this.createOverlay();

      // Add maximized class for styling
      this.classList.add('browser-window-maximized');

      // Update iframe height if present
      const iframe = this.shadowRoot.querySelector('iframe');
      if (iframe) {
        iframe.style.minHeight = 'calc(90vh - 50px)';
      }

      this.isMaximized = true;
    }
  }

  render() {
    const isDark = this.mode === 'dark';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin: 1rem 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid ${isDark ? '#3a3a3c' : '#d1d5da'};
          background: ${isDark ? '#1c1c1e' : '#ffffff'};
          ${this.hasShadow ? 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);' : ''}
          transition: all 250ms ease-out;
        }

        :host(.browser-window-maximized) {
          position: fixed !important;
          top: 5vh !important;
          left: 5vw !important;
          width: 90vw !important;
          height: 90vh !important;
          z-index: 9999 !important;
          margin: 0 !important;
        }

        .browser-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: ${isDark ? '#2c2c2e' : '#f6f8fa'};
          border-bottom: 1px solid ${isDark ? '#3a3a3c' : '#e1e4e8'};
        }

        .controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .control-button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: opacity 150ms ease;
        }

        .control-button:hover {
          opacity: 0.8;
        }

        .control-button:active {
          opacity: 0.6;
          transform: scale(0.9);
        }

        .control-button.close {
          background: #ff5f57;
        }

        .control-button.minimize {
          background: #febc2e;
        }

        .control-button.maximize {
          background: #28c840;
        }

        .url-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: ${isDark ? '#1c1c1e' : '#ffffff'};
          border: 1px solid ${isDark ? '#48484a' : '#d1d5da'};
          border-radius: 6px;
          font-size: 0.875rem;
          color: ${isDark ? '#e5e5e7' : '#586069'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .lock-icon {
          color: ${isDark ? '#98989d' : '#6a737d'};
          font-size: 0.75rem;
        }

        .url-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${isDark ? '#98989d' : '#586069'};
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
          color: ${isDark ? '#98989d' : '#586069'};
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .view-source-button:hover,
        .download-button:hover {
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          background: ${isDark ? '#3a3a3c' : '#f3f4f6'};
        }

        .view-source-button:active,
        .download-button:active {
          transform: scale(0.95);
        }

        .view-source-button.active {
          color: #2563eb;
          background: ${isDark ? '#3a3a3c' : '#dbeafe'};
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
          color: ${isDark ? '#98989d' : '#586069'};
          transition: all 150ms ease;
          border-radius: 4px;
        }

        .share-button:hover {
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          background: ${isDark ? '#3a3a3c' : '#f3f4f6'};
        }

        .share-button:active {
          transform: scale(0.95);
        }

        .share-button.active {
          color: #2563eb;
          background: ${isDark ? '#3a3a3c' : '#dbeafe'};
        }

        .share-menu {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: ${isDark ? '#2c2c2e' : '#ffffff'};
          border: 1px solid ${isDark ? '#48484a' : '#d1d5da'};
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
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 150ms ease;
          border-bottom: 1px solid ${isDark ? '#3a3a3c' : '#f3f4f6'};
        }

        .share-menu-item:last-child {
          border-bottom: none;
        }

        .share-menu-item:hover {
          background: ${isDark ? '#3a3a3c' : '#f3f4f6'};
        }

        .share-menu-item:active {
          background: ${isDark ? '#48484a' : '#e5e7eb'};
        }

        .share-menu-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .browser-content {
          background: ${isDark ? '#000000' : '#ffffff'};
          min-height: 200px;
          padding: 0;
        }

        iframe {
          display: block;
          width: 100%;
          border: none;
          min-height: 200px;
        }

        ::slotted(*) {
          display: block;
          width: 100%;
        }

        ::slotted(img),
        ::slotted(iframe) {
          display: block;
          border: none;
          margin: 0;
        }

        .source-view {
          padding: 0;
          background: ${isDark ? '#1c1c1e' : '#f6f8fa'};
          min-height: 200px;
          max-height: 600px;
          overflow: auto;
        }

        .source-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: ${isDark ? '#1c1c1e' : '#f6f8fa'};
          border-bottom: 1px solid ${isDark ? '#3a3a3c' : '#e1e4e8'};
          backdrop-filter: blur(8px);
        }

        .source-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .copy-source-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: ${isDark ? '#2c2c2e' : '#ffffff'};
          border: 1px solid ${isDark ? '#48484a' : '#d1d5da'};
          border-radius: 6px;
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .copy-source-button:hover {
          background: ${isDark ? '#3a3a3c' : '#f3f4f6'};
          border-color: ${isDark ? '#5a5a5c' : '#9ca3af'};
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
          background: ${isDark ? '#000000' : '#ffffff'};
          border: 1px solid ${isDark ? '#3a3a3c' : '#e1e4e8'};
          border-radius: 6px;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .source-view code {
          color: ${isDark ? '#e5e5e7' : '#24292e'};
          display: block;
          white-space: pre;
        }
      </style>
      <div class="browser-header">
        <div class="controls">
          <button class="control-button close" aria-label="Close"></button>
          <button class="control-button minimize" aria-label="Minimize"></button>
          <button class="control-button maximize" aria-label="Maximize"></button>
        </div>
        <div class="url-bar">
          ${this.url.startsWith('https') ? '<span class="lock-icon">🔒</span>' : ''}
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
                ` : ''}
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
          ` : ''}
        </div>
      </div>
      <div class="browser-content">
        ${this.src ? `<iframe src="${this.escapeHtml(this.src)}" loading="lazy"></iframe>` : '<slot></slot>'}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('browser-window', BrowserWindow);
