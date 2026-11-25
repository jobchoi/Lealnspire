import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'

/** T42: 3단원 조건 반복 while — 길이가 다른 길을 같은 코드로, 끝나지 않는 반복 고치기 */
const done = JSON.stringify({ version: 1, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1', 'u2-2', 'u2-3', 'u2-4', 'u2-5', 'u2-6'].map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })
const whileBlock = (page: Page) => page.locator('.palette').getByRole('button', { name: '앞이 열려 있는 동안', exact: true })
const into = (g: Game) => g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
const out = (g: Game) => g.press(g.action(/선택 해제$|넣기 해제$/))

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(([v, ids]) => { const s = JSON.parse(v as string); for (const id of ids as string[]) s.stages[id] = { completed: true, bestStars: 3, lastProgram: [] }; localStorage.setItem('lealnspire.progress', JSON.stringify(s)) }, [done, extra] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}

test.describe('3단원 while', () => {
  test('u3-1: 칸 수를 센 코드는 2번 맵에서 실패, while로 두 맵 모두 성공. 이 단원에는 if 블록이 없다', async ({ page }) => {
    const g = await open(page, '벽까지 가요')
    await expect(page.locator('.palette').getByRole('button', { name: '앞이 막혔으면', exact: true }), 'if 없음').toHaveCount(0)
    await g.build('F F R F')
    expect(await g.runToEnd()).toMatch(/2번 맵에서/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await g.clear()
    await g.press(whileBlock(page)); await g.select('1'); await into(g); await g.add('F'); await out(g)
    await g.add('R'); await g.add('F')
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('u3-2: repeat 안에 while — 모퉁이 거리가 달라도 성공', async ({ page }) => {
    const g = await open(page, '벽까지 가고 돌기', ['u3-1'])
    await g.add('N'); await g.select('1'); await into(g)
    await g.press(whileBlock(page)); await out(g)
    await g.select('1.1'); await into(g); await g.add('F'); await out(g)
    await g.select('1'); await into(g); await g.add('R'); await out(g)
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('u3-3: 미리 놓인 while은 끝나지 않음 → 원인 안내 → 안쪽을 앞으로로 바꿔 성공 → 3단원 완주', async ({ page }) => {
    const g = await open(page, '끝나지 않는 반복', ['u3-1', 'u3-2'])
    expect(await g.runToEnd(), '끝나지 않는 반복 안내').toContain('반복이 끝나지 않아요')
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(g.tile('1'), '원인은 while 블록').toHaveAttribute('aria-pressed', 'true')
    await g.remove('1.2'); await g.remove('1.1')
    await g.select('1'); await into(g); await g.add('F'); await out(g)
    expect(await g.runToEnd()).toContain('3단원 완주')
  })

  test('한 단계: while은 매번 다시 검사하고, 막히면 멈춰 다음 블록으로', async ({ page }) => {
    const g = await open(page, '벽까지 가요')
    await g.press(whileBlock(page)); await g.select('1'); await into(g); await g.add('F'); await out(g); await g.add('R')
    const status = page.locator('[role=status]').filter({ hasText: /앞이 (막혔어요|열려 있어요)/ })
    const seen: string[] = []
    for (let i = 0; i < 12 && !(await g.dialog.count()); i++) {
      await g.press(g.button('한 단계'))
      if (await status.count()) seen.push((await status.innerText()).includes('막혔') ? 'X' : 'O')
    }
    expect(seen.join(''), '열림 검사 반복 후 막힘 검사로 끝남').toMatch(/^O+X/)
  })

  test('T43: 앞 맵에서 먼저 실패하면, 뒤 맵이 끝나지 않는 반복이어도 결과·고치기는 1번 맵', async ({ page }) => {
    const g = await open(page, '벽까지 가요')
    // repeat 2 [앞으로], while [](빈 몸체), 앞으로 → 1번 맵: 벽에 부딪힘 / 2번 맵: 빈 while이 끝나지 않음
    await g.build('2[F]')
    await g.press(whileBlock(page))
    await g.add('F')
    expect(await g.runToEnd(), '첫 실패는 1번 맵').toMatch(/1번 맵에서/)
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(page.getByRole('group', { name: '3단원: 조건 반복 (while)' }).getByRole('button').nth(0)).toHaveAttribute('aria-pressed', 'true')
  })
})
