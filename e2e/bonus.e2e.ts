import { expect, Game, test } from './helpers'

const done = (ids: string[]) => JSON.stringify({ version: 1, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })

/** T21·T23: 정규 8개가 1단원 완료, 보너스 2개는 선택. 이전 기록(1~8만)과 호환 */
test.describe('보너스와 완주 계약', () => {
  test('7개만 깬 기록에서는 보너스가 잠겨 있고, 이어하기는 8번으로 간다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), done(['1', '2', '3', '4', '5', '6', '7']))
    await page.reload()
    await g.press(g.button('이어하기'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('스테이지 8')
    await g.press(g.button('스테이지 목록'))
    await expect(page.locator('.stage-card').nth(8), '보너스 1 잠김').toBeDisabled()
    await expect(page.locator('.stage-card').nth(9), '보너스 2 잠김').toBeDisabled()
  })

  test('이전 버전 기록(1~8 완료) → 보너스 1·2를 새로운 반복으로 풀고 → 새로고침 후에도 남는다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), done(['1', '2', '3', '4', '5', '6', '7', '8']))
    await page.reload()
    await g.press(g.button('스테이지 목록'))
    const b1 = page.locator('.stage-card').nth(8), b2 = page.locator('.stage-card').nth(9)
    await expect(b1).toBeEnabled()
    await expect(b2, 'B2는 B1 다음에 열림').toBeDisabled()
    await g.press(b1)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('보너스 1')
    await expect(page.getByRole('heading', { level: 1 }), '보너스 제목에 "스테이지 b1" 접두 없음').not.toContainText('스테이지 b')
    await g.build('2[F F L F R]')
    await g.speed('빠르게')
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
    await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('보너스 2')
    await g.build('F 2[F L F F R]')
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)

    await page.reload()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lealnspire.progress.v3') ?? '{}'))
    expect(saved.version, '저장 v3(T84, 옛 v2 시드에서 이행)').toBe(3)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lealnspire.progress') ?? '{}').version), 'v1 원본은 그대로').toBe(1)
    expect(saved.stages.b1?.completed && saved.stages.b2?.completed).toBe(true)
    expect(Object.keys(saved.stages).filter(k => /^[1-8]$/.test(k)), '정규 기록 보존').toHaveLength(8)
  })
})
