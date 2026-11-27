import type { Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'
import { allStages, unit11Stages } from '../src/model/stages'

/** T70: 11단원 탐색 — 같은 칸을 찾아도 비교 횟수는 절차·입력에 따라 다르다. 찾으면 멈추면 비교가 준다 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit11Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  const u113 = { main: unit11Stages[2].initialProgram, functions: [] }
  await page.evaluate(([ids, program]) => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries((ids as string[]).map(id => [id, { completed: true, bestStars: 3, ...(id === 'u11-3' ? { lastProgram: program } : {}) }])) })), [[...before, ...extra], u113] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}
const tile = (page: Page, order: string) => page.locator('.workspace').getByRole('button', { name: new RegExp(`^${order.replace('.', '\\.')}번 `) }).first()
const into = (g: Game) => g.press(g.action(/(?<!else )안에 넣기$|추가 대상으로 선택$/))
const out = (g: Game) => g.press(g.action(/선택 해제$|넣기 해제$/))
/** 미리 놓인 for each [if ▣=목표 []]의 if 안에 순회 멈추기를 넣음 */
async function addBreak(g: Game, page: Page) {
  await g.select('1.1'); await into(g)
  await g.press(btn(page, '순회 멈추기'))
  await out(g)
  await expect(tile(page, '1.1.1')).toBeVisible()
}
/** for each [if ▣=목표 [ (멈추기) ]], 앞으로 */
async function build(g: Game, page: Page, withBreak: boolean) {
  await g.press(page.locator('.palette').getByRole('button', { name: /리스트|list/ }).first())
  await g.select('1')
  await into(g)
  await g.press(page.locator('.palette').getByRole('button', { name: /▣/ }).first())
  if (withBreak) {
    await g.select('1.1'); await into(g)
    await g.press(btn(page, '순회 멈추기'))
    await out(g)
  }
  // 바깥 순회에서도 나와 main으로(앞으로는 main 최상위에만)
  for (let i = 0; i < 3 && await page.getByRole('button', { name: /선택 해제$|넣기 해제$/ }).count(); i++) await out(g)
  await g.add('F')
}

test.describe('11단원 탐색', () => {
  test('u11-1: 비교 조건으로 목표 칸을 표시하고 별로 간다', async ({ page }) => {
    const g = await open(page, '찾은 칸을 표시해요')
    await build(g, page, false)
    expect(await g.blockCount()).toBe(3)
    await page.screenshot({ path: 'e2e-results/screens/search-u111-built.png' })
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u11-2: 미리 놓인 코드는 끝까지 비교해 "비교를 줄여 보세요", 찾으면 멈추기를 넣으면 성공', async ({ page }) => {
    const g = await open(page, '찾았으면 멈춰요', ['u11-1'])
    expect(await g.runToEnd(), '끝까지 비교: 상한 초과 안내').toMatch(/줄여 보세요/)
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    await addBreak(g, page)
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toContain('성공')
  })

  test('앞으로 블록은 순회 안에 넣을 수 없다(이 단원 규칙)', async ({ page }) => {
    const g = await open(page, '찾은 칸을 표시해요')
    await g.press(page.locator('.palette').getByRole('button', { name: /리스트|list/ }).first())
    await g.select('1'); await into(g)
    await expect(g.palette('F'), '순회 안에 넣는 중에는 앞으로 비활성').toBeDisabled()
  })

  test('u11-3: 순회 방향만 뒤로 바꿔 고치면 11단원 완주', async ({ page }) => {
    const g = await open(page, '뒤에서 찾으면?', ['u11-1', 'u11-2'])
    expect(await g.runToEnd()).toMatch(/줄여 보세요/)
    await g.press(g.dialog.getByRole('button', { name: /고치기|닫기/ }).first())
    await g.select('1')
    await g.press(btn(page, '순회 방향 바꾸기'))
    await page.screenshot({ path: 'e2e-results/screens/search-u113-fixed.png' })
    expect(await g.runToEnd()).toContain('11단원 완주')
  })

  test('한 단계(375): 비교 횟수와 찾은 번호, 보지 않은 칸 안내가 보이고 이모지 문자가 없다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, '찾았으면 멈춰요', ['u11-1'])
    await addBreak(g, page)
    for (let i = 0; i < 6 && !(await page.getByText(/번호 \d에서 찾았어요/).count()); i++) await g.press(g.button('한 단계'))
    await expect(page.getByText(/번호 0에서 찾았어요/).first()).toBeVisible()
    await expect(page.getByText(/비교 1회 \/ 상한 2회/).first()).toBeVisible()
    expect(await page.locator('body').innerText(), '화면 글자에 🎯 같은 이모지 문자 없음(SVG로 그림)').not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    // 블록이 선택돼 작업 막대가 나온 상태에서도 타일 줄이 실행 막대 위로 40px 이상 보임
    const tb = (await page.locator('.workspace [data-block-id]').first().boundingBox())!, bar = (await page.locator('.execution-controls').first().boundingBox())!
    expect(bar.y - tb.y, '선택 상태 타일 보임').toBeGreaterThanOrEqual(40)
    await page.screenshot({ path: 'e2e-results/screens/search-step-375.png' })
    await g.noHorizontalScroll()
  })
})

/** 11단원 배치·대비 — 세 월드 × 1280/375/360 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 11단원 배치(리스트 칸, 대비, 타일 글자, 스크롤)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = await open(page, '뒤에서 찾으면?', ['u11-1', 'u11-2', 'u11-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      for (const button of await page.locator('.palette button').all()) {
        const shown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(); return r.width > 2 && r.height > 2 })
        if (shown) expect(await contrastOf(button), `${world} 팔레트 ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      for (const t of await page.locator('.workspace').getByRole('button', { name: /번 / }).all()) {
        if (!(await t.isVisible())) continue
        const overflow = await t.evaluate(e => [...e.querySelectorAll('*')].filter(c => !c.closest('.repeat-ribbon')).filter(c => { const a = c.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.width > 0 && (a.right > b.right + 1 || a.left < b.left - 1) }).map(c => `${c.tagName}.${c.getAttribute('class') ?? ''}`).join(' '))
        expect(overflow, `${await t.getAttribute('aria-label')}: 글자가 타일 밖으로`).toBe('')
        expect(await contrastOf(t), `${world} ${await t.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      // 작업 공간 타일 줄이 실행 막대에 가리지 않고 보인다(좁은 화면 포함)
      const firstTile = page.locator('.workspace [data-block-id]').first()
      await firstTile.scrollIntoViewIfNeeded()
      expect(await firstTile.evaluate(e => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (e.contains(hit) || hit.contains(e)) }), '첫 타일이 다른 요소에 가림').toBe(true)
      const tb = (await firstTile.boundingBox())!, bar = (await page.locator('.execution-controls, .playback-controls').last().boundingBox())!
      if (viewport.width < 1000) expect(bar.y - tb.y, '타일이 실행 막대 위로 40px 이상 보임').toBeGreaterThanOrEqual(40)
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), '세로 스크롤 없음').toBeLessThanOrEqual(viewport.width >= 1000 ? 0 : 99999)
      await page.screenshot({ path: `e2e-results/screens/search-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}

/** T64 2차 회귀 방지: 11단원 좁은 화면에서 맵이 리스트 칸·블록 수 표시를 덮지 않는다(세 월드) */
for (const world of worlds) {
  test(`@layout ${world} 375: 11단원 맵이 리스트 칸과 겹치지 않음`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const g = await open(page, '뒤에서 찾으면?', ['u11-1', 'u11-2', 'u11-3'])
    await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
    const [board, list, budget] = await Promise.all([g.board.boundingBox(), page.locator('.list-state').boundingBox(), page.locator('.block-budget p').first().boundingBox()])
    for (const [name, other] of [['리스트 칸', list!], ['블록 수 표시', budget!]] as const) {
      const overlap = Math.min(board!.y + board!.height, other.y + other.height) - Math.max(board!.y, other.y) > 2 && Math.min(board!.x + board!.width, other.x + other.width) - Math.max(board!.x, other.x) > 2
      expect(overlap, `맵이 ${name}과 겹침`).toBe(false)
    }
  })
}
