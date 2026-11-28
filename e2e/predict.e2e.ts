import { expect, Game, test } from './helpers'

/** T17: 완료한 스테이지에서 실행 전에 도착 모습을 예측하는 선택 도전 */
test('2번을 깬 뒤 예측 도전: 틀린 후보 → 실제 길 확인 → 다시 골라 정답, 벌점 없음', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [] }, 2: { completed: true, bestStars: 2, lastProgram: [] } } })))
  await page.reload()
  const before = await page.evaluate(() => [localStorage.getItem('lealnspire.progress'), localStorage.getItem('lealnspire.progress.v2'), localStorage.getItem('lealnspire.progress.v3')])
  await g.press(g.button('스테이지 목록'))
  await expect(page.getByRole('button', { name: '예측 도전' }), '깬 스테이지에만 열림(1번은 도전 없음, 3번은 안 깸)').toHaveCount(1)
  await g.press(page.getByRole('button', { name: '예측 도전' }))

  const choices = page.getByRole('button', { name: /^후보 [ABC]: / })
  await expect(choices).toHaveCount(3)
  const feedback = page.locator('.prediction-feedback')
  const results: string[] = []
  for (let i = 0; i < 3; i++) {
    await g.press(choices.nth(i))
    await expect(feedback).toContainText(/예상과 (같아요|달라요)/, { timeout: 20_000 })
    await expect(feedback, '실제 위치를 알려 줌').toContainText('실제 위치')
    results.push((await feedback.innerText()).includes('같아요') ? 'O' : 'X')
    if (i < 2) await g.press(g.button('다시 고르기'))
  }
  expect(results.filter(r => r === 'O'), `정답은 정확히 하나: ${results.join('')}`).toHaveLength(1)
  expect(await page.evaluate(() => [localStorage.getItem('lealnspire.progress'), localStorage.getItem('lealnspire.progress.v2'), localStorage.getItem('lealnspire.progress.v3')]), '저장 기록 불변(벌점·별 없음)').toEqual(before)
  await g.press(g.button('돌아가기'))
  await expect(page.locator('.stage-card').first()).toBeVisible()
})
