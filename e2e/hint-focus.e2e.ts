import { expect, Game, test } from './helpers'
import { allStages } from '../src/model/stages'
import type { Page } from '@playwright/test'

/** T74: 힌트 단계마다 실제로 볼 곳을 강조 — 리스트·비교·신호·상자 A·작업 공간·블록 상자. 힌트는 코드를 바꾸지 않는다 */
async function openStage(page: Page, g: Game, id: string) {
  const index = allStages.findIndex(s => s.id === id)
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(sid => [sid, { completed: true, bestStars: 3 }])) })), allStages.slice(0, index).map(s => s.id))
  await page.goto('/')
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card').nth(index))
}
const hint = (page: Page) => page.locator('#stage-hint')
const focused = (page: Page) => page.locator('[data-hint-focus]')

test('리스트 고치기(u10-2): 힌트 1·2단계 모두 리스트 칸을 강조하고, 맵은 강조하지 않으며, 미리 놓인 코드는 그대로', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u10-2')
  const before = await g.blockCount()
  await g.press(g.button('힌트'))
  await expect(hint(page)).toContainText('번호와 안에 든 값')
  await expect(hint(page)).toContainText('볼 곳: 리스트')
  await expect(page.locator('.list-state')).toHaveAttribute('data-hint-focus', 'list')
  await expect(g.board.locator('.board-hint'), '맵 강조 없음').toHaveCount(0)
  await page.screenshot({ path: 'e2e-results/screens/hint-focus-list.png' })
  await g.press(g.button('다음 힌트'))
  await expect(hint(page)).toContainText('2/2')
  await expect(page.locator('.list-state')).toHaveAttribute('data-hint-focus', 'list')
  expect(await g.blockCount(), '힌트는 코드를 바꾸지 않음').toBe(before)
  await g.press(g.button('힌트 닫기'))
  await expect(focused(page), '닫으면 강조 해제').toHaveCount(0)
})

test('탐색(u11-2): 1단계는 비교(리스트 줄), 2단계는 작업 공간으로 시선이 옮겨 간다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u11-2')
  await g.press(g.button('힌트'))
  await expect(hint(page)).toContainText('볼 곳: 비교')
  await expect(page.locator('.list-state')).toHaveAttribute('data-hint-focus', 'search')
  await g.press(g.button('다음 힌트'))
  await expect(hint(page)).toContainText('볼 곳: 작업 공간')
  await expect(page.locator('.list-state')).not.toHaveAttribute('data-hint-focus', /.+/)
  await expect(page.locator('.workspace-shell')).toHaveAttribute('data-hint-focus', 'workspace')
  await page.screenshot({ path: 'e2e-results/screens/hint-focus-search.png' })
})

test('이벤트(u9-2)는 신호 줄, 상자 A(u5-3)는 상자, 1번 2단계는 블록 상자를 강조한다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u9-2')
  await g.press(g.button('힌트'))
  await expect(page.locator('.event-state')).toHaveAttribute('data-hint-focus', 'signals')
  await expect(hint(page)).toContainText('볼 곳: 신호')
  await openStage(page, g, 'u5-3')
  await expect(hint(page), '다른 스테이지로 가면 닫힘').toHaveCount(0)
  await g.press(g.button('힌트'))
  await expect(page.locator('.variable-box')).toHaveAttribute('data-hint-focus', 'variables')
  await openStage(page, g, '1')
  await g.press(g.button('힌트'))
  expect(await g.board.locator('.board-hint').count(), '1단계는 맵').toBeGreaterThan(0)
  await g.press(g.button('다음 힌트'))
  await expect(page.locator('.palette')).toHaveAttribute('data-hint-focus', 'palette')
})

test('키보드만: 힌트 열기·다음·닫기로 강조가 따라 바뀌고 포커스를 잃지 않는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await openStage(page, g, 'u10-3')
  await g.button('힌트').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.list-state')).toHaveAttribute('data-hint-focus', 'list')
  await page.getByRole('button', { name: '다음 힌트' }).focus()
  await page.keyboard.press('Enter')
  await expect(hint(page)).toContainText('2/2')
  await page.getByRole('button', { name: '힌트 닫기' }).focus()
  await page.keyboard.press('Enter')
  await expect(focused(page)).toHaveCount(0)
})

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
  test(`@layout ${viewport.width}: 힌트 강조를 켜도 실행 버튼이 보이고 가로 스크롤·겹침 없음(세 월드)`, async ({ page }) => {
    test.setTimeout(120_000) // 스테이지 6개를 차례로 열어 전체 실행 중 부하에서 30초를 넘김
    await page.setViewportSize(viewport)
    const g = new Game(page)
    await g.fresh()
    for (const id of ['u10-1', 'u10-2', 'u10-3', 'u11-1', 'u9-2', 'u5-3']) {
      await openStage(page, g, id)
      await g.press(g.button('힌트'))
      await expect(hint(page)).toContainText('볼 곳')
      await g.noHorizontalScroll()
      const run = page.locator('.run-button')
      const r = (await run.boundingBox())!
      expect(r.y + r.height, `${id} 실행 버튼이 화면 안`).toBeLessThanOrEqual(viewport.height + 1)
      const label = (await page.locator('.hint-target-label').boundingBox())!
      const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('#stage-hint'), [label.x + 4, label.y + label.height / 2])
      expect(hit, `${id} '볼 곳' 안내가 가려지지 않음`).toBe(true)
      await page.screenshot({ path: `e2e-results/screens/hint-focus-${id}-${viewport.width}.png` })
    }
  })
}
