import { expect, Game, test } from './helpers'
import { unit6Stages } from '../src/model/stages'

const completed = ['1','2','3','4','5','6','7','8', ...[2,3,4,5].flatMap(n => Array.from({ length: n === 2 ? 6 : 3 }, (_, i) => `u${n}-${i + 1}`)), 'u6-1', 'u6-2']
async function open(page: import('@playwright/test').Page, name: string, replay = false) {
  const game = new Game(page)
  await game.fresh()
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } }])) })), completed)
  if (replay) await page.evaluate(program => {
    const progress = JSON.parse(localStorage.getItem('lealnspire.progress.v2')!)
    progress.stages['u6-3'] = { completed: true, bestStars: 3, lastProgram: { main: program, functions: [] } }
    localStorage.setItem('lealnspire.progress.v2', JSON.stringify(progress))
  }, unit6Stages[2].initialProgram!)
  await page.reload()
  await game.press(game.button('스테이지 목록'))
  await game.press(page.locator('.stage-card', { hasText: name }))
  return game
}
test('u6-3 조건을 고치고 검사 결과와 성공을 확인한다', async ({ page }) => {
  const game = await open(page, '논리 퍼즐 3')
  await game.select('1')
  await page.getByLabel('조건 조합').selectOption('and')
  await game.press(game.button('한 단계'))
  await expect(page.locator('.logic-results')).toContainText('and')
  await expect(page.locator('.logic-results')).toContainText('결과')
  await game.press(game.button('처음으로'))
  await game.speed('빠르게')
  await expect(game.dialog).toHaveCount(0)
  expect(await game.runToEnd()).toContain('성공')
})
test('선택 예측의 네 조합을 확인하고 다시 도전한다', async ({ page }) => {
  const game = await open(page, '논리 퍼즐 1')
  await game.press(game.button('스테이지 목록'))
  await game.press(page.locator('li', { has: page.locator('.stage-card', { hasText: '논리 퍼즐 1' }) }).locator('.prediction-entry'))
  for (const select of await page.locator('.logic-prediction select').all()) await select.selectOption('true')
  await game.press(game.button('답 확인'))
  await expect(page.locator('.logic-prediction')).toContainText('✕')
  await game.press(game.button('다시 고르기'))
})
test('@layout 영어와 좁은 화면에서 조건 편집을 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  const game = await open(page, '논리 퍼즐 3')
  await game.select('1')
  await expect(page.getByLabel('조건 조합')).toBeVisible()
  await page.screenshot({ path: 'e2e-results/screens/logic-narrow.png' })
})
test('u6-1에서 조건과 두 갈래를 만들어 모든 맵을 통과한다', async ({ page }) => {
  const game = await open(page, '논리 퍼즐 1')
  await game.press(page.locator('.palette').getByRole('button', { name: '앞이 막혔으면' }))
  await game.select('1')
  await page.getByLabel('조건 조합').selectOption('and')
  await page.getByLabel('첫 조건').selectOption('clearAhead')
  await page.getByLabel('둘째 조건').selectOption('aIsZero')
  await game.press(game.action(/추가 대상으로 선택$|안에 넣기$/))
  await game.add('F')
  await game.select('1')
  await game.press(page.getByRole('button', { name: 'else 추가' }))
  await game.press(game.action(/else 안에 넣기$/))
  await game.add('L'); await game.add('F')
  await game.speed('빠르게')
  expect(await game.runToEnd()).toContain('성공')
})
test('영어 조건 이름을 표시한다', async ({ page }) => {
  await open(page, '논리 퍼즐 3')
  await page.goto('/?lang=en')
  await page.getByRole('button', { name: 'Stages' }).click()
  await page.locator('.stage-card', { hasText: 'Logic puzzle 3' }).click()
  await page.locator('.workspace [data-block-id]').first().click()
  await expect(page.getByLabel('Condition operator')).toBeVisible()
})

const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width} 조건 타일 경계`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const game = await open(page, '논리 퍼즐 3', true)
      await game.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const tile = game.tile('1')
      const label = tile.locator('.logic-condition')
      await expect(label).toBeVisible()
      const box = await tile.boundingBox()
      const textBox = await label.boundingBox()
      expect(box).not.toBeNull()
      expect(textBox).not.toBeNull()
      expect(textBox!.x).toBeGreaterThanOrEqual(box!.x)
      expect(textBox!.y).toBeGreaterThanOrEqual(box!.y)
      expect(textBox!.x + textBox!.width).toBeLessThanOrEqual(box!.x + box!.width)
      expect(textBox!.y + textBox!.height).toBeLessThanOrEqual(box!.y + box!.height)
    })
  }
}
test('검사 결과에 or와 not 반전 전후를 표시한다', async ({ page }) => {
  const game = await open(page, '논리 퍼즐 3')
  await game.select('1')
  await page.getByLabel('첫 조건').locator('..').locator('..').getByRole('checkbox').check()
  await game.press(game.button('한 단계'))
  await expect(page.locator('.logic-results')).toContainText('or')
  await expect(page.locator('.logic-results')).toContainText(/앞이 열림:.*→ not:/)
})
