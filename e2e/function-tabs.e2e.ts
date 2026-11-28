import { expect, test } from '@playwright/test'
import ko from '../src/i18n/locales/ko.json' with { type: 'json' }
import en from '../src/i18n/locales/en.json' with { type: 'json' }
import type { ProgramDocument } from '../src/model/types'
const stageIds = [...Array.from({ length: 8 }, (_, i) => String(i + 1)), ...Array.from({ length: 6 }, (_, i) => `u2-${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `u3-${i + 1}`), 'u4-1', 'u4-2']

// Run with a Playwright config whose testDir is this directory and testMatch is
// Editor.test.browser.ts, against the development server. This mounts the real app;
// the hook harness in Editor.interaction.test.tsx remains a separate unit check.
for (const locale of ['ko', 'en']) for (const world of ['sketchbook', 'train', 'handheld']) for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }]) {
  test(`${locale} ${world} ${viewport.width}: mounted function editing follows the insertion tab`, async ({ page }) => {
    const strings = locale === 'ko' ? ko : en
    const t = (key: string, params: Record<string, string | number> = {}) => {
      const value = key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], strings)
      if (typeof value !== 'string') throw new Error(`Missing test translation: ${key}`)
      return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]))
    }
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize(viewport)
    await page.goto(`/?lang=${locale}`)
    await page.evaluate(ids => {
      const records: Record<string, { completed: boolean; bestStars: number; lastProgram: ProgramDocument }> = Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } }]))
      records['u4-2'].lastProgram = {
        main: [], functions: [
          { id: 'star', icon: 'star', body: [{ id: 'plain', type: 'forward' }, { id: 'repeat', type: 'repeat', count: 2, body: [] }] },
          { id: 'moon', icon: 'moon', body: [{ id: 'moon-plain', type: 'turnLeft' }] },
        ],
      }
      localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: records }))
    }, stageIds)
    await page.reload()
    const button = (name: string) => page.getByRole('button', { name, exact: true })
    // All records are complete so the world selector is available.
    await button(t('stageList')).click()
    await page.locator('.stage-card').filter({ hasText: t('u42Title') }).click()
    await button(t(`themes.${world}.switch`)).click()
    await button(t('functions.show.star')).click()
    await expect(button(t('functions.show.star'))).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-block-id="plain"]').click()
    await expect(button(t('blocks.forward'))).toBeVisible()
    await expect(button(t('blocks.forward'))).toBeEnabled()
    await button(t('blocks.forward')).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'main')
    await expect(page.locator('.main-panel .block-tile')).toHaveCount(1)
    await expect(page.locator('.main-panel .block-tile')).toBeVisible()
    await button(t('functions.show.star')).click()
    await page.locator('[data-block-id="repeat"]').click()
    const tools = page.getByRole('group', { name: t('tools'), exact: true })
    await expect(tools).toBeVisible()
    const namedAction = (key: string) => tools.getByRole('button', { name: t('action', { order: 2, name: t('blocks.repeat'), action: t(key) }), exact: true })
    await expect(namedAction('increase')).toBeVisible()
    await expect(namedAction('increase')).toBeEnabled()
    await namedAction('increase').focus(); await page.keyboard.press('Enter')
    await expect(page.locator('[data-block-id="repeat"] .repeat-count')).toHaveText('×3')
    await namedAction('decrease').click()
    await expect(page.locator('[data-block-id="repeat"] .repeat-count')).toHaveText('×2')
    await namedAction('select').click()
    await expect(namedAction('deselect')).toHaveAttribute('aria-pressed', 'true')
    await button(t('blocks.forward')).click()
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'body')
    await expect(page.locator('[data-function-id="star"] .block-tile')).toHaveCount(3)
    await namedAction('deselect').click()
    await expect(namedAction('select')).toHaveAttribute('aria-pressed', 'false')
    await button(t('blocks.turnRight')).click()
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'main')
    await expect(page.locator('.main-panel .block-tile')).toHaveCount(2)
    await button(t('functions.show.moon')).click()
    await expect(button(t('functions.show.moon'))).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-block-id="moon-plain"]').click()
    await button(t('blocks.forward')).click()
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'main')
    await expect(page.locator('.main-panel .block-tile')).toHaveCount(3)
    await button(t('functions.show.moon')).click()
    await button(t('functions.target.moon')).click()
    await expect(button(t('functions.call.star'))).toBeDisabled()
    await button(t('blocks.forward')).click()
    await expect(page.locator('[data-function-id="moon"] .block-tile')).toHaveCount(2)
    await page.locator('[data-block-id="moon-plain"]').click()
    await expect(tools).toBeVisible()
    await expect(page.locator('.main-panel')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/T46-${locale}-${world}-${viewport.width}.png` })
    // Restore a failing call to exercise the real result → fix → edit flow.
    await page.evaluate(() => {
      const progress = JSON.parse(localStorage.getItem('lealnspire.progress.v4')!)
      progress.stages['u4-2'].lastProgram = {
        main: [{ id: 'call-star', type: 'call', fn: 'star' }],
        functions: [{ id: 'star', icon: 'star', body: [{ id: 'failed-forward', type: 'forward' }] }],
      }
      localStorage.setItem('lealnspire.progress.v4', JSON.stringify(progress))
    })
    await page.reload()
    await button(t('stageList')).click()
    await page.locator('.stage-card').filter({ hasText: t('u42Title') }).click()
    await button(t(`themes.${world}.switch`)).click()
    await expect(page.locator('.palette .block-call svg')).toHaveCount(1)
    await expect(page.locator('.function-card header svg')).toHaveCount(1)
    await expect(page.locator('[data-block-id="call-star"] svg')).toHaveCount(1)
    await button(t('step')).click()
    await page.getByRole('dialog').getByRole('button', { name: t('fix'), exact: true }).click()
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'body')
    await expect(page.locator('[data-block-id="failed-forward"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(tools).toBeVisible()
    for (const control of await tools.getByRole('button').all()) {
      const box = await control.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    }
    await button(t('blocks.forward')).click()
    await expect(page.locator('.program-panels')).toHaveAttribute('data-panel', 'main')
    await expect(page.locator('.main-panel .block-tile')).toHaveCount(2)
    expect(errors).toEqual([])
  })
}
