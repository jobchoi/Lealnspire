import { contrastOf, expect, Game, test } from './helpers'

/** T84-5: 교사·보호자 화면 — 개발 중 잠금 없음 표시, 실제로 아이가 푼 흐름이 요약·단원 진행·살펴볼 퍼즐·도움·퍼즐 상세에 맞게 나온다 */
async function failThreeThenHint(g: Game, page: import('@playwright/test').Page) {
  await g.fresh(); await g.start()
  await g.build('F')
  await g.speed('빠르게')
  for (let i = 0; i < 3; i++) {
    expect(await g.runToEnd()).toContain('도달하지')
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await g.press(g.button('처음으로'))
  }
  await g.press(g.button('힌트'))
  await page.goto('/')
}

test('3번 연속 실패 + 힌트 본 뒤 미완료: 살펴볼 퍼즐에 나오고, 도움 표에 힌트 1단계 시도가 잡히며, 상세가 시간순', async ({ page }) => {
  const g = new Game(page)
  await failThreeThenHint(g, page)
  await g.press(g.button('교사·보호자'))
  await expect(page.getByRole('heading', { level: 1, name: '교사·보호자' })).toBeVisible()
  await expect(page.getByText(/개발 중: 잠금 없이 열려 있어요/)).toBeVisible()
  await expect(page.getByText('정규 45개 중 0개를 완료했어요')).toBeVisible()
  const attention = page.locator('section[aria-labelledby="admin-attention"]')
  await expect(attention).toContainText('스테이지 1')
  await expect(attention).toContainText('3회가 연속으로 실패')
  await expect(attention, '어른용 실패 설명').toContainText(/별에 도착하지 못함|도움을 본 기록/)
  const help = page.locator('section[aria-labelledby="admin-help"]')
  await expect(help, '1번 퍼즐 시도 3').toContainText(/스테이지 1[^]*3/)
  await expect(help, '시도 3회면 표본 부족 아님, 기록 없는 퍼즐은 나오지 않음(QC1)').not.toContainText('판단하기에 기록이 적어요')
  await expect(help, '기록 없는 퍼즐 행 없음').not.toContainText('스테이지 2')
  await page.locator('#admin-puzzle').selectOption('1')
  const detail = page.locator('section[aria-labelledby="admin-detail"]')
  const text = await detail.innerText()
  expect(text.indexOf('퍼즐을 방문했어요'), '방문이 먼저').toBeLessThan(text.indexOf('실행을 시작했어요'))
  expect(text.indexOf('실행을 시작했어요')).toBeLessThan(text.lastIndexOf('힌트 1단계를 봤어요'))
  expect(text, '기록용 이벤트는 상세에 안 나옴(QC1)').not.toContain('활동 시간 구간')
  await page.screenshot({ path: 'e2e-results/screens/admin-1280.png', fullPage: true })
})

test('아이 화면(내 배움)에는 같은 기록의 실패 수·힌트가 보이지 않는다', async ({ page }) => {
  const g = new Game(page)
  await failThreeThenHint(g, page)
  await g.press(g.button('내 배움'))
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/실패|힌트|연속|시도/)
})

test('예전 기록(v2)만 있는 경우: 완료 수는 보이고 "기록 시작 전 진행" 안내, 살펴볼 퍼즐 없음', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(['1', '2', '3'].map(id => [id, { completed: true, bestStars: 3 }])) })))
  await page.reload()
  await g.press(g.button('교사·보호자'))
  await expect(page.getByText('정규 45개 중 3개를 완료했어요')).toBeVisible()
  await expect(page.getByText(/기록 시작 전 진행/)).toBeVisible()
  await expect(page.getByText('현재 기준에 해당하는 퍼즐이 없어요.')).toBeVisible()
})

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
  test(`@layout ${viewport.width}: 교사·보호자 화면 — 페이지 가로 스크롤 없음(표는 자체 스크롤), 버튼 44px, 대비 4.5:1`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const g = new Game(page)
    await failThreeThenHint(g, page)
    await g.press(g.button('교사·보호자'))
    await g.noHorizontalScroll()
    const problems: string[] = []
    for (const b of await page.locator('.admin-page button, [class*=admin] button, #admin-puzzle').all()) {
      await b.scrollIntoViewIfNeeded()
      const r = (await b.boundingBox())!
      if (Math.min(r.width, r.height) < 44) problems.push(`${(await b.innerText()).trim().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
    for (const el of await page.locator('[class*=admin] p, [class*=admin] td, [class*=admin] th').all()) {
      const ratio = await contrastOf(el)
      if (ratio !== null && ratio < 4.5) problems.push(`${(await el.innerText()).trim().slice(0, 20)} 대비 ${ratio.toFixed(2)}`)
    }
    expect(problems).toEqual([])
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(height, `전체 높이 ${height}px(QC1 전 375에서 9,760px)`).toBeLessThanOrEqual(4200) // T84-7-마: 공장 활동 영역 추가로 기준 상향(QC1 전 9,760px 수준의 비대는 계속 잡음)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: `e2e-results/screens/admin-${viewport.width}.png`, fullPage: true })
  })
}
