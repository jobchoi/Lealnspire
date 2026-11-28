import { contrastOf, expect, Game, test } from './helpers'
import { unit6Stages } from '../src/model/stages'

const completed = ['1','2','3','4','5','6','7','8', ...[2,3,4,5].flatMap(n => Array.from({ length: n === 2 ? 6 : 3 }, (_, i) => `u${n}-${i + 1}`)), 'u6-1', 'u6-2', 'u6-3']
async function open(page: import('@playwright/test').Page, name: string, replay = false) {
  const game = new Game(page)
  await game.fresh()
  await page.evaluate(({ ids, initial }) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3, lastProgram: { main: id === 'u6-1' ? initial : [], functions: [] } }])) })), { ids: completed, initial: unit6Stages[0].initialProgram! })
  if (replay) await page.evaluate(program => {
    const progress = JSON.parse(localStorage.getItem('lealnspire.progress.v2')!)
    progress.stages['u6-4'] = { completed: true, bestStars: 3, lastProgram: { main: program, functions: [] } }
    localStorage.setItem('lealnspire.progress.v2', JSON.stringify(progress))
  }, unit6Stages[3].initialProgram!)
  await page.reload()
  await game.press(game.button('스테이지 목록'))
  await game.press(page.locator('.stage-card', { hasText: name }))
  return game
}
/** not 켜기/끄기 버튼(aria-pressed) */
async function setNot(page: import('@playwright/test').Page, which: '첫 조건' | '둘째 조건', on: boolean) {
  const button = page.getByRole('button', { name: `${which} not`, exact: true })
  if ((await button.getAttribute('aria-pressed') === 'true') !== on) await new Game(page).press(button)
}
test('u6-4 조건을 고치고 검사 결과와 성공을 확인한다', async ({ page }) => {
  const game = await open(page, 'and일까, or일까')
  await game.select('1')
  await page.getByLabel('조건 조합').selectOption('or')
  await game.press(game.button('한 단계'))
  await expect(page.locator('.logic-results')).toContainText('or')
  await expect(page.locator('.logic-results')).toContainText('결과')
  await game.press(game.button('처음으로'))
  await game.speed('빠르게')
  await expect(game.dialog).toHaveCount(0)
  expect(await game.runToEnd()).toContain('성공')
})
test('선택 예측: 진리표 8칸을 맞게 고르면 모두 ✓, 다시 고르기는 답을 비운다', async ({ page }) => {
  const game = await open(page, 'not으로 반대로 바꾸기')
  await game.press(game.button('스테이지 목록'))
  await game.press(page.locator('li', { has: page.locator('.stage-card', { hasText: 'not으로 반대로 바꾸기' }) }).locator('.prediction-entry'))
  const selects = page.locator('.logic-prediction select')
  await expect(selects).toHaveCount(8)
  // 행: (참,참) (참,거짓) (거짓,참) (거짓,거짓), 열: and, or
  const truth = [true, true, false, true, false, true, false, false]
  for (const [i, value] of truth.entries()) await selects.nth(i).selectOption(String(value))
  await game.press(game.button('답 확인'))
  await expect(page.locator('.logic-prediction')).not.toContainText('✕')
  expect((await page.locator('.logic-prediction').innerText()).match(/✓/g)).toHaveLength(8)
  await game.press(game.button('다시 고르기'))
  for (let i = 0; i < 8; i++) await expect(selects.nth(i)).toHaveValue('')
  // 하나만 틀리게(and 첫 칸을 거짓) 고르면 그 칸만 ✕
  for (const [i, value] of truth.entries()) await selects.nth(i).selectOption(String(i === 0 ? !value : value))
  await game.press(game.button('답 확인'))
  expect((await page.locator('.logic-prediction').innerText()).match(/✕/g)).toHaveLength(1)
})
test('@layout 영어와 좁은 화면에서 조건 편집을 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await open(page, 'and일까, or일까')
  await page.goto('/?lang=en')
  const game = new Game(page)
  await game.press(page.getByRole('button', { name: 'Stages' }))
  await game.press(page.locator('.stage-card', { hasText: 'and or or?' }))
  await game.press(page.locator('.workspace [data-block-id]').first())
  const editor = page.locator('.logic-editor')
  await expect(page.getByLabel('Condition operator')).toBeVisible()
  await expect(editor).not.toContainText(/[가-힣]/)
  await game.noHorizontalScroll()
  await page.screenshot({ path: 'e2e-results/screens/logic-narrow.png' })
})
test('u6-1에서 not으로 초기 while을 고쳐 두 맵을 통과한다', async ({ page }) => {
  const game = await open(page, 'not으로 반대로 바꾸기')
  await game.select('1')
  await setNot(page, '첫 조건', true)
  await game.speed('빠르게')
  expect(await game.runToEnd()).toContain('성공')
})
test('영어 조건 이름을 표시한다', async ({ page }) => {
  await open(page, 'and일까, or일까')
  await page.goto('/?lang=en')
  await page.getByRole('button', { name: 'Stages' }).click()
  await page.locator('.stage-card', { hasText: 'and or or?' }).click()
  await page.locator('.workspace [data-block-id]').first().click()
  await expect(page.getByLabel('Condition operator')).toBeVisible()
})

const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width} 조건 타일 경계`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const game = await open(page, 'and일까, or일까', true)
      await game.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const tile = game.tile('1')
      const label = tile.locator('.logic-condition')
      await expect(label).toBeVisible()
      const box = await tile.boundingBox()
      const textBox = await label.boundingBox()
      expect(box).not.toBeNull()
      expect(textBox).not.toBeNull()
      expect(textBox!.x).toBeGreaterThanOrEqual(box!.x)
      expect(textBox!.y).toBeGreaterThanOrEqual(box!.y)
      expect(textBox!.x + textBox!.width).toBeLessThanOrEqual(box!.x + box!.width)
      expect(textBox!.y + textBox!.height).toBeLessThanOrEqual(box!.y + box!.height)
    })
  }
}
test('검사 결과에 and와 not 반전 전후를 표시한다', async ({ page }) => {
  const game = await open(page, 'and일까, or일까')
  await game.select('1')
  await setNot(page, '첫 조건', true)
  await game.press(game.button('한 단계'))
  await expect(page.locator('.logic-results')).toContainText('and')
  await expect(page.locator('.logic-results')).toContainText(/왼쪽이 막힘:.*→ not:/)
})

/** T59 사용자 시나리오: 처음부터 조건을 조립. 앞 퍼즐(u6-2)의 규칙을 그대로 쓰면 u6-3 1번 맵에서 실패하고, and로 둘째 조건을 더하면 성공 */
const ifPalette = (page: import('@playwright/test').Page) => page.locator('.palette').getByRole('button', { name: '앞이 막혔으면', exact: true })
async function buildSideRule(game: Game, page: import('@playwright/test').Page) {
  await game.add('N'); await game.select('1')
  for (let c = 3; c < 6; c++) await game.press(game.action(/늘리기$/))
  await game.press(game.action(/추가 대상으로 선택$|안에 넣기$/))
  await game.press(ifPalette(page)); await game.add('F')
  await game.press(game.action(/선택 해제$|넣기 해제$/))
  await game.select('1.1')
  await game.press(game.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await game.add('L'); await game.press(game.action(/선택 해제$|넣기 해제$/))
  await game.select('1.1')
  await page.getByLabel('첫 조건', { exact: true }).selectOption('blockedLeft')
  await setNot(page, '첫 조건', true)
}
test('u6-2: 옆 센서 조건을 처음부터 조립해 두 맵을 통과한다', async ({ page }) => {
  const game = await open(page, '옆을 보는 로봇')
  await buildSideRule(game, page)
  expect(await game.blockCount(), 'repeat, if, 왼쪽, 앞으로 — 조건은 블록 수에 안 들어감').toBe(4)
  await game.speed('빠르게')
  expect(await game.runToEnd()).toContain('성공')
})
test('u6-3: 왼쪽만 보는 규칙은 막다른 갈래에서 실패하고, and로 오른쪽을 더하면 성공한다', async ({ page }) => {
  const game = await open(page, '양쪽이 다 열렸을 때')
  await buildSideRule(game, page)
  await game.speed('빠르게')
  const fail = await game.runToEnd()
  expect(fail).not.toContain('성공')
  await game.press(game.dialog.getByRole('button', { name: /고치기/ }))
  await game.select('1.1')
  await page.getByLabel('조건 조합').selectOption('and')
  await page.getByLabel('둘째 조건', { exact: true }).selectOption('blockedRight')
  await setNot(page, '둘째 조건', true)
  expect(await game.blockCount()).toBe(4)
  await page.screenshot({ path: 'e2e-results/screens/logic-u63-and.png' })
  expect(await game.runToEnd()).toContain('성공')
})
test('u6-3 한 단계: 갈림길 검사에서 두 조건 결과와 최종 결과가 함께 보인다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  const game = await open(page, '양쪽이 다 열렸을 때')
  await buildSideRule(game, page)
  await game.select('1.1')
  await page.getByLabel('조건 조합').selectOption('and')
  await page.getByLabel('둘째 조건', { exact: true }).selectOption('blockedRight')
  await game.press(game.button('한 단계'))
  await expect(page.locator('.logic-results')).toContainText('and')
  await expect(page.locator('.logic-results')).toContainText('결과')
  await page.screenshot({ path: 'e2e-results/screens/logic-u63-step-375.png' })
})

/** T59 QC: and 조건 편집 줄(두 조건 + not)을 펼친 상태에서 세 월드 × 세 화면 크기 배치 */
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width} and 조건 편집 줄이 잘리지 않는다`, async ({ page }) => {
      test.setTimeout(60_000) // 조작 수십 개를 하나씩 재므로 전체 실행 부하에서 30초를 넘김(단독 8초)
      await page.setViewportSize(viewport)
      const game = await open(page, '양쪽이 다 열렸을 때')
      await game.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      await buildSideRule(game, page)
      await game.select('1.1')
      await page.getByLabel('조건 조합').selectOption('and')
      const editor = page.locator('.logic-editor')
      await editor.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `e2e-results/screens/logic-editor-${worlds.indexOf(world)}-${viewport.width}.png` })
      // 조건 편집 줄과 작업 막대의 모든 조작: 화면 안(좌우), 44px 이상, 다른 요소(아래 실행 막대 등)에 가리지 않음, 글자 단위 줄바꿈 없음
      const controls = [...await editor.locator('select, button, input').all(), ...await page.locator('.tile-toolbar button').all()]
      for (const control of controls) {
        await control.scrollIntoViewIfNeeded()
        const box = (await control.boundingBox())!
        const name = (await control.getAttribute('aria-label')) ?? (await control.evaluate(e => e.tagName))
        expect(box.x, `${name}: 왼쪽 잘림`).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, `${name}: 오른쪽 잘림`).toBeLessThanOrEqual(viewport.width)
        const target = await control.evaluate(e => e.closest('label') ?? e)
        const tall = await control.evaluate(e => (e.closest('label') ?? e).getBoundingClientRect().height)
        expect(tall, `${name}: 누르기 쉬운 높이(44px)`).toBeGreaterThanOrEqual(44)
        expect(await control.evaluate(e => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && ((e.closest('label') ?? e).contains(hit) || hit.contains(e)) }), `${name}: 다른 요소에 가림`).toBe(true)
        void target
      }
      for (const label of await editor.locator('label').all()) {
        const [height, font] = await label.evaluate(e => [e.getBoundingClientRect().height, parseFloat(getComputedStyle(e).fontSize)])
        expect(height, '라벨 글자가 여러 줄로 쪼개지지 않음').toBeLessThan(Math.max(48, font * 3.2))
      }
      // 맵 카드(1/2, 2/2)·팔레트 버튼·블록 수 표시는 다른 요소에 가리지 않는다(가운데 점 기준)
      const uncovered = (l: import('@playwright/test').Locator) => l.evaluate(e => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (e.contains(hit) || hit.contains(e)) })
      for (const card of await page.locator('.variant-cards button').all()) expect(await uncovered(card), '맵 카드가 가려짐').toBe(true)
      for (const button of await page.locator('.palette button').all()) expect(await uncovered(button), `팔레트 ${await button.getAttribute('aria-label')} 버튼이 가려짐`).toBe(true)
      // 팔레트 버튼(넘쳐 커진 원 포함)이 블록 수 표시·안내 문장과 겹치지 않는다
      const texts = await page.locator('.block-budget p, .block-budget + p, .editor > p').all()
      for (const button of await page.locator('.palette button').all()) {
        const a = (await button.boundingBox())!
        for (const text of texts) {
          if (!(await text.isVisible())) continue
          const b = (await text.boundingBox())!
          const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2
          expect(overlap, `팔레트 ${await button.getAttribute('aria-label')} 버튼이 "${(await text.innerText()).slice(0, 12)}" 문장과 겹침`).toBe(false)
        }
      }
      // 켜진 not 버튼은 글자가 보이고(대비 3:1 이상) 선택 항목에 이모지·대체 상자(□)가 없다
      const onNot = page.getByRole('button', { name: '첫 조건 not', exact: true })
      await expect(onNot).toHaveAttribute('aria-pressed', 'true')
      await expect(onNot).toContainText('not')
      expect(await contrastOf(onNot), '켜진 not 글자 대비').toBeGreaterThanOrEqual(3)
      for (const option of await editor.locator('option').allInnerTexts()) expect(option, '선택 항목 기호').not.toMatch(/\p{Extended_Pictographic}|▥|□/u)
      const buttons = await Promise.all((await page.locator('.palette button').all()).map(async b => ({ name: await b.getAttribute('aria-label'), box: (await b.boundingBox())! })))
      for (const [i, a] of buttons.entries()) for (const c of buttons.slice(i + 1)) {
        const overlap = Math.min(a.box.x + a.box.width, c.box.x + c.box.width) - Math.max(a.box.x, c.box.x) > 2 && Math.min(a.box.y + a.box.height, c.box.y + c.box.height) - Math.max(a.box.y, c.box.y) > 2
        expect(overlap, `팔레트 ${a.name}·${c.name} 버튼이 겹침`).toBe(false)
      }
      await game.noHorizontalScroll()
    })
  }
}

/** T59 QC: 6단원 팔레트(블록 6종)는 세 월드 모두 기호·글자가 바탕과 구분된다(대비 3:1 이상, 블록을 놓기 전 상태) */
for (const world of worlds) {
  test(`${world}: 6단원 팔레트 버튼 대비`, async ({ page }) => {
    const game = await open(page, '양쪽이 다 열렸을 때')
    await game.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
    for (const button of await page.locator('.palette button').all()) {
      await expect(button).toBeEnabled()
      // 글자(small)가 화면에 보이지 않는 버튼(게임기 십자키)은 기호만 있어 스크린샷으로 확인
      const labelShown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(), cs = getComputedStyle(s); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.color !== cs.backgroundColor })
      if (!labelShown) continue
      expect(await contrastOf(button), `${world} ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
    }
  })
}
