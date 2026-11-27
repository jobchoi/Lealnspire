import type { Locator, Page } from '@playwright/test'
import { expect, Game, test } from './helpers'
import { allStages } from '../src/model/stages'

/** T82: 후반 단원 실제 사용자 흐름 빈틈(GPT 3차 점검) — 종합 2번 직접 조립, 재접속 뒤 이어 풀기, return 누락 고치기, 함수 삭제 되돌리기 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const into = (g: Game) => g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/))
const out = (g: Game) => g.press(g.action(/선택 해제$|넣기 해제$/))

async function open(page: Page, id: string, fresh = true) {
  const g = new Game(page)
  if (fresh) {
    await g.fresh()
    const index = allStages.findIndex(s => s.id === id)
    await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(sid => [sid, { completed: true, bestStars: 3 }])) })), allStages.slice(0, index).map(s => s.id))
  }
  await page.goto('/')
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card').nth(allStages.findIndex(s => s.id === id)))
  await g.speed('빠르게')
  return g
}
async function cycle(g: Game, tile: Locator, button: Locator, want: RegExp) {
  for (let i = 0; i < 6 && !want.test((await tile.getAttribute('aria-label')) ?? ''); i++) await g.press(button)
  await expect(tile).toHaveAttribute('aria-label', want)
}
/** 별 함수(◆) = repeat ◆ [앞], 왼 + main ★(A) ★(2) ★(A) — 아이처럼 화면에서 조립 */
async function buildStarWithCalls(g: Game, page: Page) {
  await g.press(btn(page, '함수 만들기'))
  await g.press(btn(page, '별 함수가 값 받기'))
  await g.press(btn(page, '별 함수 안에 넣기'))
  await g.add('N')
  await g.press(page.locator('.function-panel').getByRole('button', { name: /^1번 / }).first())
  await g.press(btn(page, '횟수를 A로'))
  await g.press(btn(page, '건네받은 값으로 반복'))
  await into(g); await g.add('F'); await out(g)
  await g.add('L')
  await out(g)
  if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
  for (let i = 0; i < 3; i++) await g.press(btn(page, '별 함수 부르기'))
  for (const order of ['1', '3']) {
    await g.press(page.locator('.workspace').getByRole('button', { name: new RegExp(`^${order}번 별 함수 부르기`) }).first())
    if (await btn(page, 'A로').isVisible()) await g.press(btn(page, 'A로'))
  }
}

test('종합 12단원 2번: 함수·입력·호출별 값을 화면에서 직접 조립해 두 맵 성공, 3번이 열린다', async ({ page }) => {
  const g = await open(page, 'u12-2')
  await buildStarWithCalls(g, page)
  await expect(page.locator('.workspace').getByRole('button', { name: /^2번 별 함수 부르기, 건네는 값 2/ }).first()).toBeVisible()
  expect(await g.blockCount()).toBe(6)
  expect(await g.runToEnd()).toContain('성공')
  await page.goto('/')
  await g.press(g.button('스테이지 목록'))
  const next = page.locator('.stage-card').nth(allStages.findIndex(s => s.id === 'u12-3'))
  await expect(next, '12단원 3번 열림').not.toContainText('잠김')
})

test('재접속: 7단원 1번에서 직접 만든 함수·입력·호출 값이 새로고침 뒤 그대로 복원되고 이어서 실행하면 성공', async ({ page }) => {
  const g = await open(page, 'u7-1')
  await buildStarWithCalls(g, page)
  expect(await g.blockCount()).toBe(6)
  await page.reload()
  const again = await open(page, 'u7-1', false)
  expect(await again.blockCount(), '블록 수 복원').toBe(6)
  await expect(page.locator('.workspace').getByRole('button', { name: /^2번 별 함수 부르기, 건네는 값 2/ }).first(), '호출 값 복원').toBeVisible()
  if (await btn(page, '별 함수 보기').isVisible()) await again.press(btn(page, '별 함수 보기'))
  await expect(page.locator('.function-panel').getByRole('button', { name: /^1번 .*건네받은 값/ }).first(), '함수 안 반복이 ◆로 복원').toBeVisible()
  expect(await again.runToEnd()).toContain('성공')
})

test('return 누락: 반복이 쓰던 함수의 return을 지우면 원인을 알려 주고, 고치기 → return을 다시 넣어 성공', async ({ page }) => {
  const g = await open(page, 'u8-1')
  await g.press(btn(page, '함수 만들기'))
  await g.press(btn(page, '별 함수 안에 넣기'))
  await g.press(page.locator('.palette').getByRole('button', { name: /값 돌려주기/ }))
  const ret = () => page.locator('.function-panel').getByRole('button', { name: /^1번 값 돌려주기/ }).first()
  await out(g)
  if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
  await g.add('N')
  const repeat = page.locator('.workspace').getByRole('button', { name: /^1번 / }).first()
  await g.press(repeat)
  await cycle(g, repeat, btn(page, '반복 횟수 원천 바꾸기'), /별/)
  await into(g); await g.add('F'); await out(g)
  await g.add('L'); await g.add('F')
  // 아이가 함수 안의 return을 지움 → 반복은 돌려받을 값이 없음
  if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
  await g.press(ret())
  await g.press(g.action(/삭제$/))
  await expect(ret()).toHaveCount(0)
  expect(await g.runToEnd()).toContain('돌려주지 않았어요')
  await page.screenshot({ path: 'e2e-results/screens/late-missing-return.png' })
  await g.press(g.dialog.getByRole('button', { name: '고치기' }))
  if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
  await expect(page.locator('.workspace').getByRole('button', { name: /^1번 / }).first(), '원인 반복 블록이 선택됨').toHaveAttribute('aria-pressed', 'true')
  if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
  await g.press(btn(page, '별 함수 안에 넣기'))
  await g.press(page.locator('.palette').getByRole('button', { name: /값 돌려주기/ }))
  await g.press(ret())
  await cycle(g, ret(), btn(page, '반환값 원천 바꾸기'), /앞 칸 수/)
  expect(await g.runToEnd()).toContain('성공')
})

test('함수 삭제 되돌리기: 함수를 지우면 호출도 사라지고, 되돌리기 한 번에 함수·호출·값이 모두 돌아와 성공', async ({ page }) => {
  const g = await open(page, 'u7-1')
  await buildStarWithCalls(g, page)
  expect(await g.blockCount()).toBe(6)
  if (await btn(page, '별 함수 보기').isVisible()) await g.press(btn(page, '별 함수 보기'))
  await g.press(btn(page, '별 함수 지우기'))
  const confirm = page.getByRole('dialog').getByRole('button', { name: /지우기|확인|예/ })
  if (await confirm.count()) await g.press(confirm.first())
  expect(await g.blockCount(), '함수와 호출이 함께 사라짐').toBe(0)
  await g.press(btn(page, '되돌리기'))
  expect(await g.blockCount(), '되돌리기로 모두 복구').toBe(6)
  if (await btn(page, 'main 보기').isVisible()) await g.press(btn(page, 'main 보기'))
  await expect(page.locator('.workspace').getByRole('button', { name: /^2번 별 함수 부르기, 건네는 값 2/ }).first()).toBeVisible()
  expect(await g.runToEnd()).toContain('성공')
})
