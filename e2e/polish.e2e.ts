import { expect, Game, test } from './helpers'
import { allStages, bonusStages, stages } from '../src/model/stages'

/** T72: 제품 다듬기 1차 — 실제 사용자 상황(공용 기기에서 기록 삭제 실패, 단원을 끝낸 아이, 전 과정을 끝낸 아이) */
test('공용 기기: 저장소 삭제가 실패하면 "지우지 못했어요"와 다시 시도, 기록이 지워진 척하지 않는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: { '1': { completed: true, bestStars: 3 } } })))
  // 이 브라우저는 삭제가 실패한다고 가정
  await page.addInitScript(() => { Storage.prototype.removeItem = () => { throw new Error('blocked') } })
  await page.reload()
  await g.press(page.getByRole('button', { name: /내 기록 안내/ }))
  await g.press(g.button('기록 지우기'))
  await g.press(g.button('지우기'))
  await expect(page.getByText(/기록을 지우지 못했어요/)).toBeVisible()
  await expect(g.button('다시 시도')).toBeVisible()
  await expect(page.getByText('기록을 지웠어요.')).toHaveCount(0)
  await page.screenshot({ path: 'e2e-results/screens/polish-clear-failed.png' })
})

test('1단원 마지막(8번)을 깨면 결과 창에 다음 단원 안내와 "다음 단원으로" — 누르면 2단원 첫 문제', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  // 1~7번 완료 + 8번에 정답 코드가 저장돼 있는 상태(조립 시나리오는 journeys.e2e.ts에 있음)
  await page.evaluate(([ids, program]) => { const st: Record<string, unknown> = Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3 }])); st['8'] = { completed: false, bestStars: 0, lastProgram: { main: program, functions: [] } }; localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: st })) }, [stages.slice(0, 7).map(s => s.id), stages[7].solution] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card').nth(7))
  await g.speed('빠르게')
  const result = await g.runToEnd()
  expect(result).toMatch(/다음 단원이 열렸어요: 2단원/)
  expect(result, '보너스는 선택 활동으로 함께 안내').toMatch(/보너스/)
  await page.screenshot({ path: 'e2e-results/screens/polish-next-unit.png' })
  await g.press(g.dialog.getByRole('button', { name: '다음 단원으로' }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText('막히면 돌아요')
})

test('전 과정을 끝낸 아이가 홈에 오면 완주 배지가 보이고(이어하기가 없는 이유), 보너스는 조건이 아니다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  const bonus = new Set(bonusStages.map(s => s.id))
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 1 }])) })), allStages.filter(s => !bonus.has(s.id)).map(s => s.id))
  await page.reload()
  await expect(page.getByText('모든 단원을 완주했어요').first()).toBeVisible()
  await page.screenshot({ path: 'e2e-results/screens/polish-home-complete.png' })
  await g.noHorizontalScroll()
})
