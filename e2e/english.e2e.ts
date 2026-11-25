import type { Page } from '@playwright/test'
import { expect, fontsReady, test } from './helpers'

/** T35: 영어 화면. 한국어가 섞이지 않고, 영어 이름만으로 끝까지 플레이되며, 선택한 언어가 유지된다 */

const press = async (page: Page, name: string | RegExp) => {
  const l = page.getByRole('button', { name, exact: typeof name === 'string' }).first()
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await l.tap(); else await l.click()
}
const hangul = (page: Page) => page.evaluate(() => {
  const found: string[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent ?? ''; const el = n.parentElement!
    if (/[가-힣]/.test(t) && el.getClientRects().length && !el.closest('[lang="ko"]')) found.push(t.trim().slice(0, 30))
  }
  for (const e of document.querySelectorAll('[aria-label],[title]')) for (const a of ['aria-label', 'title']) {
    const v = e.getAttribute(a); if (v && /[가-힣]/.test(v) && !e.closest('[lang="ko"]')) found.push(`${a}: ${v.slice(0, 30)}`)
  }
  return found
})

test.describe('영어 화면', () => {
  test('?lang=en: 한국어 없이 1번을 풀고, 실패·고치기·힌트도 영어, html lang=en', async ({ page }) => {
    await page.goto('/?lang=en')
    await page.evaluate(() => localStorage.clear()); await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await hangul(page), '홈에 한국어 없음(언어 선택 버튼의 "한국어" 제외)').toEqual([])
    await press(page, 'Start')
    await press(page, 'Hint')
    await expect(page.locator('#stage-hint')).toContainText('Count the cells')
    const add = (n: string) => page.locator('.palette').getByRole('button', { name: n, exact: true }).first().click()
    await add('Move forward'); await add('Turn right'); await add('Move forward')
    await press(page, 'Fast')
    await press(page, 'Run')
    await expect(page.getByRole('dialog')).toContainText('hit a wall', { timeout: 20_000 })
    expect(await hangul(page), '결과 창·게임 화면에 한국어 없음').toEqual([])
    await press(page, 'Fix')
    await expect(page.getByRole('button', { name: /^Block 3: Move forward/ })).toHaveAttribute('aria-pressed', 'true')
    await press(page, /^Block 2: Turn right/); await press(page, /Remove$/)
    await press(page, 'Run')
    await expect(page.getByRole('dialog')).toContainText('You did it!', { timeout: 20_000 })
  })

  test('언어 버튼으로 바꾸면 새로고침 뒤에도 유지되고, 영어 안내 페이지로 연결된다', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear()); await page.reload()
    await press(page, /언어 바꾸기|Change language/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.reload()
    await expect(page.locator('html'), '선택 유지').toHaveAttribute('lang', 'en')
    await press(page, 'About my progress')
    const link = page.getByRole('link', { name: 'Guide for teachers and parents' })
    await expect(link).toHaveAttribute('href', /guide-en\.html$/)
    await link.click()
    await expect(page.locator('h1')).toContainText('Guide for Teachers and Parents')
    await page.getByRole('link', { name: 'Back to the app' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  for (const world of ['Crayon Sketchbook', 'Train Town', 'Pocket Console']) {
    test(`@layout 영어 ${world}: 버튼 글자가 잘리거나 한 글자씩 쪼개지지 않는다`, async ({ page }) => {
      await page.goto('/?lang=en')
      await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [{ id: 'a', type: 'forward' }, { id: 'r', type: 'repeat', count: 3, body: [{ id: 'b', type: 'turnLeft' }] }] } } })))
      await page.reload()
      await press(page, 'Stages')
      await page.locator('.stage-card').first().click()
      await press(page, `Switch to the ${world} world`)
      await page.getByRole('button', { name: /^Block 2: repeat/ }).first().click()
      await fontsReady(page)
    const bad = await page.locator('button:visible').evaluateAll(es => es.flatMap(e => {
        const r = e.getBoundingClientRect(); const label = e.getAttribute('aria-label') ?? e.textContent?.trim() ?? ''
        const issues: string[] = []
        if (r.width < 44 || r.height < 44) issues.push(`${label}: ${Math.round(r.width)}x${Math.round(r.height)}`)
        const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = n.textContent?.trim(); if (!text) continue
          const range = document.createRange(); range.selectNodeContents(n)
          const rects = [...range.getClientRects()]
          if (rects.some(t => t.width && (t.top < r.top - 1 || t.bottom > r.bottom + 1 || t.left < r.left - 1 || t.right > r.right + 1))) issues.push(`${label}: 글자 잘림(${text})`)
          // 한 단어(공백 없는 짧은 라벨)가 여러 줄로 쪼개짐
          if (!text.includes(' ') && text.length <= 12 && new Set(rects.map(t => Math.round(t.top))).size > 1) issues.push(`${label}: 단어 쪼개짐(${text})`)
        }
        return issues
      }))
      expect(bad).toEqual([])
      expect(await page.evaluate(() => window.scrollY), '페이지 스크롤 없음').toBe(0)
    })
  }
})
