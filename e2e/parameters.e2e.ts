import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'
import { allStages, unit7Stages } from '../src/model/stages'

/** T60: 7단원 매개변수 — 같은 함수에 부를 때마다 다른 값을 건넨다. 건넨 값(◆)은 바깥 상자 A를 바꾸지 않는다 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit7Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  const u73 = { main: unit7Stages[2].initialProgram, functions: unit7Stages[2].initialFunctions }
  await page.evaluate(([ids, program]) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3, ...(id === 'u7-3' ? { lastProgram: program } : {}) }])) })), [[...before, ...extra], u73] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}
/** 별 함수(◆) = repeat ◆ [앞], 왼 — 처음부터 아이처럼 조립 */
async function buildStar(g: Game, page: Page) {
  await g.press(btn(page, '함수 만들기'))
  await g.press(btn(page, '별 함수가 값 받기'))
  await expect(btn(page, '별 함수가 값 받지 않기')).toHaveAttribute('aria-pressed', 'true')
  await g.press(btn(page, '별 함수 안에 넣기'))
  await g.add('N')
  const repeat = page.locator('.function-panel').getByRole('button', { name: /^1번 / }).first()
  await g.press(repeat)
  await g.press(btn(page, '횟수를 A로'))
  await g.press(btn(page, '건네받은 값으로 반복'))
  await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
  await g.add('L')
  await g.press(g.action(/선택 해제$|넣기 해제$/))
}

test.describe('7단원 매개변수', () => {
  test('u7-1: 별 함수에 A·2·A를 건네 두 맵을 통과하고, 실행 중 건넨 값과 상자 A가 따로 보인다', async ({ page }) => {
    const g = await open(page, '값 건네기')
    await buildStar(g, page)
    for (let i = 0; i < 3; i++) await g.press(btn(page, '별 함수 부르기'))
    // 1·3번 호출은 A, 2번 호출은 숫자 2
    for (const order of ['1', '3']) {
      await g.press(page.locator('.workspace').getByRole('button', { name: new RegExp(`^${order}번 별 함수 부르기`) }).first())
      if (await btn(page, 'A로').isVisible()) await g.press(btn(page, 'A로'))
    }
    await g.press(page.locator('.workspace').getByRole('button', { name: /^2번 별 함수 부르기/ }).first())
    await expect(page.locator('.workspace').getByRole('button', { name: /^2번 별 함수 부르기, 건네는 값 2/ }).first()).toBeVisible()
    expect(await g.blockCount(), '함수 몸체 3 + main 3').toBe(6)
    await page.screenshot({ path: 'e2e-results/screens/params-u71-built.png' })
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u7-3: 함수 안의 A를 ◆로 고치면 성공(오해 고치기), 고치기 전에는 실패', async ({ page }) => {
    const g = await open(page, '함수 안의 A', ['u7-1', 'u7-2'])
    expect(await g.runToEnd()).not.toContain('성공')
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
    const repeat = page.locator('.function-panel').getByRole('button', { name: /^1번 / }).first()
    await g.press(repeat)
    await g.press(btn(page, '건네받은 값으로 반복'))
    await page.screenshot({ path: 'e2e-results/screens/params-u73-fixed.png' })
    expect(await g.runToEnd()).toContain('7단원 완주')
  })

  test('한 단계: 두 번째 호출에서 건넨 값 3과 바깥 상자 A가 함께 보이고 A는 그대로', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, '함수 안의 A', ['u7-1', 'u7-2'])
    if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
    const repeat = page.locator('.function-panel').getByRole('button', { name: /^1번 / }).first()
    await g.press(repeat)
    await g.press(btn(page, '건네받은 값으로 반복'))
    for (let i = 0; i < 6; i++) await g.press(g.button('한 단계'))
    await expect(page.getByText(/별 함수에 3을? ?건넸어요|별 함수에 3를 건넸어요/).first()).toBeVisible()
    await expect(page.getByText(/상자 A는 2 그대로/).first()).toBeVisible()
    await page.screenshot({ path: 'e2e-results/screens/params-step-375.png' })
    await g.noHorizontalScroll()
  })
})

/** T60 QC: 7단원 배치 — 세 월드 × 1280/375/360. u7-3(미리 놓인 코드)에서 함수 패널을 보이게 한 상태 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 7단원 배치(맵 크기, 값 받기 버튼, 호출 타일 글자, 팔레트 겹침)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      // 다른 월드 버튼은 깬 스테이지에서만 보이므로 u7-3도 깬 상태로
      const g = await open(page, '함수 안의 A', ['u7-1', 'u7-2', 'u7-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const board = (await g.board.boundingBox())!
      expect(Math.min(board.width, board.height), '맵 120px 이상').toBeGreaterThanOrEqual(120)
      if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
      const socket = btn(page, /별 함수가 값 (받기|받지 않기)/)
      await expect(socket, '좁은 화면 함수 탭에서도 값 받기 버튼').toBeVisible()
      const s = (await socket.boundingBox())!
      expect(Math.min(s.width, s.height), '값 받기 버튼 44px').toBeGreaterThanOrEqual(44)
      // 호출 타일의 글자(★(A), ★(3))가 타일 안에 있다
      if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
      for (const tile of await page.locator('.workspace').getByRole('button', { name: /별 함수 부르기/ }).all()) {
        const overflow = await tile.evaluate(e => e.scrollWidth > e.clientWidth + 1 || [...e.querySelectorAll('*')].some(c => { const a = c.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.width > 0 && (a.right > b.right + 1 || a.left < b.left - 1) }))
        expect(overflow, `${await tile.getAttribute('aria-label')}: 글자가 타일 밖으로`).toBe(false)
      }
      // 팔레트 버튼이 블록 수 표시·안내 문장과 겹치지 않는다
      const texts = await page.locator('.block-budget p').all()
      for (const button of await page.locator('.palette button').all()) {
        const a = (await button.boundingBox())!
        for (const text of texts) {
          const b = (await text.boundingBox())!
          const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2
          expect(overlap, `팔레트 ${await button.getAttribute('aria-label')}가 블록 수 표시와 겹침`).toBe(false)
        }
      }
      await page.screenshot({ path: `e2e-results/screens/params-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}
