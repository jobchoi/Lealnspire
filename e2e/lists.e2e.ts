import type { Locator, Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'
import { allStages, unit10Stages } from '../src/model/stages'

/** T69: 10단원 리스트 — 값을 앞에서부터 하나씩 꺼내 쓰고(순회), 번호는 0부터, 길이는 칸 수 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit10Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  const u102 = { main: unit10Stages[1].initialProgram, functions: [] }
  await page.evaluate(([ids, program]) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3, ...(id === 'u10-2' ? { lastProgram: program } : {}) }])) })), [[...before, ...extra], u102] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}
const tile = (page: Page, order: string) => page.locator('.workspace').getByRole('button', { name: new RegExp(`^${order.replace('.', '\\.')}번 `) }).first()
async function cycle(g: Game, target: Locator, button: Locator, want: RegExp) {
  for (let i = 0; i < 6 && !want.test((await target.getAttribute('aria-label')) ?? ''); i++) await g.press(button)
  await expect(target).toHaveAttribute('aria-label', want)
}

test.describe('10단원 리스트', () => {
  test('u10-1: for each 안의 repeat ▣로 맵마다 다른 구간 길이를 순서대로 써서 두 맵 통과', async ({ page }) => {
    const g = await open(page, '하나씩 꺼내요')
    await g.press(page.locator('.palette').getByRole('button', { name: /리스트/ }).first())
    await g.press(tile(page, '1'))
    await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/))
    await g.add('N')
    await g.press(tile(page, '1.1'))
    await cycle(g, tile(page, '1.1'), btn(page, '반복에 쓸 값 바꾸기'), /지금 꺼낸 값/)
    await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    // T60 복귀 규칙: 반복에서 나오면 for each 몸체가 다시 추가 위치
    await g.add('L')
    expect(await g.blockCount(), 'for each, repeat, 앞으로, 왼쪽').toBe(4)
    await page.screenshot({ path: 'e2e-results/screens/lists-u101-built.png' })
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u10-2: 첫 칸 번호는 0 — set A←1을 0으로 고치면 성공', async ({ page }) => {
    const g = await open(page, '첫 칸의 번호', ['u10-1'])
    expect(await g.runToEnd(), 'A=1이면 둘째 값을 읽어 충돌').not.toContain('성공')
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    await g.press(tile(page, '1'))
    await g.press(g.action(/값 줄이기$/))
    await expect(tile(page, '1')).toHaveAttribute('aria-label', /0/)
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u10-3: 값이 아니라 길이 — repeat length(L)로 두 맵 통과, 10단원 완주', async ({ page }) => {
    const g = await open(page, '값 말고 길이', ['u10-1', 'u10-2'])
    await g.add('N')
    await g.press(tile(page, '1'))
    await cycle(g, tile(page, '1'), btn(page, '반복에 쓸 값 바꾸기'), /length|길이/)
    await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.add('L'); await g.add('F')
    expect(await g.runToEnd()).toContain('10단원 완주')
  })

  test('한 단계(375): 번호와 값이 따로 보이고 순회 포인터가 움직인다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, '첫 칸의 번호', ['u10-1'])
    await expect(page.getByText(/번호 0/).first()).toBeVisible()
    await expect(page.getByText(/length 2/).first()).toBeVisible()
    await g.press(g.button('한 단계')); await g.press(g.button('한 단계'))
    await expect(page.getByText(/L\[A\]: 번호 1/).first()).toBeVisible()
    await page.screenshot({ path: 'e2e-results/screens/lists-step-375.png' })
    await g.noHorizontalScroll()
  })
})

/** 10단원 배치·대비 — 세 월드 × 1280/375/360 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 10단원 배치(맵, 리스트 칸, 대비, 스크롤)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = await open(page, '첫 칸의 번호', ['u10-1', 'u10-2', 'u10-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const board = (await g.board.boundingBox())!
      expect(Math.min(board.width, board.height), '맵 크기').toBeGreaterThanOrEqual(viewport.height < 600 ? 70 : 100)
      for (const button of await page.locator('.palette button').all()) {
        const shown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(); return r.width > 2 && r.height > 2 })
        if (shown) expect(await contrastOf(button), `${world} 팔레트 ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      for (const t of await page.locator('.workspace').getByRole('button', { name: /번 / }).all()) {
        if (!(await t.isVisible())) continue
        const overflow = await t.evaluate(e => [...e.querySelectorAll('*')].filter(c => !c.closest('.repeat-ribbon')).some(c => { const a = c.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.width > 0 && (a.right > b.right + 1 || a.left < b.left - 1) }))
        expect(overflow, `${await t.getAttribute('aria-label')}: 글자가 타일 밖으로`).toBe(false)
        expect(await contrastOf(t), `${world} ${await t.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), '세로 스크롤 없음').toBeLessThanOrEqual(viewport.width >= 1000 ? 0 : 99999)
      await page.screenshot({ path: `e2e-results/screens/lists-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}
