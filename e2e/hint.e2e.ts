import { expect, Game, test } from './helpers'

/** T16: 힌트는 요청할 때만, 볼 곳 → 질문 순서로. 정답 블록 순서는 말하지 않는다 */
test.describe('요청형 2단계 힌트', () => {
  test('실패 → 힌트 1단계(맵 강조) → 2단계 질문 → 직접 고쳐 성공, 다른 스테이지로 가면 닫힘', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    const hint = page.locator('#stage-hint')
    await expect(hint, '요청 전에는 힌트 없음').toHaveCount(0)
    await expect(g.board.locator('.board-hint')).toHaveCount(0)

    await g.build('F')
    await g.speed('빠르게')
    expect(await g.runToEnd()).toContain('도달하지')
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))

    await g.press(g.button('힌트'))
    await expect(hint).toContainText('1/2')
    await expect(hint).toContainText('칸을 세어')
    expect(await g.board.locator('.board-hint').count(), '맵에 볼 곳 강조').toBeGreaterThan(0)
    await g.press(g.button('다음 힌트'))
    await expect(hint).toContainText('2/2')
    await expect(hint).toContainText('몇 칸')
    await expect(g.button('다음 힌트'), '2단계가 마지막').toHaveCount(0)
    // 힌트를 열고 있어도 코드는 그대로
    expect(await g.blockCount()).toBe(1)

    await g.press(g.button('처음으로')) // 결과를 닫은 뒤에는 처음으로 돌아가야 편집 가능(기존 설계)
    await g.add('F')
    const result = await g.runToEnd()
    expect(result).toMatch(/성공|별 \d개|★/)
    await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
    await expect(hint, '다음 스테이지에서는 닫혀 있음').toHaveCount(0)
  })

  test('어느 스테이지의 힌트도 정답 블록 순서를 말하지 않는다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(i => [i, { completed: true, bestStars: 3, lastProgram: [] }])) })))
    await page.reload()
    for (let s = 1; s <= 8; s++) {
      await g.press(g.button('스테이지 목록'))
      await g.press(page.locator('.stage-card').nth(s - 1))
      await g.press(g.button('힌트'))
      const one = await page.locator('#stage-hint').innerText()
      await g.press(g.button('다음 힌트'))
      const two = await page.locator('#stage-hint').innerText()
      for (const text of [one, two]) {
        // 블록 이름이 두 개 이상 이어지면 순서를 알려 주는 것(예: "앞, 왼쪽, 앞")
        expect(text, `스테이지 ${s} 힌트: ${text}`).not.toMatch(/(앞으로?|왼쪽|오른쪽)[^.?]{0,6}[,·]\s*(앞으로?|왼쪽|오른쪽)/)
        expect(text).not.toMatch(/\d+\s*번 반복/)
      }
    }
  })
})
