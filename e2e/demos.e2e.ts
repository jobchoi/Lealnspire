import { expect, Game, test } from './helpers'

/** T73-1: 첫 사용 시범 — 요청할 때만 열리고, 정답이 아닌 예시 장면으로 조작만 보여 주며, 진행은 그대로 */
const trigger = (page: import('@playwright/test').Page) => page.getByRole('button', { name: '어떻게 하는지 보기' })

test('처음 온 아이: 1번에서 시범 버튼(자동으로 뜨지 않음) → 4컷 끝까지 → 닫으면 작업 공간·진행 그대로', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.start()
  await expect(page.getByRole('dialog'), '자동 팝업 없음').toHaveCount(0)
  await expect(trigger(page)).toBeVisible()
  const box = (await trigger(page).boundingBox())!
  expect(Math.min(box.width, box.height), '시범 버튼 48px 이상').toBeGreaterThanOrEqual(48)
  await g.press(trigger(page))
  const dialog = page.getByRole('dialog', { name: '이렇게 해요' })
  await expect(dialog).toBeVisible()
  // 컷 낭독이 차례로 바뀌어 마지막 컷("로봇이 한 칸 움직였어요")까지 간다
  await expect(dialog.getByText('로봇이 한 칸 움직였어요')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: 'e2e-results/screens/demo-last-cut.png' })
  await g.press(dialog.getByRole('button', { name: '닫기' }))
  await expect(dialog).toHaveCount(0)
  expect(await g.blockCount(), '시범은 실제 작업 공간에 블록을 놓지 않음').toBe(0)
  expect((await page.evaluate(() => localStorage.getItem('lealnspire.progress.v2'))) ?? '', '진행 기록 없음(완료 처리 안 됨)').not.toMatch(/"completed":true/)
})

test('건너뛰면 본 것으로 기억 — 새로고침 뒤에도 자동으로 강조하지 않고, 홈 "시범 다시 보기"로 되돌린다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.start()
  await expect(trigger(page)).toHaveClass(/demo-suggested/)
  await g.press(trigger(page))
  await g.press(page.getByRole('dialog').getByRole('button', { name: '건너뛰기' }))
  await page.reload()
  await g.start()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  if (await trigger(page).count()) await expect(trigger(page)).not.toHaveClass(/demo-suggested/)
  await page.goto('/')
  await g.press(g.button('시범 다시 보기'))
  const confirm = page.getByRole('button', { name: /확인|다시 보기|예/ }).last()
  if (await page.getByText('본 시범을 처음부터 다시 볼까요?').count()) await g.press(confirm)
  await g.start()
  await expect(trigger(page)).toHaveClass(/demo-suggested/)
})

test('키보드만: Enter로 열고 Esc로 닫으면 포커스가 시범 버튼으로 돌아온다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.start()
  await trigger(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger(page)).toBeFocused()
})

test('동작 줄이기: 자동으로 넘어가지 않고 이전/다음으로 넘긴다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const g = new Game(page)
  await g.fresh()
  await g.start()
  await g.press(trigger(page))
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: '다음' })).toBeVisible()
  await page.waitForTimeout(3500)
  await expect(dialog.getByText('앞으로 블록을 눌렀어요'), '자동 진행 없음').toBeVisible()
  for (let i = 0; i < 3; i++) await g.press(dialog.getByRole('button', { name: '다음' }))
  await expect(dialog.getByText('로봇이 한 칸 움직였어요')).toBeVisible()
})

test('첫 블록을 놓으면 시범 버튼이 사라지고(정답 풀이 중 방해 안 함), 다른 스테이지에는 없다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh()
  await g.start()
  await g.add('F')
  await expect(trigger(page)).toHaveCount(0)
})

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
  test(`@layout ${viewport.width}: 시범 창이 화면 안에 들어가고 조작 버튼이 44px 이상`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const g = new Game(page)
    await g.fresh()
    await g.start()
    await g.press(trigger(page))
    const dialog = page.getByRole('dialog')
    const d = (await dialog.boundingBox())!
    expect(d.x).toBeGreaterThanOrEqual(0)
    expect(d.x + d.width).toBeLessThanOrEqual(viewport.width)
    expect(d.y).toBeGreaterThanOrEqual(0)
    expect(d.y + d.height).toBeLessThanOrEqual(viewport.height)
    for (const b of await dialog.getByRole('button').all()) {
      const r = (await b.boundingBox())!
      expect(Math.min(r.width, r.height), `${await b.innerText()} 44px`).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: `e2e-results/screens/demo-${viewport.width}.png` })
    await g.noHorizontalScroll()
  })
}

/** T73-2: 개념 시범 14종 — 각 진입 스테이지에서 버튼이 보이고, 4컷 끝까지 가며, 창이 화면 안·이모지 없음 */
import { allStages } from '../src/model/stages'
const entries: [string, string][] = [['1', 'add-run'], ['2', 'rotation'], ['5', 'repeat'], ['u2-1', 'condition'], ['u2-5', 'else'], ['u3-1', 'while'], ['u4-1', 'function'], ['u5-1', 'variable'], ['u6-1', 'logic'], ['u7-1', 'parameter'], ['u8-1', 'return'], ['u9-1', 'event'], ['u10-1', 'list'], ['u11-2', 'search']]
for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }]) {
  test(`${viewport.width}: 개념 시범 14종이 진입 스테이지에서 열리고 끝까지 재생된다`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' }) // 이전/다음으로 빠르게 넘김
    const g = new Game(page)
    await g.fresh()
    const problems: string[] = []
    for (const [id, demo] of entries) {
      const index = allStages.findIndex(s => s.id === id)
      // 앞 스테이지는 모두 완료, 진입 스테이지는 아직(코드 없음)
      await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(sid => [sid, { completed: true, bestStars: 3 }])) })), allStages.slice(0, index).map(s => s.id))
      await page.goto('/')
      await g.press(g.button('스테이지 목록'))
      await g.press(page.locator('.stage-card').nth(index))
      if (!(await trigger(page).count())) { problems.push(`${id}(${demo}): 시범 버튼 없음`); continue }
      await g.press(trigger(page))
      const dialog = page.getByRole('dialog')
      for (let i = 0; i < 3; i++) await g.press(dialog.getByRole('button', { name: '다음' }))
      await expect(dialog.getByText('4 / 4')).toBeVisible()
      const d = (await dialog.boundingBox())!
      if (d.x < 0 || d.y < 0 || d.x + d.width > viewport.width || d.y + d.height > viewport.height) problems.push(`${id}: 창이 화면 밖`)
      if (/[\u{1F300}-\u{1FAFF}]/u.test(await dialog.innerText())) problems.push(`${id}: 이모지 문자`)
      await page.screenshot({ path: `e2e-results/screens/demo-${demo}-${viewport.width}.png` })
      await g.press(dialog.getByRole('button', { name: '닫기' }))
    }
    expect(problems).toEqual([])
  })
}
