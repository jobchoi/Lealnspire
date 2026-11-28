import { contrastOf, expect, Game, test } from './helpers'

/** T84-4: 학습자 대시보드 "내 배움" — 해낸 것·다시 볼 것·다음 한 걸음. 실패 수·힌트 수·시간·비교는 아이 화면에 없다 */
test('처음 온 아이: 아직 해낸 퍼즐이 없으면 빈 안내와 다음 한 걸음(1번)', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.press(g.button('내 배움'))
  await expect(page.getByRole('heading', { level: 1, name: '내 배움' })).toBeVisible()
  await expect(page.getByText('아직 해낸 퍼즐이 없어요')).toBeVisible()
  await g.press(page.getByRole('button', { name: /이어하기/ }).first())
  await expect(page.getByRole('heading', { level: 1 })).toContainText('스테이지 1')
})

test('틀렸다가 고쳐서 성공하면 "고쳐서 도착했어요", 결과 창에서 "다시 보고 싶어요"를 담으면 내 배움에 나오고 뺄 수 있다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toContain('도달하지')
  await g.press(g.dialog.getByRole('button', { name: '닫기' }))
  await g.press(g.button('처음으로'))
  await g.add('F')
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  await g.press(g.dialog.getByRole('button', { name: '다시 보고 싶어요' }))
  await expect(g.dialog.getByRole('button', { name: '다시 보고 싶어요' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/')
  await g.press(g.button('내 배움'))
  await expect(page.getByText('지금까지 퍼즐 1개를 해냈어요')).toBeVisible()
  await expect(page.getByText('고쳐서 도착했어요')).toBeVisible()
  const review = page.locator('section', { has: page.getByRole('heading', { name: '다시 보고 싶어요' }) })
  await expect(review.getByRole('button', { name: /빼기: / })).toHaveCount(1)
  // 아이 화면에는 실패 횟수·힌트·시간 숫자가 없다
  const text = await page.locator('main, body').first().innerText()
  expect(text, '실패·힌트·시간 수치 없음').not.toMatch(/실패 \d|힌트 \d|\d+초|\d+분|번 틀/)
  await page.screenshot({ path: 'e2e-results/screens/learning-1280.png' })
  await g.press(review.getByRole('button', { name: /빼기: / }))
  await expect(review.getByRole('button', { name: /빼기: / })).toHaveCount(0)
})

test('예전 기록(v2)만 있는 아이: 해낸 퍼즐 수와 "예전 기록은 해낸 퍼즐만 보여요", 단원 카드 상태', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1'].map(id => [id, { completed: true, bestStars: 3 }])) })))
  await page.reload()
  await g.press(g.button('내 배움'))
  await expect(page.getByText('지금까지 퍼즐 9개를 해냈어요')).toBeVisible()
  await expect(page.getByText('예전 기록은 해낸 퍼즐만 보여요.')).toBeVisible()
  // 1단원만 다 풀었고 2단원은 1개만(QC1: 다 푼 단원만 완료 모양, 일부는 "하는 중")
  await expect(page.locator('.learning-tools button[data-state="completed"]')).toHaveCount(1)
  await expect(page.locator('.learning-tools button[data-state="active"]').first()).toContainText('하는 중')
  await g.press(page.locator('.learning-tools button').nth(1))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/스테이지|목록/)
})

test('키보드만: 홈에서 내 배움 → 다음 한 걸음까지 Tab·Enter로', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.button('내 배움').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: '내 배움' })).toBeFocused()
  for (let i = 0; i < 30 && !(await page.evaluate(() => /이어하기/.test(document.activeElement?.textContent ?? ''))); i++) await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('스테이지 1')
})

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
  test(`@layout ${viewport.width}: 내 배움 — 가로 스크롤 없음, 버튼 44px, 글자 대비 3:1`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(() => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1', 'u2-2', 'u3-1'].map(id => [id, { completed: true, bestStars: 3 }])) })))
    await page.reload()
    await g.press(g.button('내 배움'))
    await g.noHorizontalScroll()
    const problems: string[] = []
    for (const b of await page.locator('.learning-page button, [class*=learning] button').all()) {
      await b.scrollIntoViewIfNeeded()
      const r = (await b.boundingBox())!
      if (Math.min(r.width, r.height) < 44) problems.push(`${(await b.innerText()).trim()} ${Math.round(r.width)}×${Math.round(r.height)}`)
      const ratio = await contrastOf(b)
      if (ratio !== null && ratio < 3) problems.push(`${(await b.innerText()).trim()} 대비 ${ratio.toFixed(2)}`)
    }
    expect(problems).toEqual([])
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: `e2e-results/screens/learning-${viewport.width}.png`, fullPage: true })
  })
}
