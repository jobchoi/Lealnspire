import { expect, Game, test } from './helpers'

/** T78: 플레이 중 저장이 실패하면(저장 공간 가득 등) 아이·보호자에게 알리고, 계속 풀 수 있다. 정상 저장이면 아무 안내 없음 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if ((window as unknown as { __failSave?: boolean }).__failSave) throw new DOMException('full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
})

const failNotice = '기록을 저장하지 못했어요'
const resultLine = '이 기기에는 기록이 저장되지 않았어요'

test('정상 저장: 풀고 성공해도 저장 실패 안내가 없다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('F F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  await expect(page.getByText(failNotice)).toHaveCount(0)
  await expect(page.getByText(resultLine)).toHaveCount(0)
})

test('풀이 중 저장 공간이 가득 차면: 한 번 알리고, 계속 풀어 성공할 수 있으며, 결과 창에 저장 안 됨 한 줄', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.add('F')
  await page.evaluate(() => { (window as unknown as { __failSave?: boolean }).__failSave = true })
  await g.add('F') // 이 편집의 저장이 실패
  const notice = page.getByText(failNotice)
  await expect(notice).toBeVisible()
  await expect(notice.locator('xpath=ancestor-or-self::*[@role="status" or @role="alert"][1]')).toHaveCount(1)
  await page.screenshot({ path: 'e2e-results/screens/save-notice-play.png' })
  await g.speed('빠르게')
  expect(await g.runToEnd(), '플레이를 막지 않음').toMatch(/성공|별 \d개|★/)
  await expect(g.dialog.getByText(resultLine)).toBeVisible()
  await page.screenshot({ path: 'e2e-results/screens/save-notice-result.png' })
  // 다음 스테이지에서 같은 알림을 반복하지 않음
  await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
  await g.add('F')
  await expect(page.getByText(failNotice), '반복 알림 없음').toHaveCount(0)
})

test('@layout 360: 저장 실패 알림이 떠도 맵·실행 버튼이 보이고 가로 스크롤 없음', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 560 })
  const g = new Game(page)
  await g.fresh(); await g.start()
  await page.evaluate(() => { (window as unknown as { __failSave?: boolean }).__failSave = true })
  await g.add('F')
  await expect(page.getByText(failNotice)).toBeVisible()
  const run = (await page.locator('.run-button').boundingBox())!
  expect(run.y + run.height).toBeLessThanOrEqual(561)
  await g.noHorizontalScroll()
  await page.screenshot({ path: 'e2e-results/screens/save-notice-360.png' })
})
