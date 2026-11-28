import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'

/** T84-3: 실제 사용 흐름이 학습 이력(lealnspire.history.v3)에 의미 단위로 남는다 — 클릭·프레임 로그가 아니고, 개인정보 없음, 편집마다 이력을 다시 쓰지 않음 */
type Ev = { type: string; activityId: string; activityKind: string; attemptId?: string; data: Record<string, unknown> }
const events = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('lealnspire.history.v3') ?? '{"events":[]}').events ?? []) as Ev[])
const types = (list: Ev[]) => list.map(e => e.type)

test('처음 온 아이: 틀리게 실행 → 힌트 1·2 → 고쳐서 성공 → 홈. 방문·시도·결과·힌트·완료가 순서대로 남는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toContain('도달하지')
  await g.press(g.dialog.getByRole('button', { name: '닫기' }))
  await g.press(g.button('힌트'))
  await g.press(g.button('다음 힌트'))
  await g.press(g.button('처음으로'))
  await g.add('F')
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  await page.goto('/')
  const list = (await events(page)).filter(e => e.activityId === '1')
  const t = types(list)
  for (const type of ['visitStarted', 'attemptStarted', 'executionCalculated', 'resultReached', 'hintShown', 'completionConfirmed']) expect(t, `${type} 기록`).toContain(type)
  expect(t.filter(x => x === 'attemptStarted'), '시도 2번').toHaveLength(2)
  expect(t.filter(x => x === 'hintShown'), '힌트 단계 2개').toHaveLength(2)
  expect(t.filter(x => x === 'completionConfirmed'), '완료 한 번').toHaveLength(1)
  expect(t.indexOf('completionConfirmed'), '완료는 성공 결과 뒤').toBeGreaterThan(t.lastIndexOf('attemptStarted'))
  const raw = await page.evaluate(() => localStorage.getItem('lealnspire.history.v3') ?? '')
  expect(raw, '개인정보·코드 원문 없음').not.toMatch(/"name"|"email"|"photo"|"forward","id"/)
})

test('한 단계 버튼을 여러 번 눌러도 한 시도, 시범을 봐도 시도가 늘지 않는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.press(page.getByRole('button', { name: '어떻게 하는지 보기' }))
  await g.press(page.getByRole('dialog').getByRole('button', { name: '닫기' }))
  await g.build('F F')
  for (let i = 0; i < 2; i++) await g.press(g.button('한 단계'))
  await page.goto('/')
  const t = types((await events(page)).filter(e => e.activityId === '1'))
  expect(t.filter(x => x === 'attemptStarted'), '한 단계 연타 = 한 시도').toHaveLength(1)
  expect(t, '시범 기록').toContain('demoStarted')
})

test('성능: 블록을 30번 편집해도 학습 이력 문서는 편집마다 다시 쓰이지 않는다', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __historyWrites: number }
    w.__historyWrites = 0
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'lealnspire.history.v3') w.__historyWrites++
      return original.call(this, key, value)
    }
  })
  const g = new Game(page)
  await g.fresh(); await g.start()
  const before = await page.evaluate(() => (window as unknown as { __historyWrites: number }).__historyWrites)
  for (let i = 0; i < 15; i++) { await g.add('F'); await g.press(g.button('되돌리기')) } // 놓기 15 + 되돌리기 15 = 편집 30
  const after = await page.evaluate(() => (window as unknown as { __historyWrites: number }).__historyWrites)
  expect(after - before, `편집 30번 동안 이력 쓰기 ${after - before}회`).toBeLessThanOrEqual(3)
})

test('풀다가 새로고침하면: 진행은 그대로이고, 다시 들어오면 앞 방문이 닫힌 채로 새 방문이 시작된다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('F')
  await page.reload()
  await g.start()
  await page.goto('/')
  const visits = (await events(page)).filter(e => e.activityId === '1')
  expect(types(visits).filter(x => x === 'visitStarted').length, '방문 2번').toBeGreaterThanOrEqual(2)
  expect(types(visits).filter(x => x === 'visitEnded').length, '앞 방문도 닫힘').toBeGreaterThanOrEqual(2)
})
