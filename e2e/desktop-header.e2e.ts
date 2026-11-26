import { expect, Game, test } from './helpers'
import { allStages } from '../src/model/stages'

/**
 * T64(데스크톱 배치) 회귀 방지 — GPT 교차 검토 권장: 제목 줄 오른쪽으로 올린 버튼 줄·월드 버튼이
 * 1000×600·긴 영어 제목·깬 스테이지(월드 버튼 표시)에서도 제목과 겹치지 않고, 맵이 충분히 크다.
 */
const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1

for (const viewport of [{ width: 1000, height: 600 }, { width: 1280, height: 720 }]) {
  for (const lang of ['ko', 'en']) {
    test(`@layout ${viewport.width}×${viewport.height} ${lang}: 제목·버튼 줄·월드 버튼이 겹치지 않고 맵이 크다`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize(viewport)
      const game = new Game(page)
      await game.fresh()
      await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3 }])) })), allStages.map(stage => stage.id))
      // 제목이 긴 스테이지들(영어 기준): 1단원·2단원·6단원·8단원 마지막
      for (const index of [0, allStages.findIndex(s => s.id === 'u2-4'), allStages.findIndex(s => s.id === 'u6-3'), allStages.findIndex(s => s.id === 'u8-3')]) {
        await page.goto(lang === 'en' ? '/?lang=en' : '/')
        await game.press(page.getByRole('button', { name: lang === 'en' ? 'Stages' : '스테이지 목록', exact: true }))
        await game.press(page.locator('.stage-card').nth(index))
        const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!
        const textWidth = await page.getByRole('heading', { level: 1 }).evaluate(h => { const r = document.createRange(); r.selectNodeContents(h); return r.getBoundingClientRect().right })
        const boxes = [...await page.locator('.stage-controls button').all(), ...await page.locator('.world-switch button').all()]
        expect(boxes.length, '버튼 줄·월드 버튼').toBeGreaterThanOrEqual(5)
        for (const button of boxes) {
          const b = (await button.boundingBox())!
          expect(textWidth <= b.x + 1 || title.y + title.height <= b.y || b.y + b.height <= title.y, `${allStages[index].id}: 제목 글자가 ${await button.getAttribute('aria-label')} 버튼과 겹침`).toBe(true)
          for (const other of boxes) if (other !== button) expect(overlap(b, (await other.boundingBox())!), '버튼끼리 겹침').toBe(false)
        }
        const board = (await game.board.boundingBox())!
        expect(Math.min(board.width, board.height), `${allStages[index].id}: 맵 짧은 변 100px 이상`).toBeGreaterThanOrEqual(100)
        await game.noHorizontalScroll()
        expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), `${allStages[index].id}: 세로 스크롤 없음`).toBeLessThanOrEqual(0)
        await page.screenshot({ path: `e2e-results/screens/desktop-header-${viewport.width}-${lang}-${allStages[index].id}.png` })
      }
    })
  }
}
