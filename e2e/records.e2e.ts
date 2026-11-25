import { expect, Game, test } from './helpers'

/** T25: 기록이 망가지거나 저장소를 못 쓰는 환경에서도 앱이 멈추지 않고, 정상 기록은 그대로 복원된다 */
test.describe('기록 신뢰성', () => {
  for (const [name, raw] of [
    ['JSON이 아닌 값', '{망가짐'],
    ['알 수 없는 버전', JSON.stringify({ version: 99, stages: { 1: { completed: true, bestStars: 3, lastProgram: [] } } })],
    ['잘못된 블록이 든 코드', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [{ id: 'x', type: 'jump' }] } } })],
  ] as const) {
    test(`망가진 기록(${name})이면 오류 없이 시작할 수 있다`, async ({ page }) => {
      const g = new Game(page)
      await g.fresh()
      await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), raw)
      await page.reload()
      await g.start()
      await g.build('F F')
      await g.speed('빠르게')
      expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
    })
  }

  test('저장소를 쓸 수 없는 브라우저(사생활 보호 모드 등)에서도 끝까지 플레이되고 안내가 나온다', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } })
    })
    const g = new Game(page)
    await page.goto('/')
    await g.start()
    await g.build('F F')
    await g.speed('빠르게')
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
    await page.goto('/')
    await g.press(g.button('내 기록 안내'))
    await g.press(page.getByRole('dialog').getByRole('button', { name: '기록 지우기' }))
    await g.press(page.getByRole('dialog').getByRole('button', { name: '지우기', exact: true }))
    await expect(page.getByRole('dialog').getByRole('status'), '저장 불가 안내').toContainText('이 브라우저에서는 저장하지 않고 있어요')
  })

  test('진행 중 기록: 이어하기, 마지막 코드 복원, 최고 별은 더 낮은 결과로 덮이지 않는다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: {
      1: { completed: true, bestStars: 3, lastProgram: [{ id: 'a', type: 'forward' }, { id: 'b', type: 'forward' }] },
      2: { completed: false, bestStars: 0, lastProgram: [{ id: 'c', type: 'forward' }, { id: 'r', type: 'repeat', count: 2, body: [{ id: 'd', type: 'turnRight' }] }] },
    } })))
    await page.reload()
    await g.press(g.button('이어하기'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('스테이지 2')
    // 종류·순서·반복 횟수·몸체까지 그대로
    await expect(g.tile('1')).toHaveAccessibleName(/^1번 앞으로/)
    await expect(g.tile('2')).toHaveAccessibleName(/^2번 반복 2번/)
    await expect(g.tile('2.1')).toHaveAccessibleName(/^2\.1번 오른쪽으로 돌기/)
    expect(await g.blockCount(), '2번 마지막 코드 복원').toBe(3)
    await g.press(g.button('스테이지 목록'))
    await g.press(page.locator('.stage-card').first())
    await expect(g.tile('1')).toHaveAccessibleName(/^1번 앞으로/)
    await expect(g.tile('2')).toHaveAccessibleName(/^2번 앞으로/)
    expect(await g.blockCount(), '1번 마지막 코드 복원').toBe(2)
    // 더 긴 코드로 다시 성공(별 3 → 낮아질 수 있음)
    await g.add('L'); await g.add('R')
    await g.speed('빠르게')
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lealnspire.progress')!))
    expect(saved.stages['1'].bestStars, '최고 별 유지').toBe(3)
  })
})
