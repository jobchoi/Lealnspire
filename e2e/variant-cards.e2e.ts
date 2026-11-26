import { expect, Game, test } from './helpers'
import { allStages } from '../src/model/stages'
import ko from '../src/i18n/locales/ko.json' with { type: 'json' }

/**
 * T59 QC 3차 회귀 방지: 변형 맵이 있는 모든 스테이지에서, 좁은 화면에서도 맵 카드(1/2, 2/2 …)를
 * 아이가 실제로 누를 수 있다(다른 요소가 덮지 않음). 한 단계 실행 뒤(센서 상태 줄에 글이 있을 때)도 확인.
 */
const variantStages = allStages.filter(stage => stage.variants && stage.variants.length > 1)
const title = (key: string) => (ko as Record<string, unknown>)[key] as string

for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }]) {
  test(`@layout ${viewport.width}: 변형 맵 카드를 모든 스테이지에서 누를 수 있다`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize(viewport)
    const game = new Game(page)
    await game.fresh()
    await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3, } ])) })), allStages.map(stage => stage.id))
    await page.reload()
    for (const stage of variantStages) {
      await page.goto('/')
      await game.press(game.button('스테이지 목록'))
      await game.press(page.locator('.stage-card', { hasText: title(stage.title) }).first())
      const cards = page.locator('.variant-cards button')
      await expect(cards).toHaveCount(stage.variants!.length)
      for (const phase of ['처음', '한 단계 뒤']) {
        const stepping = phase === '한 단계 뒤' && await game.button('한 단계').isEnabled()
        if (stepping) await game.press(game.button('한 단계'))
        for (let i = 0; i < stage.variants!.length; i++) {
          const card = cards.nth(i)
          const covered = await card.evaluate(e => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit && !(e.contains(hit) || hit.contains(e)) ? `${hit.tagName}.${hit.className}` : '' })
          expect(covered, `${stage.id} ${phase} ${i + 1}번 맵 카드를 덮는 요소`).toBe('')
        }
        if (stepping) await game.press(game.button('처음으로'))
      }
      // 실제로 눌러 바꿔 보고 되돌아온다
      if (await cards.nth(1).isEnabled()) {
        await game.press(cards.nth(1)); await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true')
        await game.press(cards.nth(0)); await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true')
      }
    }
  })
}
