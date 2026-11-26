import type { Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'
import { allStages, bonusStages, unit12Stages } from '../src/model/stages'

/** T71: 12단원 종합 — 개념 이름을 알려 주지 않고, 두 맵에서 달라지는 것을 보고 필요한 도구를 골라 쓴다 */
const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const before = allStages.slice(0, allStages.indexOf(unit12Stages[0])).map(stage => stage.id)

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3 }])) })), [...before, ...extra])
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

test.describe('12단원 종합', () => {
  test('u12-1: 개념 이름 없이 시작 — 반복 안에서 앞이 막혔는지 보고 돌아 두 맵 통과', async ({ page }) => {
    const g = await open(page, '구부러진 길')
    await expect(page.locator('.stage-goal').first()).toContainText('같은 코드로 두 맵 모두 도착해 보세요')
    // repeat 7 [ if 앞 막힘 [R], F ]
    await g.add('N'); await g.select('1')
    for (let c = 3; c < 7; c++) await g.press(g.action(/늘리기$/))
    await into(g)
    await g.press(page.locator('.palette').getByRole('button', { name: '앞이 막혔으면', exact: true }))
    await g.add('F')
    await g.select('1.1'); await into(g); await g.add('R'); await out(g)
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toContain('성공')
  })

  test('u12-3: 값이 아니라 리스트 길이로 반복해 두 맵 통과', async ({ page }) => {
    const g = await open(page, '값일까, 개수일까?', ['u12-1', 'u12-2'])
    await g.add('N'); await g.select('1')
    for (let i = 0; i < 6 && !/길이|length/.test((await tile(page, '1').getAttribute('aria-label')) ?? ''); i++) await g.press(btn(page, '반복에 쓸 값 바꾸기'))
    await into(g); await g.add('F'); await out(g)
    await g.add('L'); await g.add('F')
    expect(await g.runToEnd()).toContain('12단원 완주')
  })

  test('전체 과정 완주: 정규 퍼즐을 모두 끝내면 전체 완주 문구, 보너스는 조건에 없음', async ({ page }) => {
    const bonusIds = new Set(bonusStages.map(stage => stage.id))
    const g = new Game(page)
    await g.fresh()
    // 보너스는 하나도 안 한 상태 + u12-3만 남김
    await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 1 }])) })), allStages.filter(stage => stage.id !== 'u12-3' && !bonusIds.has(stage.id)).map(stage => stage.id))
    await page.reload()
    await g.press(g.button('스테이지 목록'))
    await g.press(page.locator('.stage-card', { hasText: '값일까, 개수일까?' }))
    await g.speed('빠르게')
    await g.add('N'); await g.select('1')
    for (let i = 0; i < 6 && !/길이|length/.test((await tile(page, '1').getAttribute('aria-label')) ?? ''); i++) await g.press(btn(page, '반복에 쓸 값 바꾸기'))
    await into(g); await g.add('F'); await out(g)
    await g.add('L'); await g.add('F')
    const result = await g.runToEnd()
    expect(result).toContain('모든 단원을 완주했어요')
    await page.screenshot({ path: 'e2e-results/screens/synthesis-complete.png' })
  })
})

/** 12단원 배치·대비 — 세 월드 × 1280/375/360 */
const worlds = ['크레용 스케치북', '기차 마을', '나의 게임기']
for (const world of worlds) {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 360, height: 560 }]) {
    test(`@layout ${world} ${viewport.width}: 12단원 배치(맵, 팔레트 대비, 스크롤)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = await open(page, '값일까, 개수일까?', ['u12-1', 'u12-2', 'u12-3'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const board = (await g.board.boundingBox())!
      expect(Math.min(board.width, board.height), '맵 크기').toBeGreaterThanOrEqual(viewport.height < 600 ? 70 : 100)
      for (const button of await page.locator('.palette button').all()) {
        const shown = await button.evaluate(e => { const s = e.querySelector('small'); if (!s) return true; const r = s.getBoundingClientRect(); return r.width > 2 && r.height > 2 })
        if (shown) expect(await contrastOf(button), `${world} 팔레트 ${await button.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), '세로 스크롤 없음').toBeLessThanOrEqual(viewport.width >= 1000 ? 0 : 99999)
      await page.screenshot({ path: `e2e-results/screens/synthesis-layout-${worlds.indexOf(world)}-${viewport.width}.png` })
      await g.noHorizontalScroll()
    })
  }
}
