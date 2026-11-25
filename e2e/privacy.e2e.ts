import { expect, Game, test } from './helpers'

/** T20: 무엇이 어디에 저장되는지 안내하고, 확인을 거쳐 이 앱 기록만 지운다 */
test('기록 안내 → 지우기 취소(유지) → 지우기 확정 → 새로고침 후 처음 상태, 다른 사이트 데이터는 그대로', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => {
    localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [] } } }))
    localStorage.setItem('other-app', 'keep')
  })
  await page.reload()
  await expect(g.button('이어하기').or(page.getByRole('button', { name: /이어/ })).first(), '진행 기록이 있음').toBeVisible()

  await g.press(g.button('내 기록 안내'))
  const info = page.getByRole('dialog')
  await expect(info).toContainText('이 기기')
  await expect(info).toContainText('서버로 보내지 않')
  await expect(info).toContainText('최고 별')

  await g.press(info.getByRole('button', { name: '기록 지우기' }))
  await g.press(page.getByRole('dialog').getByRole('button', { name: '취소' }))
  expect(await page.evaluate(() => localStorage.getItem('lealnspire.progress')), '취소하면 보존').not.toBeNull()

  await g.press(page.getByRole('dialog').getByRole('button', { name: '기록 지우기' }))
  await g.press(page.getByRole('dialog').getByRole('button', { name: '지우기', exact: true }))
  await page.reload()
  expect(await page.evaluate(() => localStorage.getItem('lealnspire.progress')), '앱 기록 삭제(v1)').toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('lealnspire.progress.v2')), '앱 기록 삭제(v2)').toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('other-app')), '다른 데이터 보존').toBe('keep')
  await expect(page.getByRole('button', { name: /이어/ }), '이어하기 사라짐').toHaveCount(0)
})
