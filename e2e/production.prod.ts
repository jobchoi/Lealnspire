import { expect, Game, test } from './helpers'

/** T27: 배포용 빌드를 루트·하위 경로에서 실제 사용자처럼 쓴다. 외부 요청·없는 파일(4xx) 0건 */
test('배포 빌드: 시작 → 성공 → 새로고침 후 기록 복원 → 교사·보호자 안내 열기, 외부 요청·404 없음', async ({ page, baseURL }) => {
  const base = new URL(baseURL!)
  const outside: string[] = [], missing: string[] = []
  page.on('request', r => { const u = new URL(r.url()); if (u.origin !== base.origin && !u.protocol.startsWith('data')) outside.push(r.url()) })
  page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`) })

  const g = new Game(page)
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await g.start()
  await g.build('F F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)

  await page.goto('./')
  await expect(g.button('이어하기'), '새로고침 뒤 기록 복원').toBeVisible()
  await g.press(g.button('스테이지 목록'))
  await expect(page.locator('.stage-card').first()).toContainText('최고 별 3개')

  await page.goto('./')
  await g.press(g.button('내 기록 안내'))
  const guide = page.getByRole('link', { name: /교사·보호자 안내/ })
  await expect(guide).toHaveAttribute('href', new RegExp(`^${base.pathname.replace(/\//g, '\\/')}guide\\.html$`))
  await g.press(guide)
  await expect(page).toHaveURL(new RegExp(`${base.pathname}guide\\.html$`))
  await expect(page.locator('body')).toContainText('8개를 성공하면 1단원 완료')

  const license = await page.request.get('licenses/fonts.txt')
  expect(license.status(), '글꼴 라이선스 원문이 배포물에 있음').toBe(200)
  expect(await license.text()).toContain('SIL Open Font License')

  expect(outside, '외부 요청 없음').toEqual([])
  expect(missing, '없는 파일 없음').toEqual([])
})
