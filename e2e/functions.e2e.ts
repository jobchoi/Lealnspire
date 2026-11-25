import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'

/** T45: 4단원 함수 — 같은 모양을 한 번 만들고 여러 번 부른다. 정의만 하면 실행되지 않는다 */
const before = JSON.stringify({ version: 1, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1', 'u2-2', 'u2-3', 'u2-4', 'u2-5', 'u2-6', 'u3-1', 'u3-2', 'u3-3'].map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(([v, ids]) => { const s = JSON.parse(v as string); for (const id of ids as string[]) s.stages[id] = { completed: true, bestStars: 3, lastProgram: [] }; localStorage.setItem('lealnspire.progress', JSON.stringify(s)) }, [before, extra] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}

test.describe('4단원 함수', () => {
  test('u4-1: 별 함수(앞·왼·앞)를 한 번 만들고 세 번 불러 도착, 함수 안에서는 함수를 부를 수 없다', async ({ page }) => {
    const g = await open(page, '같은 모양 찾기')
    await expect(btn(page, '별 함수 부르기'), '함수를 만들기 전에는 부르기 버튼 없음').toHaveCount(0)
    await g.press(btn(page, '함수 만들기'))
    await g.press(btn(page, '별 함수 안에 넣기'))
    await g.add('F'); await g.add('L'); await g.add('F')
    await expect(btn(page, '별 함수 부르기'), '함수 몸체에는 호출을 넣을 수 없음').toBeDisabled()
    await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.press(btn(page, '별 함수 부르기')); await g.add('F'); await g.add('R')
    await g.press(btn(page, '별 함수 부르기')); await g.press(btn(page, '별 함수 부르기'))
    expect(await g.blockCount(), '함수 몸체 3 + main 5').toBe(8)
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('재생 중 함수가 실행되면 함수 카드와 그 호출이 함께 "실행 중"으로 표시된다', async ({ page }) => {
    const g = await open(page, '같은 모양 찾기')
    await g.press(btn(page, '함수 만들기'))
    await g.press(btn(page, '별 함수 안에 넣기')); await g.add('F'); await g.add('L'); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.press(btn(page, '별 함수 부르기'))
    await g.press(g.button('한 단계'))
    await expect(page.getByText('실행 중').filter({ visible: true }).first(), '실행 중 표시(좁은 화면은 함수 탭으로 자동 전환)').toBeVisible()
  })

  test('u4-3: 함수는 만들어져 있지만 부르지 않아 로봇이 쉰다 → 호출을 넣어 4단원 완주', async ({ page }) => {
    const g = await open(page, '부르지 않으면 쉬어요', ['u4-1', 'u4-2'])
    expect(await g.runToEnd(), '움직이지 않아 도착 못 함').toContain('도달하지')
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    // 정답 main: A F A A
    await g.press(btn(page, '별 함수 부르기')); await g.add('F'); await g.press(btn(page, '별 함수 부르기')); await g.press(btn(page, '별 함수 부르기'))
    expect(await g.runToEnd()).toContain('4단원 완주')
  })

  test('함수 지우기는 그 함수를 부르는 블록도 지우고, 되돌리기로 함께 돌아온다', async ({ page }) => {
    const g = await open(page, '같은 모양 찾기')
    await g.press(btn(page, '함수 만들기'))
    await g.press(btn(page, '별 함수 안에 넣기')); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.press(btn(page, '별 함수 부르기')); await g.press(btn(page, '별 함수 부르기'))
    expect(await g.blockCount()).toBe(3)
    if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기')) // 좁은 화면: 함수 탭에서 지움
    await g.press(btn(page, '별 함수 지우기'))
    expect(await g.blockCount(), '몸체와 호출 2개가 함께 지워짐').toBe(0)
    await g.press(g.button('되돌리기'))
    expect(await g.blockCount()).toBe(3)
  })

  test('@layout 4단원 화면(함수 패널 포함)도 맵·팔레트·실행 버튼이 보이고 가로 스크롤이 없다', async ({ page }, info) => {
    const g = await open(page, '같은 모양 찾기')
    await g.press(btn(page, '함수 만들기'))
    await g.press(btn(page, '별 함수 안에 넣기')); await g.add('F'); await g.add('L'); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.press(btn(page, '별 함수 부르기')); await g.add('F'); await g.add('R'); await g.press(btn(page, '별 함수 부르기')); await g.press(btn(page, '별 함수 부르기'))
    await page.screenshot({ path: `e2e-results/screens/${info.project.name}-unit4-u41.png` })
    await g.noHorizontalScroll()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    for (const [name, l] of [['맵', g.board], ['팔레트', page.locator('.palette')], ['실행 버튼', g.runButton]] as const)
      expect(await g.inView(l), `${name} 화면 안`).toBe(true)
    const small = await page.locator('button:visible').evaluateAll(es => es.map(e => [e.getAttribute('aria-label') ?? e.textContent?.trim(), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)] as const).filter(([, w, h]) => w < 44 || h < 44))
    expect(small, '44px 미만 버튼').toEqual([])
    // 함수 안의 블록을 볼 수 있어야 한다: 바로 보이거나, 작은 화면에서는 '별 함수 보기'로 바꿔서 보임
    const body = page.getByRole('group', { name: '별 함수 몸체' })
    const firstInBody = body.getByRole('button').filter({ visible: true }).first()
    if (await btn(page, '별 함수 보기').isVisible()) {
      await g.press(btn(page, '별 함수 보기'))
      expect(await g.inView(firstInBody), '함수 몸체 블록이 화면 안').toBe(true)
      await g.press(btn(page, 'main 보기'))
    }
    const mainFirst = g.workspace.getByRole('button', { name: /^1번 / }).filter({ visible: true }).first()
    expect(await g.inView(mainFirst), 'main 블록도 다시 보임').toBe(true)
  })
})
