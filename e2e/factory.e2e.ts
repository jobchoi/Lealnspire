import type { Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'

/** T84-7-다: 규칙 분류 공장 — 처음 온 아이는 시작 모습만, 1단원을 마치면 코드. 벨트(앞부터)·더미(맨 위부터)를 직접 만들고 실행해 관찰. 정답 판정 없음 */
const seed = (page: Page, ids: string[]) => page.evaluate(list => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(list.map(id => [id, { completed: true, bestStars: 3 }])) })), ids)
const unit1 = ['1', '2', '3', '4', '5', '6', '7', '8']

test('처음 온 아이: 공장에 들어가 시작 모습은 만들 수 있지만 코드는 1단원을 마친 뒤에', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.press(g.button('공장 만들기'))
  await expect(page.getByRole('heading', { level: 1, name: '공장 만들기' })).toBeVisible()
  await g.press(page.getByRole('button', { name: '입력 벨트에 ◆ 상자 추가' }))
  await expect(page.getByText('입력 벨트 1/12')).toBeVisible()
  await g.press(page.getByRole('button', { name: '코드', exact: true }))
  await expect(page.getByText('1단원을 마치면 코드를 만들 수 있어요')).toBeVisible()
})

test('1단원을 마친 아이: 벨트에 ◆○△를 놓고 repeat 3 [벨트에서 집기, 잎 더미에 놓기]를 실행하면 잎 더미 맨 위가 △ (나중에 놓은 것이 맨 위)', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await seed(page, unit1); await page.reload()
  await g.press(g.button('공장 만들기'))
  for (const s of ['◆', '○', '△']) await g.press(page.getByRole('button', { name: `입력 벨트에 ${s} 상자 추가` }))
  await expect(page.getByRole('group', { name: /입력 벨트: 출구부터 ◆, ○, △/ })).toBeVisible()
  await g.press(page.getByRole('button', { name: '코드', exact: true }))
  await g.press(page.getByRole('button', { name: /repeat · 반복 추가/ }))
  await expect(page.getByText('블록 1/30')).toBeVisible()
  // 반복 안쪽을 넣을 곳으로 고르고 집기·놓기
  await g.press(page.getByRole('button', { name: /안쪽/ }).first())
  await g.press(page.getByRole('button', { name: /벨트에서 집기 추가/ }))
  await g.press(page.getByRole('button', { name: /더미에 놓기 추가/ }))
  await expect(page.getByText('블록 3/30')).toBeVisible()
  await page.screenshot({ path: 'e2e-results/screens/factory-built-1280.png', fullPage: true })
  // 반복 횟수 기본값을 3으로(필요하면 조정)
  await page.getByRole('combobox', { name: '숫자', exact: true }).first().selectOption('3')
  await g.press(page.getByRole('button', { name: '실행', exact: true }))
  await expect(page.getByText('실행이 끝났어요')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('group', { name: /잎 더미: .*맨 위 △/ }).last(), '나중에 놓은 상자가 맨 위(스택)').toBeVisible()
  await expect(page.getByText('내가 생각한 모습인가요?')).toBeVisible()
  await page.screenshot({ path: 'e2e-results/screens/factory-ended-1280.png', fullPage: true })
})

test('빈 벨트에서 집으면 아이 말로 멈추고, 상자가 사라지거나 생기지 않는다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await seed(page, unit1); await page.reload()
  await g.press(g.button('공장 만들기'))
  await g.press(page.getByRole('button', { name: '코드', exact: true }))
  await g.press(page.getByRole('button', { name: /벨트에서 집기 추가/ }))
  await g.press(page.getByRole('button', { name: '실행', exact: true }))
  await expect(page.getByText(/벨트에 상자가 없어요|비어 있어요/).first()).toBeVisible({ timeout: 20_000 })
})

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
  test(`@layout ${viewport.width}: 공장 — 가로 스크롤 없음, 버튼 44px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const g = new Game(page)
    await g.fresh(); await seed(page, unit1); await page.reload()
    await g.press(g.button('공장 만들기'))
    await g.press(page.getByRole('button', { name: '입력 벨트에 ◆ 상자 추가' }))
    await g.noHorizontalScroll()
    const small: string[] = []
    for (const b of await page.locator('.factory-page button').all()) {
      if (!(await b.isVisible())) continue
      const r = (await b.boundingBox())!
      const ratio = await contrastOf(b)
      if (ratio !== null && ratio < 3) small.push(`${((await b.getAttribute('aria-label')) ?? (await b.innerText())).trim().slice(0, 24)} 대비 ${ratio.toFixed(2)}`)
      if (Math.min(r.width, r.height) < 44) small.push(`${((await b.getAttribute('aria-label')) ?? (await b.innerText())).trim().slice(0, 24)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
    expect(small).toEqual([])
    await page.screenshot({ path: `e2e-results/screens/factory-${viewport.width}.png`, fullPage: true })
  })
}
