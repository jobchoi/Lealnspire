import { expect, Game, SOLUTIONS, test } from './helpers'

test.describe('처음 온 아이', () => {
  test('첫 화면에서 시작해 1~8을 연속으로 완주하고, 진행 상황이 새로고침 뒤에도 남는다', async ({ page }) => {
    test.setTimeout(180_000)
    const g = new Game(page)
    await g.fresh()
    await expect(g.button('이어하기')).toHaveCount(0)
    await g.start()
    await g.speed('빠르게')
    for (let s = 1; s <= 8; s++) {
      await expect(page.locator('h1')).toContainText(`스테이지 ${s}`)
      await g.clear()
      await g.build(SOLUTIONS[s])
      const result = await g.runToEnd()
      expect(result, `스테이지 ${s} 별 3개`).toMatch(/별 3개|★★★/)
      if (s < 8) await g.press(g.dialog.getByRole('button', { name: '다음 스테이지', exact: true }))
      else expect(result).toContain('완주')
    }
    await page.reload()
    await g.press(g.button('스테이지 목록')).catch(async () => { await g.start(); await g.press(g.button('스테이지 목록')) })
    // 정규 1~8은 모두 열림(보너스 2는 보너스 1을 깨야 열리는 선택 활동이라 제외 — T21·T23 완주 계약)
    for (let i = 0; i < 8; i++) await expect(page.locator('.stage-card').nth(i)).not.toContainText('잠김')
  })

  test('블록·실행 버튼은 글을 몰라도 기호로 구분된다(모든 버튼에 한글 외 기호가 보임)', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    // 각 버튼에 그림(SVG) 또는 한글 외 기호가 보여야 함
    const buttons = page.locator('.palette button, .playback-controls button, .run-button')
    const items = await buttons.evaluateAll(es => es.map(e => ({ t: (e as HTMLElement).innerText, svg: !!e.querySelector('svg') })))
    expect(items.length).toBeGreaterThan(6)
    for (const it of items) expect(it.svg || it.t.replace(/[\s가-힣0-9.!]/g, '').length > 0, `기호 있음: "${it.t}"`).toBe(true)
  })

  test('스테이지 4: 미리 들어 있는 틀린 코드를 한 블록만 고쳐 성공한다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [] }, 2: { completed: true, bestStars: 3, lastProgram: [] }, 3: { completed: true, bestStars: 3, lastProgram: [] } } })))
    await page.reload()
    await g.press(g.button('이어하기'))
    await expect(page.locator('h1')).toContainText('스테이지 4')
    expect(await g.blockCount()).toBe(3)
    await g.speed('빠르게')
    expect(await g.runToEnd()).toContain('부딪')
    await g.press(g.dialog.getByRole('button', { name: '다시 하기', exact: true }))
    // 2번(왼쪽 돌기)을 지우고 오른쪽 돌기를 넣은 뒤 앞으로 옮긴다
    await g.remove('2')
    await g.add('R')
    await g.select('3')
    await g.press(g.action(/앞으로 옮기기$|위로$/))
    expect(await g.runToEnd()).toMatch(/별 3개|★★★/)
  })
})

test.describe('실수가 많은 사용자', () => {
  test('빈 프로그램은 실행할 수 없고, 블록을 빠르게 연타해도 정확히 그 수만큼 추가된다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await expect(g.runButton).toBeDisabled()
    for (let i = 0; i < 5; i++) await g.palette('F').click({ delay: 0 })
    expect(await g.blockCount()).toBe(5)
  })

  test('블록은 10개를 넘지 않는다(반복 몸체 포함). 상한에서는 추가 버튼이 막히고 안내가 보인다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    for (let i = 0; i < 14; i++) { if (await g.palette('F').isEnabled()) await g.add('F') }
    expect(await g.blockCount()).toBe(10)
    await expect(g.palette('F')).toBeDisabled()
    // 문구는 언어 파일에 따라 바뀔 수 있으므로, 상한 안내(status)가 보이는지로 확인
    await expect(page.locator('.editor [role=status]')).toBeVisible()
    await g.remove('1')
    await expect(g.palette('F')).toBeEnabled()
  })

  test('실행 중에는 편집할 수 없고, 실행 버튼을 연타해도 한 번만 재생된다. 처음으로 누르면 다시 편집 가능', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F L F')
    await g.speed('느리게')
    await g.press(g.runButton)
    await g.runButton.click({ force: true }).catch(() => {})
    await expect(g.palette('F')).toBeDisabled()
    await g.press(g.button('처음으로'))
    await expect(g.palette('F')).toBeEnabled()
    expect(await g.blockCount()).toBe(3)
  })

  test('한 단계를 끝까지 계속 눌러도 깨지지 않고 결과가 나온다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F F')
    for (let i = 0; i < 6; i++) {
      if (await g.dialog.isVisible()) break
      const step = g.button('한 단계')
      if (await step.isEnabled()) await g.press(step)
    }
    await expect(g.dialog).toBeVisible()
    await expect(g.dialog).toContainText(/별 \d개|★/)
  })

  test('재생 도중 새로고침해도 만든 코드가 그대로 있고 오류가 없다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F L F R')
    await g.speed('느리게')
    await g.press(g.runButton)
    await page.reload()
    if (await g.button('시작하기').isVisible()) await g.start()
    expect(await g.blockCount()).toBe(4)
  })

  test('반복 안의 반복(3단)도 만들고 실행하면 결과가 나온다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.add('N'); await g.select('1'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
    await g.add('N'); await g.select('1.1'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
    await g.add('F')
    expect(await g.blockCount()).toBe(3)
    await g.speed('빠르게')
    const r = await g.runToEnd()
    expect(r.length).toBeGreaterThan(0)
  })

  test('선택한 반복을 지우면 추가 위치가 최상위로 돌아간다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.add('N'); await g.select('1'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
    await g.add('F')
    await g.remove('1')
    await g.add('L')
    expect(await g.blockCount()).toBe(1)
    await expect(g.tile('1')).toHaveAttribute('aria-label', /왼쪽/)
  })
})

test.describe('키보드만 쓰는 사용자', () => {
  test('Tab과 Enter만으로 블록을 넣고 실행하고, Esc로 결과 창을 닫는다', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', '데스크톱 전용')
    const g = new Game(page)
    await g.fresh()
    await g.button('시작하기').focus(); await page.keyboard.press('Enter')
    await g.palette('F').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter')
    expect(await g.blockCount()).toBe(2)
    await g.button('빠르게').focus(); await page.keyboard.press('Enter')
    await g.runButton.focus(); await page.keyboard.press('Enter')
    await expect(g.dialog).toBeVisible({ timeout: 10_000 })
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(g.dialog).toHaveCount(0)
  })
})
