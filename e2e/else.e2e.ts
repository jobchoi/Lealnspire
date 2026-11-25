import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'

/** T41: if/else — 두 가지 중 하나만 실행된다 */
const before = JSON.stringify({ version: 1, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1', 'u2-2', 'u2-3', 'u2-4', 'u2-5'].map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })
const ifBlock = (page: Page) => page.locator('.palette').getByRole('button', { name: '앞이 막혔으면', exact: true })

async function open(page: Page, title: string) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), before)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  return g
}
/** repeat N [ if 앞 막힘 [ 오른쪽 ] else [ 앞으로 ] ] */
async function buildIfElse(g: Game, page: Page, count: number) {
  await g.add('N'); await g.select('1')
  for (let c = 3; c < count; c++) await g.press(g.action(/늘리기$/))
  await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
  await g.press(ifBlock(page))
  await g.press(g.action(/선택 해제$|넣기 해제$/))
  await g.select('1.1'); await g.press(g.action(/else 추가$/))
  await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('R'); await g.press(g.action(/선택 해제$|넣기 해제$/))
  await g.select('1.1'); await g.press(g.action(/else 안에 넣기$/)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
}

test.describe('if/else', () => {
  test('if만 쓰면 "돌고 나서도 막힌" 1번 맵에서 실패하고, else를 쓰면 두 맵 모두 성공', async ({ page }) => {
    const g = await open(page, '막혔을 때와 열렸을 때')
    await g.speed('빠르게')
    // if만: repeat 4 [ if 막힘 [R], 앞으로 ] → 1번 맵(벽을 보고 시작)에서 돌고 바로 앞으로 → 부딪힘
    await g.add('N'); await g.select('1'); await g.press(g.action(/늘리기$/))
    await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/)); await g.press(ifBlock(page)); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    await g.select('1.1'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/)); await g.add('R'); await g.press(g.action(/선택 해제$|넣기 해제$/))
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toMatch(/1번 맵에서 .*부딪/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await g.clear()
    await buildIfElse(g, page, 5)
    expect(await g.blockCount(), 'if·else 안 블록만 셈: repeat, if, 오른쪽, 앞으로').toBe(4)
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('한 단계 실행: 참이면 if 가지만, 거짓이면 else 가지만 실행되고 나머지는 건너뜀', async ({ page }) => {
    const g = await open(page, '막혔을 때와 열렸을 때')
    await buildIfElse(g, page, 5)
    await g.press(g.button('한 단계'))
    // 1번 맵: 처음 검사는 막힘(참) → if 가지(오른쪽) 실행, else 가지는 건너뜀
    await expect(page.locator('[role=status]').filter({ hasText: '앞이 막혔어요' })).toBeVisible()
    await expect(page.getByText('건너뜀').first(), '안 탄 가지 표시').toBeVisible()
  })

  test('세 맵(u2-6)도 같은 코드로 성공 → 2단원 완주', async ({ page }) => {
    const g = await open(page, '세 맵 연습')
    await expect(page.getByRole('group', { name: '2단원: 조건 (if)' }).getByRole('button')).toHaveCount(3)
    await buildIfElse(g, page, 6)
    await g.speed('빠르게')
    expect(await g.runToEnd()).toContain('2단원 완주')
  })

  test('else 빼기 → 되돌리기로 else와 안의 블록이 돌아온다', async ({ page }) => {
    const g = await open(page, '막혔을 때와 열렸을 때')
    await buildIfElse(g, page, 5)
    await g.select('1.1'); await g.press(g.action(/else 빼기$/))
    expect(await g.blockCount(), 'else 안의 앞으로가 빠짐').toBe(3)
    await g.press(g.button('되돌리기'))
    expect(await g.blockCount()).toBe(4)
  })

  test('T43: else 추가 → else 안에 넣기 → 되돌리기 → 블록을 더해도 else가 저절로 다시 생기지 않는다', async ({ page }) => {
    const g = await open(page, '막혔을 때와 열렸을 때')
    await g.press(ifBlock(page))
    await g.select('1'); await g.press(g.action(/else 추가$/))
    await g.press(g.action(/else 안에 넣기$/))
    await g.press(g.button('되돌리기'))
    await g.add('F')
    await expect(page.locator('.workspace').getByText('else', { exact: true }), 'else 가지 없음').toHaveCount(0)
    expect(await g.blockCount(), 'if와 앞으로 2개').toBe(2)
  })
})
