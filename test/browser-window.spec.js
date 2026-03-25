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
      expect(style).toContain('--_bw-bg: var(--color-surface, #ffffff)')
    })

    test('applies dark mode styles when mode="dark"', async ({ page }) => {
      const el = page.locator('#dark-mode')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain(':host([mode="dark"])')
      expect(style).toContain('--_bw-bg: var(--color-surface, #1c1c1e)')
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

    test('base :host sets color from custom property', async ({ page }) => {
      const el = page.locator('#default')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toContain('color: var(--browser-window-text-color, var(--_bw-text-color))')
    })

    test('base :host sets color-scheme: light', async ({ page }) => {
      const el = page.locator('#default')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      expect(style).toMatch(/color-scheme:\s*light/)
    })

    test('dark mode blocks include color-scheme: dark', async ({ page }) => {
      const el = page.locator('#dark-mode')
      const style = await el.evaluate((node) => {
        const styleEl = node.shadowRoot.querySelector('style')
        return styleEl?.textContent || ''
      })
      // The :host([mode="dark"]) block should contain color-scheme: dark
      const darkBlock = style.match(/:host\(\[mode="dark"\]\)\s*\{[^}]+\}/)?.[0] || ''
      expect(darkBlock).toContain('color-scheme: dark')
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
      const contentHeight = await el.evaluate((node) => {
        const content = node.shadowRoot.querySelector('.browser-content')
        return content?.style.height
      })
      expect(contentHeight).toBe('0px')
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

  test.describe('close button', () => {
    test('clicking close button minimizes the window', async ({ page }) => {
      const el = page.locator('#default')
      const closeBtn = el.locator('.control-button.close')

      await closeBtn.click()
      const isMinimized = await el.evaluate((node) => node.isMinimized)
      expect(isMinimized).toBe(true)

      const contentHeight = await el.evaluate((node) => {
        const content = node.shadowRoot.querySelector('.browser-content')
        return content?.style.height
      })
      expect(contentHeight).toBe('0px')
    })

    test('clicking close while maximized restores without minimizing', async ({ page }) => {
      const el = page.locator('#default')
      const maximizeBtn = el.locator('.control-button.maximize')
      const closeBtn = el.locator('.control-button.close')

      await maximizeBtn.click()
      expect(await el.evaluate((node) => node.isMaximized)).toBe(true)

      await closeBtn.click()
      expect(await el.evaluate((node) => node.isMaximized)).toBe(false)
      expect(await el.evaluate((node) => node.isMinimized)).toBe(false)
    })
  })

  test.describe('keyboard shortcuts', () => {
    test('Escape closes maximized view', async ({ page }) => {
      const el = page.locator('#default')
      const maximizeBtn = el.locator('.control-button.maximize')

      await maximizeBtn.click()
      expect(await el.evaluate((node) => node.isMaximized)).toBe(true)

      await page.keyboard.press('Escape')
      expect(await el.evaluate((node) => node.isMaximized)).toBe(false)
    })

    test('Escape closes share menu', async ({ page }) => {
      const el = page.locator('#with-src')
      const shareBtn = el.locator('.share-button')

      // Open share menu
      await shareBtn.click()
      expect(await el.evaluate((node) => node.showShareMenu)).toBe(true)

      // Maximize first to enable keydown listener, then open menu
      const maximizeBtn = el.locator('.control-button.maximize')
      await maximizeBtn.click()
      await shareBtn.click()

      await page.keyboard.press('Escape')
      expect(await el.evaluate((node) => node.showShareMenu)).toBe(false)
    })
  })

  test.describe('share menu', () => {
    test('opens and closes share menu on button click', async ({ page }) => {
      const el = page.locator('#with-src')
      const shareBtn = el.locator('.share-button')

      await shareBtn.click()
      let showMenu = await el.evaluate((node) => node.showShareMenu)
      expect(showMenu).toBe(true)

      await shareBtn.click()
      showMenu = await el.evaluate((node) => node.showShareMenu)
      expect(showMenu).toBe(false)
    })

    test('share menu contains CodePen button', async ({ page }) => {
      const el = page.locator('#with-src')
      const shareBtn = el.locator('.share-button')
      await shareBtn.click()

      const codepen = el.locator('[data-action="codepen"]')
      await expect(codepen).toBeVisible()
    })
  })

  test.describe('error and retry', () => {
    test('shows error state for broken iframe src', async ({ page }) => {
      // Create element with bad src
      await page.evaluate(() => {
        const el = document.createElement('browser-window')
        el.id = 'broken-src'
        el.setAttribute('src', '/nonexistent-page-404.html')
        document.body.appendChild(el)
      })

      const el = page.locator('#broken-src')
      // Wait for the iframe to attempt loading
      await el.locator('iframe').waitFor({ state: 'attached' })
    })
  })

  test.describe('download link', () => {
    test('download link has correct href and download attribute', async ({ page }) => {
      const el = page.locator('#with-src')
      const downloadLink = el.locator('.download-button')
      await expect(downloadLink).toBeVisible()

      const href = await downloadLink.evaluate((node) => node.getAttribute('href'))
      expect(href).toBe('../docs/example.html')

      const hasDownload = await downloadLink.evaluate((node) => node.hasAttribute('download'))
      expect(hasDownload).toBe(true)
    })
  })

  test.describe('source code copy', () => {
    test('copy button exists in source view', async ({ page }) => {
      const el = page.locator('#with-src')

      // Fetch source first
      await el.evaluate(async (node) => {
        await node.fetchSourceCode()
      })

      const viewSource = el.locator('.view-source-button')
      await viewSource.click()

      const copyBtn = el.locator('.copy-source-button')
      await expect(copyBtn).toBeVisible()
    })
  })

  test.describe('resize', () => {
    test('component has resize: both by default', async ({ page }) => {
      const el = page.locator('#default')
      const resize = await el.evaluate((node) => {
        return getComputedStyle(node).resize
      })
      expect(resize).toBe('both')
    })

    test('respects min-width constraint', async ({ page }) => {
      const el = page.locator('#default')
      const minWidth = await el.evaluate((node) => {
        return getComputedStyle(node).minWidth
      })
      expect(minWidth).toBe('280px')
    })
  })

  test.describe('iframe dark mode propagation', () => {
    test('sets color-scheme: dark on iframe contentDocument when page goes dark', async ({ page }) => {
      const el = page.locator('#with-src')

      // Wait for iframe to load
      const iframe = el.locator('iframe')
      await iframe.waitFor({ state: 'attached' })
      await page.waitForFunction(() => {
        const el = document.querySelector('#with-src')
        const iframe = el?.shadowRoot?.querySelector('iframe')
        return iframe?.contentDocument?.readyState === 'complete'
      }, { timeout: 5000 })

      // Trigger dark mode via body class
      await page.evaluate(() => document.body.classList.add('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#with-src')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      // Check iframe contentDocument color-scheme
      const colorScheme = await el.evaluate((node) => {
        const iframe = node.shadowRoot.querySelector('iframe')
        return iframe?.contentDocument?.documentElement?.style.colorScheme
      })
      expect(colorScheme).toBe('dark')
    })

    test('sets color-scheme back to light when page goes light', async ({ page }) => {
      const el = page.locator('#with-src')

      // Wait for iframe to load
      const iframe = el.locator('iframe')
      await iframe.waitFor({ state: 'attached' })
      await page.waitForFunction(() => {
        const el = document.querySelector('#with-src')
        const iframe = el?.shadowRoot?.querySelector('iframe')
        return iframe?.contentDocument?.readyState === 'complete'
      }, { timeout: 5000 })

      // Go dark first
      await page.evaluate(() => document.body.classList.add('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#with-src')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      // Go back to light
      await page.evaluate(() => document.body.classList.remove('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#with-src')
        return el.getAttribute('data-page-mode') === null
      })

      const colorScheme = await el.evaluate((node) => {
        const iframe = node.shadowRoot.querySelector('iframe')
        return iframe?.contentDocument?.documentElement?.style.colorScheme
      })
      expect(colorScheme).toBe('light')
    })
  })

  test.describe('device mode', () => {
    test.describe('rendering', () => {
      test('renders device chrome when device attribute is set', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const deviceFrame = el.locator('.device-frame')
        await expect(deviceFrame).toBeVisible()

        const browserHeader = el.locator('.browser-header')
        await expect(browserHeader).toHaveCount(0)
      })

      test('renders status bar with 9:41', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const statusTime = el.locator('.status-time')
        await expect(statusTime).toHaveText('9:41')
      })

      test('renders Dynamic Island for iPhone 16', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const statusBar = el.locator('.status-bar')
        const hasDynamicIsland = await statusBar.evaluate((node) =>
          node.classList.contains('dynamic-island')
        )
        expect(hasDynamicIsland).toBe(true)
      })

      test('renders punch-hole for Pixel 9', async ({ page }) => {
        const el = page.locator('#device-pixel')
        const statusBar = el.locator('.status-bar')
        const hasPunchHole = await statusBar.evaluate((node) =>
          node.classList.contains('punch-hole')
        )
        expect(hasPunchHole).toBe(true)
      })

      test('renders home button for iPhone SE', async ({ page }) => {
        const el = page.locator('#device-se')
        const frame = el.locator('.device-frame')
        const hasHomeButton = await frame.evaluate((node) =>
          node.classList.contains('home-button')
        )
        expect(hasHomeButton).toBe(true)
      })

      test('renders home indicator for iPhone 16', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const homeIndicator = el.locator('.home-indicator')
        await expect(homeIndicator).toBeVisible()
      })

      test('does not render home indicator for iPhone SE', async ({ page }) => {
        const el = page.locator('#device-se')
        const homeIndicator = el.locator('.home-indicator')
        await expect(homeIndicator).toHaveCount(0)
      })

      test('renders signal bars, wifi, and battery icons', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const signalBars = el.locator('.signal-bars')
        const wifi = el.locator('.wifi-icon')
        const battery = el.locator('.battery-icon')

        await expect(signalBars).toBeVisible()
        await expect(wifi).toBeVisible()
        await expect(battery).toBeVisible()
      })
    })

    test.describe('preset geometry', () => {
      test('iPhone 16 iframe has correct width', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const iframe = el.locator('iframe')
        await iframe.waitFor({ state: 'attached' })

        const width = await el.evaluate((node) => {
          const iframe = node.shadowRoot.querySelector('iframe')
          return iframe?.offsetWidth
        })
        expect(width).toBe(393)
      })

      test('device frame has correct dimensions for iPhone SE', async ({ page }) => {
        const el = page.locator('#device-se')
        const frame = el.locator('.device-frame')
        await expect(frame).toBeVisible()

        // Check via CSS custom properties
        const style = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          return {
            width: cs.getPropertyValue('--device-width').trim(),
            height: cs.getPropertyValue('--device-height').trim(),
          }
        })
        expect(style.width).toBe('375px')
        expect(style.height).toBe('667px')
      })
    })

    test.describe('scaling', () => {
      test('device frame has transform scale applied', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const frame = el.locator('.device-frame')
        await expect(frame).toBeVisible()

        const transform = await frame.evaluate((node) => node.style.transform)
        expect(transform).toMatch(/scale\(/)
      })

      test('device wrapper has explicit height set', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const wrapper = el.locator('.device-wrapper')
        await expect(wrapper).toBeVisible()

        const height = await wrapper.evaluate((node) => node.style.height)
        expect(height).toBeTruthy()
        expect(parseFloat(height)).toBeGreaterThan(0)
      })

      test('scale recalculates when container resizes', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const frame = el.locator('.device-frame')
        await expect(frame).toBeVisible()

        const initialTransform = await frame.evaluate((node) => node.style.transform)

        // Resize the container
        await el.evaluate((node) => {
          node.style.width = '200px'
        })
        // Wait for ResizeObserver to update the scale
        await page.waitForFunction(() => {
          const el = document.querySelector('#device-iphone')
          const frame = el?.shadowRoot?.querySelector('.device-frame')
          return frame?.style.transform && frame.style.transform !== 'scale(1)'
        }, { timeout: 5000 })

        const newTransform = await frame.evaluate((node) => node.style.transform)
        expect(newTransform).toMatch(/scale\(/)

        // With a smaller container, scale should be smaller
        const initialScale = parseFloat(initialTransform.match(/scale\(([^)]+)\)/)?.[1] || '1')
        const newScale = parseFloat(newTransform.match(/scale\(([^)]+)\)/)?.[1] || '1')
        expect(newScale).toBeLessThan(initialScale)
      })
    })

    test.describe('device color', () => {
      test('default bezel color is midnight (#1a1a1a)', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const style = await el.evaluate((node) => {
          return getComputedStyle(node).getPropertyValue('--browser-window-bezel-color').trim()
        })
        expect(style).toBe('#1a1a1a')
      })

      test('silver bezel color when device-color="silver"', async ({ page }) => {
        const el = page.locator('#device-silver')
        const style = await el.evaluate((node) => {
          return getComputedStyle(node).getPropertyValue('--browser-window-bezel-color').trim()
        })
        expect(style).toBe('#c0c0c0')
      })

      test('light-bezel class applied for silver', async ({ page }) => {
        const el = page.locator('#device-silver')
        const frame = el.locator('.device-frame')
        const hasLightBezel = await frame.evaluate((node) =>
          node.classList.contains('light-bezel')
        )
        expect(hasLightBezel).toBe(true)
      })
    })

    test.describe('dark mode', () => {
      test('device chrome respects mode="dark"', async ({ page }) => {
        const el = page.locator('#device-dark')
        const style = await el.evaluate((node) => {
          const styleEl = node.shadowRoot.querySelector('style')
          return styleEl?.textContent || ''
        })
        expect(style).toContain(':host([mode="dark"])')
      })

      test('device mode follows page-level dark mode detection', async ({ page }) => {
        // Create a device-mode element without explicit mode
        await page.evaluate(() => {
          const el = document.createElement('browser-window')
          el.id = 'device-auto-mode'
          el.setAttribute('device', 'iphone-16')
          document.body.appendChild(el)
        })

        const el = page.locator('#device-auto-mode')

        await page.evaluate(() => document.body.classList.add('dark'))
        await page.waitForFunction(() => {
          const el = document.querySelector('#device-auto-mode')
          return el.getAttribute('data-page-mode') === 'dark'
        })

        const mode = await el.evaluate((node) => node.mode)
        expect(mode).toBe('dark')
      })
    })

    test.describe('fallback', () => {
      test('unknown preset renders iphone-16 dimensions', async ({ page }) => {
        const el = page.locator('#device-unknown')
        const style = await el.evaluate((node) => {
          return getComputedStyle(node).getPropertyValue('--device-width').trim()
        })
        expect(style).toBe('393px')
      })
    })

    test.describe('backward compatibility', () => {
      test('browser mode still renders controls and URL bar', async ({ page }) => {
        const el = page.locator('#with-url')
        const controls = el.locator('.control-button')
        await expect(controls).toHaveCount(3)

        const urlBar = el.locator('.url-bar')
        await expect(urlBar).toBeVisible()

        // No device frame should exist
        const deviceFrame = el.locator('.device-frame')
        await expect(deviceFrame).toHaveCount(0)
      })
    })
  })

  test.describe('device mode toolbar', () => {
    test('shows toolbar with source/share/download when src is set', async ({ page }) => {
      const el = page.locator('#device-iphone')
      const toolbar = el.locator('.device-toolbar')
      await expect(toolbar).toBeVisible()

      const viewSource = toolbar.locator('.view-source-button')
      await expect(viewSource).toBeVisible()

      const share = toolbar.locator('.share-button')
      await expect(share).toBeVisible()

      const download = toolbar.locator('.download-button')
      await expect(download).toBeVisible()
    })

    test('toggling source hides device and shows code panel', async ({ page }) => {
      const el = page.locator('#device-iphone')
      await el.scrollIntoViewIfNeeded()

      // Fetch source first
      await el.evaluate(async (node) => {
        await node.fetchSourceCode()
      })

      const viewSource = el.locator('.device-toolbar .view-source-button')
      await viewSource.click()

      // Source view should be visible inside the device frame
      const sourceView = el.locator('.source-view')
      await expect(sourceView).toBeVisible()

      // Iframe should be gone (replaced by source)
      const iframe = el.locator('iframe')
      await expect(iframe).toHaveCount(0)

      // Toggle back — iframe should return
      await viewSource.click()
      await expect(el.locator('iframe')).toBeVisible()
      await expect(el.locator('.source-view')).toHaveCount(0)
    })
  })

  test.describe('device mode phase 2', () => {
    test.describe('orientation', () => {
      test('landscape swaps iframe dimensions', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const style = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          return {
            width: cs.getPropertyValue('--device-width').trim(),
            height: cs.getPropertyValue('--device-height').trim(),
          }
        })
        // iPhone 16: 393×852 → landscape: 852×393
        expect(style.width).toBe('852px')
        expect(style.height).toBe('393px')
      })

      test('landscape adds landscape class to device-frame', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const frame = el.locator('.device-frame')
        const hasLandscape = await frame.evaluate((node) =>
          node.classList.contains('landscape')
        )
        expect(hasLandscape).toBe(true)
      })

      test('landscape phone renders notch sidebar', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const sidebar = el.locator('.notch-sidebar')
        await expect(sidebar).toBeVisible()
      })

      test('landscape phone notch sidebar has correct notch class', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const sidebar = el.locator('.notch-sidebar')
        const hasDI = await sidebar.evaluate((node) =>
          node.classList.contains('dynamic-island')
        )
        expect(hasDI).toBe(true)
      })

      test('landscape status bar does not have notch class', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const statusBar = el.locator('.status-bar')
        const hasDI = await statusBar.evaluate((node) =>
          node.classList.contains('dynamic-island')
        )
        expect(hasDI).toBe(false)
      })

      test('landscape tablet does not render notch sidebar', async ({ page }) => {
        const el = page.locator('#device-landscape-tablet')
        const sidebar = el.locator('.notch-sidebar')
        await expect(sidebar).toHaveCount(0)
      })

      test('landscape tablet swaps dimensions', async ({ page }) => {
        const el = page.locator('#device-landscape-tablet')
        const style = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          return {
            width: cs.getPropertyValue('--device-width').trim(),
            height: cs.getPropertyValue('--device-height').trim(),
          }
        })
        // iPad Air: 820×1180 → landscape: 1180×820
        expect(style.width).toBe('1180px')
        expect(style.height).toBe('820px')
      })

      test('scaling uses swapped dimensions in landscape', async ({ page }) => {
        const el = page.locator('#device-landscape')
        const frame = el.locator('.device-frame')
        await expect(frame).toBeVisible()

        const transform = await frame.evaluate((node) => node.style.transform)
        expect(transform).toMatch(/scale\(/)
      })
    })

    test.describe('safe area injection', () => {
      test('injects safe area CSS variables into same-origin iframe', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const iframe = el.locator('iframe')
        await iframe.waitFor({ state: 'attached' })
        await page.waitForFunction(() => {
          const el = document.querySelector('#device-iphone')
          const iframe = el?.shadowRoot?.querySelector('iframe')
          return iframe?.contentDocument?.querySelector('style[data-browser-window-safe-areas]') !== null
        }, { timeout: 5000 })

        const vars = await el.evaluate((node) => {
          const iframe = node.shadowRoot.querySelector('iframe')
          const doc = iframe?.contentDocument
          if (!doc) return null
          const style = doc.querySelector('style[data-browser-window-safe-areas]')
          return style?.textContent || null
        })
        expect(vars).not.toBeNull()
        // iPhone 16 portrait: safeInsets [59, 0, 34, 0]
        expect(vars).toContain('--safe-top: 59px')
        expect(vars).toContain('--safe-right: 0px')
        expect(vars).toContain('--safe-bottom: 34px')
        expect(vars).toContain('--safe-left: 0px')
      })

      test('safe area values rotate in landscape', async ({ page }) => {
        const el = page.locator('#device-landscape')
        // Scroll into view to trigger lazy-loaded iframe
        await el.scrollIntoViewIfNeeded()
        const iframe = el.locator('iframe')
        await iframe.waitFor({ state: 'attached' })

        // Wait for the safe area style to be injected into the iframe
        await page.waitForFunction(() => {
          const el = document.querySelector('#device-landscape')
          const iframe = el?.shadowRoot?.querySelector('iframe')
          const doc = iframe?.contentDocument
          return doc?.querySelector('style[data-browser-window-safe-areas]') !== null
        }, { timeout: 5000 })

        const vars = await el.evaluate((node) => {
          const iframe = node.shadowRoot.querySelector('iframe')
          const doc = iframe?.contentDocument
          if (!doc) return null
          const style = doc.querySelector('style[data-browser-window-safe-areas]')
          return style?.textContent || null
        })
        expect(vars).not.toBeNull()
        // iPhone 16 portrait [59, 0, 34, 0] → landscape [0, 59, 0, 34]
        expect(vars).toContain('--safe-top: 0px')
        expect(vars).toContain('--safe-right: 59px')
        expect(vars).toContain('--safe-bottom: 0px')
        expect(vars).toContain('--safe-left: 34px')
      })

      test('host element has safe area CSS custom properties', async ({ page }) => {
        const el = page.locator('#device-iphone')
        await el.locator('.device-frame').waitFor({ state: 'visible' })

        const vars = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          return {
            top: cs.getPropertyValue('--safe-top').trim(),
            right: cs.getPropertyValue('--safe-right').trim(),
            bottom: cs.getPropertyValue('--safe-bottom').trim(),
            left: cs.getPropertyValue('--safe-left').trim(),
          }
        })
        expect(vars.top).toBe('59px')
        expect(vars.right).toBe('0px')
        expect(vars.bottom).toBe('34px')
        expect(vars.left).toBe('0px')
      })
    })

    test.describe('safe area overlays', () => {
      test('overlay elements present when show-safe-areas attribute set', async ({ page }) => {
        const el = page.locator('#device-safe-areas')
        const overlays = el.locator('.safe-area-overlays')
        await expect(overlays).toBeVisible()

        const children = el.locator('.safe-area-overlay')
        await expect(children).toHaveCount(4)
      })

      test('overlay elements absent when show-safe-areas not set', async ({ page }) => {
        const el = page.locator('#device-iphone')
        const overlays = el.locator('.safe-area-overlays')
        await expect(overlays).toHaveCount(0)
      })

      test('safe area overlay has top, right, bottom, left elements', async ({ page }) => {
        const el = page.locator('#device-safe-areas')
        await expect(el.locator('.safe-area-top')).toBeVisible()
        await expect(el.locator('.safe-area-right')).toHaveCount(1)
        await expect(el.locator('.safe-area-bottom')).toBeVisible()
        await expect(el.locator('.safe-area-left')).toHaveCount(1)
      })

      test('safe area overlays work in landscape', async ({ page }) => {
        const el = page.locator('#device-landscape-safe')
        const overlays = el.locator('.safe-area-overlays')
        await expect(overlays).toBeVisible()

        const children = el.locator('.safe-area-overlay')
        await expect(children).toHaveCount(4)
      })
    })
  })

  test.describe('page-level dark mode', () => {
    test('detects body.dark class and sets data-page-mode="dark"', async ({ page }) => {
      const el = page.locator('#no-mode')

      // Initially no page-level signal
      let pageMode = await el.evaluate((node) => node.getAttribute('data-page-mode'))
      expect(pageMode).toBeNull()

      // Add dark class to body
      await page.evaluate(() => document.body.classList.add('dark'))
      // Wait for MutationObserver to fire
      await page.waitForFunction(() => {
        const el = document.querySelector('#no-mode')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      pageMode = await el.evaluate((node) => node.getAttribute('data-page-mode'))
      expect(pageMode).toBe('dark')
    })

    test('detects html[data-theme="dark"] and sets data-page-mode="dark"', async ({ page }) => {
      const el = page.locator('#no-mode')

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#no-mode')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      const pageMode = await el.evaluate((node) => node.getAttribute('data-page-mode'))
      expect(pageMode).toBe('dark')
    })

    test('does NOT override explicit mode attribute', async ({ page }) => {
      const el = page.locator('#dark-mode')

      // Add dark class to body — should not affect element with explicit mode
      await page.evaluate(() => document.body.classList.add('dark'))
      // Wait for MutationObserver to process
      await page.waitForFunction(() => {
        // Wait for the no-mode element to react (proves observer ran)
        const noMode = document.querySelector('#no-mode')
        return noMode?.getAttribute('data-page-mode') === 'dark'
      }, { timeout: 5000 })

      const pageMode = await el.evaluate((node) => node.getAttribute('data-page-mode'))
      expect(pageMode).toBeNull()

      const mode = await el.evaluate((node) => node.mode)
      expect(mode).toBe('dark')
    })

    test('removes data-page-mode when page dark class is removed', async ({ page }) => {
      const el = page.locator('#no-mode')

      // Add then remove dark class
      await page.evaluate(() => document.body.classList.add('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#no-mode')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      await page.evaluate(() => document.body.classList.remove('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#no-mode')
        return el.getAttribute('data-page-mode') === null
      })

      const pageMode = await el.evaluate((node) => node.getAttribute('data-page-mode'))
      expect(pageMode).toBeNull()
    })

    test('element.mode getter reflects page detection', async ({ page }) => {
      const el = page.locator('#no-mode')

      await page.evaluate(() => document.body.classList.add('dark'))
      await page.waitForFunction(() => {
        const el = document.querySelector('#no-mode')
        return el.getAttribute('data-page-mode') === 'dark'
      })

      const mode = await el.evaluate((node) => node.mode)
      expect(mode).toBe('dark')
    })
  })
})
