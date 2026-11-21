import { expect, Game, test } from './helpers'

/** T19: 실수로 지운 반복을 한 번에 되돌린다 */
test('몸체가 든 반복을 실수로 지움 → 되돌리기 → 그대로 실행해 성공, 다른 스테이지에서는 되돌릴 것이 없음', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  const undo = g.button('되돌리기')
  await expect(undo, '편집 전에는 비활성').toBeDisabled()
  await g.build('2[F]')
  expect(await g.blockCount()).toBe(2)
  await g.remove('1')
  expect(await g.blockCount()).toBe(0)
  await g.press(undo)
  expect(await g.blockCount(), '반복과 몸체가 돌아옴').toBe(2)
  await expect(g.tile('1.1')).toBeVisible()
  await expect(undo, '되돌리기는 한 번만').toBeDisabled()
  await g.speed('빠르게')
  const result = await g.runToEnd()
  expect(result).toMatch(/성공|별 \d개|★/)
  await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
  await expect(g.button('되돌리기'), '스테이지를 바꾸면 기록 없음').toBeDisabled()
})
