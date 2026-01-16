import { test, expect } from '@playwright/test'

test.describe('browser-window', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/test-page.html')
  })

  test.describe('rendering', () => {
    test('renders with default attributes', async ({ page }) => {
      const el = page.locator('#default')
      await expect(el).toBeVisible()

      const hasShadow = await el.evaluate((node) => node.shadowRoot !== null)
      expect(hasShadow).toBe(true)
    })

    test('renders header with controls', async ({ page }) => {
      const el = page.locator('#default')
      const header = el.locator('.browser-header')
      await expect(header).toBeVisible()

      const controls = el.locator('.control-button')
      await expect(controls).toHaveCount(3) // close, minimize, maximize
    })

    test('renders URL bar', async ({ page }) => {
      const el = page.locator('#with-url')
      const urlBar = el.locator('.url-bar')
      await expect(urlBar).toBeVisible()
    })
  })

  test.describe('attributes', () => {
    test('reflects url attribute', async ({ page }) => {
      const url = await page.locator('#with-url').evaluate((node) => node.url)
      expect(url).toBe('https://example.com')
    })

    test('reflects title attribute', async ({ page }) => {
      const title = await page.locator('#with-url').evaluate((node) => node.browserTitle)
      expect(title).toBe('Test Window')
    })

    test('extracts hostname from URL when no title provided', async ({ page }) => {
      // Create element dynamically with URL but no title
      const title = await page.evaluate(() => {
        const el = document.createElement('browser-window')
        el.setAttribute('url', 'https://example.com/page')
        document.body.appendChild(el)
        return el.browserTitle
      })
      expect(title).toBe('example.com')
    })

    test('reflects src attribute', async ({ page }) => {
      const src = await page.locator('#with-src').evaluate((node) => node.src)
      expect(src).toBe('../docs/example.html')
    })

    test('reflects mode attribute', async ({ page }) => {
      const mode = await page.locator('#dark-mode').evaluate((node) => node.mode)
      expect(mode).toBe('dark')
    })

    test('reflects shadow attribute', async ({ page }) => {
      const hasShadow = await page.locator('#with-shadow').evaluate((node) => node.hasShadow)
      expect(hasShadow).toBe(true)
    })

    test('shadow attribute defaults to false', async ({ page }) => {
      const hasShadow = await page.locator('#default').evaluate((node) => node.hasShadow)
      expect(hasShadow).toBe(false)
    })
  })

  test.describe('light/dark mode', () => {
    test('applies light mode styles by default', async ({ page }) => {
      const el = page.locator('#default')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain('--browser-window-bg: #ffffff')
    })

    test('applies dark mode styles when mode="dark"', async ({ page }) => {
      const el = page.locator('#dark-mode')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain(':host([mode="dark"])')
      expect(style).toContain('--browser-window-bg: #1c1c1e')
    })

    test('includes prefers-color-scheme media query for auto detection', async ({ page }) => {
      const el = page.locator('#default')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain('@media (prefers-color-scheme: dark)')
      expect(style).toContain(':host(:not([mode]))')
    })

    test('explicit mode="light" overrides system preference', async ({ page }) => {
      const el = page.locator('#light-mode')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain(':host([mode="light"])')
    })
  })

  test.describe('minimize', () => {
    test('starts not minimized', async ({ page }) => {
      const isMinimized = await page.locator('#default').evaluate((node) => node.isMinimized)
      expect(isMinimized).toBe(false)
    })

    test('toggles minimize state', async ({ page }) => {
      const el = page.locator('#default')
      const minimizeBtn = el.locator('.control-button.minimize')

      await minimizeBtn.click()
      let isMinimized = await el.evaluate((node) => node.isMinimized)
      expect(isMinimized).toBe(true)

      await minimizeBtn.click()
      isMinimized = await el.evaluate((node) => node.isMinimized)
      expect(isMinimized).toBe(false)
    })

    test('hides content when minimized', async ({ page }) => {
      const el = page.locator('#default')
      const minimizeBtn = el.locator('.control-button.minimize')

      await minimizeBtn.click()
      const contentDisplay = await el.evaluate((node) => {
        const content = node.shadowRoot.querySelector('.browser-content')
        return content?.style.display
      })
      expect(contentDisplay).toBe('none')
    })
  })

  test.describe('maximize', () => {
    test('starts not maximized', async ({ page }) => {
      const isMaximized = await page.locator('#default').evaluate((node) => node.isMaximized)
      expect(isMaximized).toBe(false)
    })

    test('toggles maximize state', async ({ page }) => {
      const el = page.locator('#default')
      const maximizeBtn = el.locator('.control-button.maximize')

      await maximizeBtn.click()
      let isMaximized = await el.evaluate((node) => node.isMaximized)
      expect(isMaximized).toBe(true)

      await maximizeBtn.click()
      isMaximized = await el.evaluate((node) => node.isMaximized)
      expect(isMaximized).toBe(false)
    })

    test('creates overlay when maximized', async ({ page }) => {
      const el = page.locator('#default')
      const maximizeBtn = el.locator('.control-button.maximize')

      await maximizeBtn.click()

      const hasOverlay = await el.evaluate((node) => node.overlay !== null)
      const isMaximized = await el.evaluate((node) => node.isMaximized)
      expect(hasOverlay).toBe(true)
      expect(isMaximized).toBe(true)
    })

    test('removes overlay when unmaximized', async ({ page }) => {
      const el = page.locator('#default')
      const maximizeBtn = el.locator('.control-button.maximize')

      await maximizeBtn.click()
      let hasOverlay = await el.evaluate((node) => node.overlay !== null)
      expect(hasOverlay).toBe(true)

      await maximizeBtn.click()
      hasOverlay = await el.evaluate((node) => node.overlay === null)
      expect(hasOverlay).toBe(true)
    })
  })

  test.describe('source view', () => {
    test('starts with source view hidden', async ({ page }) => {
      const showSource = await page.locator('#default').evaluate((node) => node.showSource)
      expect(showSource).toBe(false)
    })

    test('shows view source button when src is set', async ({ page }) => {
      const el = page.locator('#with-src')
      const viewSourceBtn = el.locator('.view-source-button')
      await expect(viewSourceBtn).toBeVisible()
    })
  })

  test.describe('slotted content', () => {
    test('renders slotted content', async ({ page }) => {
      const el = page.locator('#with-url')
      const slot = await el.evaluate((node) => {
        return node.shadowRoot.querySelector('slot') !== null
      })
      expect(slot).toBe(true)
    })
  })
})
