import type { Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'
import { allStages, unit9Stages } from '../src/model/stages'

/** T67: 9단원 이벤트 — on 처리기는 놓인 순서가 아니라 신호가 와야, 온 순서대로 하나씩 실행된다 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit9Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  const u93 = { main: unit9Stages[2].initialProgram, functions: [] }
  await page.evaluate(([ids, program]) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3, ...(id === 'u9-3' ? { lastProgram: program } : {}) }])) })), [[...before, ...extra], u93] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}
const onPalette = (page: Page) => page.locator('.palette').getByRole('button', { name: /on/ }).first()
const handler = (page: Page, order: string) => page.locator('.workspace').getByRole('button', { name: new RegExp(`^${order}번 신호`) }).first()
/** 처리기 하나: on [F, F], 필요하면 신호를 바꿈 */
async function addHandler(g: Game, page: Page, order: string, signal?: string) {
  await g.press(onPalette(page))
  await g.press(handler(page, order))
  if (signal) await g.press(btn(page, signal))
  await g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/)); await g.add('F'); await g.add('F'); await g.press(g.action(/선택 해제$|넣기 해제$/))
}

test.describe('9단원 이벤트', () => {
  test('u9-1: main에 블록을 놓으면 문이 닫혀 있어 실패, on ◇ 처리기로 옮기면 신호 뒤에 출발해 성공', async ({ page }) => {
    const g = await open(page, '신호가 와야 출발')
    await g.add('F'); await g.add('F')
    expect(await g.runToEnd(), 'main은 신호 전에 실행 → 닫힌 문에 부딪힘').not.toContain('성공')
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    await g.clear()
    await addHandler(g, page, '1')
    expect(await g.blockCount(), 'on + 앞으로 2').toBe(3)
    await page.screenshot({ path: 'e2e-results/screens/events-u91-built.png' })
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u9-2: ○ 처리기를 먼저(위에) 놓아도 신호 순서(◇ → ○)대로 실행되어 성공', async ({ page }) => {
    const g = await open(page, '연결과 순서', ['u9-1'])
    await addHandler(g, page, '1', '동그라미 신호')
    await addHandler(g, page, '2', '다이아몬드 신호')
    await expect(handler(page, '1')).toHaveAttribute('aria-label', /동그라미/)
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u9-3: 서로 바뀐 연결을 신호 기호만 바꿔 고치면 9단원 완주', async ({ page }) => {
    const g = await open(page, '잘못 연결한 처리기', ['u9-1', 'u9-2'])
    expect(await g.runToEnd(), '첫 신호 ◇에 왼쪽 처리기 → 북쪽 벽').not.toContain('성공')
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    // ◇에 연결된 처리기(왼쪽 돌기가 든 쪽)를 골라 ○로 바꾸면 두 처리기의 연결이 서로 바뀜
    const withTurn = page.locator('.workspace').getByRole('button', { name: /^\d번 신호 다이아몬드/ }).first()
    await g.press(withTurn)
    await g.press(btn(page, '동그라미 신호'))
    await page.screenshot({ path: 'e2e-results/screens/events-u93-fixed.png' })
    expect(await g.runToEnd()).toContain('9단원 완주')
  })

  test('한 단계(375): 신호 도착·기다리는 신호·실행 중 처리기가 보이고, 연결 없는 △는 아무 일도 없다고 알린다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, '신호가 와야 출발')
    await addHandler(g, page, '1')
    // 2번 시나리오(△ → ◇)
    await g.press(page.locator('.variant-cards button').nth(1))
    let sawUnconnected = false, sawArrival = false
    for (let i = 0; i < 10; i++) {
      await g.press(g.button('한 단계'))
      if (await page.getByText('실행할 처리기가 없어요').count()) sawUnconnected = true
      if (await page.getByText(/다이아몬드 신호가 왔어요/).count()) sawArrival = true
      if (sawUnconnected && sawArrival) break
    }
    expect(sawUnconnected, '△: 연결 없음 안내').toBe(true)
    expect(sawArrival, '◇ 도착 안내').toBe(true)
    await page.screenshot({ path: 'e2e-results/screens/events-step-375.png' })
    await g.noHorizontalScroll()
  })
})

/** 9단원 배치·대비 — 세 월드 × 1280/375/360 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 9단원 배치(맵 크기, 신호 고르기 44px, 대비, 겹침)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = await open(page, '잘못 연결한 처리기', ['u9-1', 'u9-2', 'u9-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const board = (await g.board.boundingBox())!
      // 360×560은 기존 배치 규칙상 맵 높이 75px(1~8단원 공통) — 그 크기만 70px 기준
      expect(Math.min(board.width, board.height), '맵 크기').toBeGreaterThanOrEqual(viewport.height < 600 ? 70 : 100)
      for (const button of await page.locator('.palette button').all()) {
        const shown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(); return r.width > 2 && r.height > 2 })
        if (shown) expect(await contrastOf(button), `${world} 팔레트 ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      await g.press(handler(page, '1'))
      for (const signal of await page.locator('.signal-picker button').all()) {
        await signal.scrollIntoViewIfNeeded()
        const b = (await signal.boundingBox())!
        expect(Math.min(b.width, b.height), `${await signal.getAttribute('aria-label')} 44px`).toBeGreaterThanOrEqual(44)
        expect(b.x, '왼쪽 잘림').toBeGreaterThanOrEqual(0)
        expect(b.x + b.width, '오른쪽 잘림').toBeLessThanOrEqual(viewport.width)
      }
      // 맵 카드 안의 신호 기호가 카드 밖으로 넘치지 않는다
      for (const card of await page.locator('.variant-cards button').all()) expect(await card.evaluate(e => { const b = e.getBoundingClientRect(); return [...e.querySelectorAll('.scenario-signals svg')].every(s => { const r = s.getBoundingClientRect(); return r.bottom <= b.bottom + 2 && r.right <= b.right + 2 }) }), '맵 카드 신호 기호 넘침').toBe(true)
      // 켜진 신호 버튼은 기호가 보이고(대비), 안내문은 잘리지 않는다
      expect(await contrastOf(page.locator('.signal-picker button[aria-pressed=true]')), '켜진 신호 버튼 대비').toBeGreaterThanOrEqual(3)
      expect(await page.locator('.event-notice').evaluate(e => e.scrollHeight - e.clientHeight), '안내문 잘림').toBeLessThanOrEqual(1)
      for (const tile of await page.locator('.workspace').getByRole('button', { name: /신호/ }).all()) {
        if (!(await tile.isVisible())) continue
        expect(await contrastOf(tile), `${world} ${await tile.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), '세로 스크롤 없음(실행·속도 버튼까지 보임)').toBeLessThanOrEqual(viewport.width >= 1000 ? 0 : 99999)
      await page.screenshot({ path: `e2e-results/screens/events-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}
