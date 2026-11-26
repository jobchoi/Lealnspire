import type { Locator, Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'
import { allStages, unit8Stages } from '../src/model/stages'

/** T63: 8단원 반환값 — 함수가 센 값을 return으로 돌려주고, repeat가 그 값만큼 반복한다. return 뒤 블록은 실행되지 않는다 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit8Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  const u83 = { main: unit8Stages[2].initialProgram, functions: unit8Stages[2].initialFunctions }
  await page.evaluate(([ids, program]) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3, ...(id === 'u8-3' ? { lastProgram: program } : {}) }])) })), [[...before, ...extra], u83] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}
/** 원천 바꾸기 버튼을 눌러 타일 이름이 원하는 값이 될 때까지(최대 5번) */
async function cycle(g: Game, tile: Locator, button: Locator, want: RegExp) {
  for (let i = 0; i < 5 && !want.test((await tile.getAttribute('aria-label')) ?? ''); i++) await g.press(button)
  await expect(tile).toHaveAttribute('aria-label', want)
}

test.describe('8단원 반환값', () => {
  test('u8-1: 별 함수가 앞 칸 수를 돌려주고, repeat [★()]가 그만큼 반복해 두 맵을 통과한다', async ({ page }) => {
    const g = await open(page, '돌려받아 움직이기')
    await g.press(btn(page, '함수 만들기'))
    await g.press(btn(page, '별 함수 안에 넣기'))
    await g.press(page.locator('.palette').getByRole('button', { name: /값 돌려주기/ }))
    const ret = page.locator('.function-panel').getByRole('button', { name: /^1번 값 돌려주기/ }).first()
    await g.press(ret)
    await cycle(g, ret, btn(page, '반환값 원천 바꾸기'), /앞 칸 수/)
    await g.press(g.action(/선택 해제$|넣기 해제$/))
    if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
    await g.add('N')
    const repeat = page.locator('.workspace').getByRole('button', { name: /^1번 / }).first()
    await g.press(repeat)
    await cycle(g, repeat, btn(page, '반복 횟수 원천 바꾸기'), /별/)
    await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.add('L'); await g.add('F')
    expect(await g.blockCount(), '함수 1 + main 4').toBe(5)
    await page.screenshot({ path: 'e2e-results/screens/returns-u81-built.png' })
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u8-3: return 뒤의 R은 실행되지 않음 — return을 앞으로 옮겨 고치면 8단원 완주', async ({ page }) => {
    const g = await open(page, 'return 뒤에는?', ['u8-1', 'u8-2'])
    expect(await g.runToEnd(), '처음 코드: 남쪽을 세어 0칸').not.toContain('성공')
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
    // 함수 몸체: R, return → return을 앞으로 옮김
    await g.press(page.locator('.function-panel').getByRole('button', { name: /^2번 값 돌려주기/ }).first())
    await g.press(g.action(/앞으로 옮기기$/))
    await page.screenshot({ path: 'e2e-results/screens/returns-u83-fixed.png' })
    expect(await g.runToEnd()).toContain('8단원 완주')
  })

  test('한 단계: 돌려받은 값이 알림으로 보이고, return 뒤 블록은 "실행 안 함"으로 표시된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, 'return 뒤에는?', ['u8-1', 'u8-2'])
    if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
    await g.press(page.locator('.function-panel').getByRole('button', { name: /^2번 값 돌려주기/ }).first())
    await g.press(g.action(/앞으로 옮기기$/))
    for (let i = 0; i < 8 && !(await page.getByText(/별 함수가 \d+를 돌려줬어요/).count()); i++) await g.press(g.button('한 단계'))
    await expect(page.getByText(/별 함수가 2를 돌려줬어요/).first()).toBeVisible()
    await page.screenshot({ path: 'e2e-results/screens/returns-step-375.png' })
    await expect(page.getByText('이번 호출에서 실행 안 함').first()).toBeVisible()
    await g.noHorizontalScroll()
  })
})

/** 8단원 배치·대비 — 세 월드 × 1280/375/360 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 8단원 배치(맵 크기, 타일 글자, 팔레트 겹침, 대비)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = await open(page, 'return 뒤에는?', ['u8-1', 'u8-2', 'u8-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const board = (await g.board.boundingBox())!
      expect(Math.min(board.width, board.height), '맵 120px 이상').toBeGreaterThanOrEqual(120)
      for (const button of await page.locator('.palette button').all()) {
        const labelShown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(); return r.width > 2 && r.height > 2 })
        if (labelShown) expect(await contrastOf(button), `${world} 팔레트 ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
        const a = (await button.boundingBox())!
        for (const text of await page.locator('.block-budget p').all()) {
          const b = (await text.boundingBox())!
          const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2
          expect(overlap, `팔레트 ${await button.getAttribute('aria-label')}가 블록 수 표시와 겹침`).toBe(false)
        }
      }
      if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
      for (const tile of await page.locator('.function-panel, .workspace').getByRole('button', { name: /값 돌려주기|별 함수/ }).all()) {
        if (!(await tile.isVisible())) continue
        const overflow = await tile.evaluate(e => [...e.querySelectorAll('*')].some(c => { const a = c.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.width > 0 && (a.right > b.right + 1 || a.left < b.left - 1) }))
        expect(overflow, `${await tile.getAttribute('aria-label')}: 글자가 타일 밖으로`).toBe(false)
        expect(await contrastOf(tile), `${world} ${await tile.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      await page.screenshot({ path: `e2e-results/screens/returns-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}
