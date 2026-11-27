import { contrastOf, expect, Game, test } from './helpers'
import { allStages } from '../src/model/stages'
import type { Page } from '@playwright/test'

/** T73-3: 시범 통합 검증 — 가장 작은 화면, 키보드만, 낭독(컷마다 다른 한 문장), 영어, 실제 풀이와 이어지는 흐름 */
const entries: [string, string][] = [['1', 'add-run'], ['2', 'rotation'], ['5', 'repeat'], ['u2-1', 'condition'], ['u2-5', 'else'], ['u3-1', 'while'], ['u4-1', 'function'], ['u5-1', 'variable'], ['u6-1', 'logic'], ['u7-1', 'parameter'], ['u8-1', 'return'], ['u9-1', 'event'], ['u10-1', 'list'], ['u11-2', 'search']]

async function openStage(page: Page, g: Game, id: string, lang = '') {
  const index = allStages.findIndex(s => s.id === id)
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(sid => [sid, { completed: true, bestStars: 3 }])) })), allStages.slice(0, index).map(s => s.id))
  await page.goto('/' + lang)
  await g.press(page.getByRole('button', { name: lang ? 'Stages' : '스테이지 목록' }))
  await g.press(page.locator('.stage-card').nth(index))
}

test('360×560: 14종 모두 창이 화면 안, 모든 조작 버튼에 닿고(44px), 컷 문장 대비 3:1 이상', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 360, height: 560 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const g = new Game(page)
  await g.fresh()
  const problems: string[] = []
  for (const [id, demo] of entries) {
    await openStage(page, g, id)
    await g.press(page.getByRole('button', { name: '어떻게 하는지 보기' }))
    const dialog = page.getByRole('dialog')
    for (let i = 0; i < 3; i++) await g.press(dialog.getByRole('button', { name: '다음' }))
    const d = (await dialog.boundingBox())!
    if (d.y < 0 || d.y + d.height > 561 || d.x < 0 || d.x + d.width > 361) problems.push(`${demo}: 창이 화면 밖`)
    for (const b of await dialog.getByRole('button').all()) {
      await b.scrollIntoViewIfNeeded()
      const r = (await b.boundingBox())!
      if (Math.min(r.width, r.height) < 44) problems.push(`${demo}: '${await b.innerText()}' ${Math.round(r.width)}×${Math.round(r.height)}`)
      const hit = await b.evaluate(el => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!top && (el === top || el.contains(top)) })
      if (!hit) problems.push(`${demo}: '${await b.innerText()}' 가려짐`)
    }
    const ratio = await contrastOf(dialog.getByRole('status'))
    if (ratio !== null && ratio < 3) problems.push(`${demo}: 컷 문장 대비 ${ratio.toFixed(2)}`)
    await g.noHorizontalScroll()
    await page.screenshot({ path: `e2e-results/screens/demo-${demo}-360.png` })
    await g.press(dialog.getByRole('button', { name: '닫기' }))
  }
  expect(problems).toEqual([])
})

test('낭독: 14종 모두 컷마다 다른 한 문장이 상태 영역에 나온다(ko/en), 영어에는 한국어가 섞이지 않는다', async ({ page }) => {
  test.setTimeout(300_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const g = new Game(page)
  await g.fresh()
  const problems: string[] = []
  for (const lang of ['', '?lang=en']) {
    for (const [id, demo] of entries) {
      await openStage(page, g, id, lang)
      await g.press(page.getByRole('button', { name: lang ? 'See how it works' : '어떻게 하는지 보기' }))
      const dialog = page.getByRole('dialog')
      const status = dialog.getByRole('status')
      await expect(status).toHaveAttribute('aria-live', 'polite')
      const lines: string[] = []
      for (let i = 0; i < 4; i++) {
        lines.push((await status.innerText()).trim())
        if (i < 3) await g.press(dialog.getByRole('button', { name: lang ? 'Next' : '다음' }))
      }
      if (new Set(lines).size !== 4 || lines.some(line => !line)) problems.push(`${lang || 'ko'} ${demo}: 컷 문장 ${JSON.stringify(lines)}`)
      if (lang && /[가-힣]/.test(await dialog.innerText())) problems.push(`en ${demo}: 한국어 섞임`)
      await page.keyboard.press('Escape')
    }
  }
  expect(problems).toEqual([])
})

test('키보드만: Tab이 시범 창 안에서만 돌고, Shift+Tab도 되며, Esc로 닫으면 버튼으로 돌아온다(함수 시범)', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u4-1')
  const trigger = page.getByRole('button', { name: '어떻게 하는지 보기' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), `Tab ${i + 1}번째도 창 안`).toBe(true)
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), `Shift+Tab ${i + 1}번째도 창 안`).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('처음 온 아이: 2번에서 회전 시범을 본 뒤 직접 풀면 성공하고, 다시 와도 버튼이 강조되지 않는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, '2')
  const trigger = page.getByRole('button', { name: '어떻게 하는지 보기' })
  await expect(trigger).toHaveClass(/demo-suggested/)
  await g.press(trigger)
  await g.press(page.getByRole('dialog').getByRole('button', { name: '건너뛰기' }))
  expect(await g.blockCount(), '시범은 블록을 놓지 않음').toBe(0)
  await g.build('F F R F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  await page.goto('/')
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card').nth(1))
  if (await trigger.count()) await expect(trigger).not.toHaveClass(/demo-suggested/)
})

test('리스트 시범은 게임과 같이 번호를 0부터 센다(번호 0 · 번호 1)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u10-1')
  await g.press(page.getByRole('button', { name: '어떻게 하는지 보기' }))
  const dialog = page.getByRole('dialog')
  for (let i = 0; i < 2; i++) await g.press(dialog.getByRole('button', { name: '다음' }))
  await expect(dialog.getByText('번호 0', { exact: true })).toBeVisible()
  await expect(dialog.getByText('번호 1', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('status')).toContainText('번호는 0')
  await expect(dialog.getByText('번호 2', { exact: true }), '두 칸 리스트에 번호 2는 없음').toHaveCount(0)
})
