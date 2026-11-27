import type { Page } from '@playwright/test'
import { contrastOf, expect, Game, test } from './helpers'

/** T48: 5단원 변수 — 맵마다 다른 상자 A의 값으로 같은 코드를 쓰고, 값을 바꾸고, 순서를 고친다 */
const before = JSON.stringify({ version: 1, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', 'u2-1', 'u2-2', 'u2-3', 'u2-4', 'u2-5', 'u2-6', 'u3-1', 'u3-2', 'u3-3', 'u4-1', 'u4-2', 'u4-3'].map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })
const into = (g: Game) => g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
const out = (g: Game) => g.press(g.action(/선택 해제$|넣기 해제$/))
const palette = (page: Page, name: string) => page.locator('.palette').getByRole('button', { name, exact: true })

async function open(page: Page, title: string, extra: string[] = []) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(([v, ids]) => { const s = JSON.parse(v as string); for (const id of ids as string[]) s.stages[id] = { completed: true, bestStars: 3, lastProgram: [] }; localStorage.setItem('lealnspire.progress', JSON.stringify(s)) }, [before, extra] as const)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card', { hasText: title }))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
  await g.speed('빠르게')
  return g
}

test.describe('5단원 변수', () => {
  test('u5-1: 숫자로 센 반복은 2번 맵에서 실패, 횟수를 A로 바꾸면 두 맵 모두 성공. 센서 블록은 없다', async ({ page }) => {
    const g = await open(page, '상자에 든 수만큼')
    await expect(palette(page, '앞이 막혔으면'), 'if 없음').toHaveCount(0)
    await expect(palette(page, '앞이 열려 있는 동안'), 'while 없음').toHaveCount(0)
    await expect(page.getByText(/A\s*=\s*2/).first(), '맵 카드에 시작 값').toBeVisible()
    await g.build('2[F] L F')
    expect(await g.runToEnd()).toMatch(/2번 맵에서/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await g.select('1'); await g.press(g.action(/횟수를 A로$/))
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('u5-2: repeat 안에서 A를 1씩 키워 점점 길어지는 길을 지나간다', async ({ page }) => {
    const g = await open(page, '점점 길어지는 길', ['u5-1'])
    await g.add('N'); await g.select('1'); await into(g); await g.add('N'); await out(g)
    await g.select('1.1'); await g.press(g.action(/횟수를 A로$/)); await into(g); await g.add('F'); await out(g)
    await g.select('1'); await into(g); await g.add('L'); await g.press(palette(page, '상자 A의 값을 1만큼 바꾸기')); await out(g)
    expect(await g.blockCount()).toBe(5)
    expect(await g.runToEnd()).toMatch(/성공/)
  })

  test('u5-3: 값을 넣기 전에 반복하면 0칸 → set을 앞으로 옮겨 성공 → 5단원 완주, 한 단계로 상자 값 변화가 보인다', async ({ page }) => {
    const g = await open(page, '값을 넣는 순서', ['u5-1', 'u5-2'])
    expect(await g.runToEnd(), '처음 코드는 A=0이라 앞으로 가지 않고 벽에 부딪힘').toMatch(/부딪/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await g.select('2'); await g.press(g.action(/앞으로 옮기기$/))
    await expect(g.tile('1'), 'set이 맨 앞').toHaveAccessibleName(/상자 A에 3 넣기/)
    await g.press(g.button('한 단계'))
    await expect(page.getByRole('status').filter({ hasText: /상자 A(: |의 값이 바뀌었어요: )(0 → )?3/ }).first(), '상자 값 3').toBeVisible()
    await g.press(g.button('처음으로'))
    expect(await g.runToEnd()).toContain('5단원 완주')
  })

  test('@layout 5단원 화면(상자 표시 포함): 맵 120px 이상, 맵·팔레트·실행 버튼 화면 안, 가로 스크롤 없음, 44px', async ({ page }, info) => {
    const g = await open(page, '점점 길어지는 길', ['u5-1'])
    await g.add('N'); await g.select('1'); await into(g); await g.add('N'); await out(g)
    await g.select('1.1'); await g.press(g.action(/횟수를 A로$/)); await into(g); await g.add('F'); await out(g)
    await g.select('1'); await into(g); await g.add('L'); await g.press(palette(page, '상자 A의 값을 1만큼 바꾸기')); await out(g)
    await page.screenshot({ path: `e2e-results/screens/${info.project.name}-unit5-u52.png` })
    await g.noHorizontalScroll()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect((await g.board.boundingBox())!.height, '맵 높이 120px 이상').toBeGreaterThanOrEqual(120)
    for (const [name, l] of [['맵', g.board], ['팔레트', page.locator('.palette')], ['실행 버튼', g.runButton]] as const)
      expect(await g.inView(l), `${name} 화면 안`).toBe(true)
    const small = await page.locator('button:visible').evaluateAll(es => es.map(e => [e.getAttribute('aria-label') ?? e.textContent?.trim(), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)] as const).filter(([, w, h]) => w < 44 || h < 44))
    expect(small, '44px 미만 버튼').toEqual([])
  })

  for (const world of ['크레용 스케치북', '기차 마을', '나의 게임기']) {
    test(`${world}: set·change 팔레트 버튼과 타일이 바탕과 구분된다(대비 3:1 이상)`, async ({ page }) => {
      const g = await open(page, '점점 길어지는 길', ['u5-1', 'u5-2'])
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      await g.press(palette(page, '상자 A에 값 넣기')); await g.press(palette(page, '상자 A의 값을 1만큼 바꾸기'))
      for (const l of [palette(page, '상자 A에 값 넣기'), palette(page, '상자 A의 값을 1만큼 바꾸기'), g.tile('1'), g.tile('2')]) {
        const ratio = await contrastOf(l)
        if (ratio !== null) expect(ratio, `${await l.getAttribute('aria-label')} 대비`).toBeGreaterThanOrEqual(3)
      }
    })
  }

  test('T50: set 값 늘리기·change 부호 바꾸기·되돌리기가 타일에 그대로 보인다', async ({ page }) => {
    const g = await open(page, '상자에 든 수만큼')
    await g.press(palette(page, '상자 A에 값 넣기'))
    await g.select('1'); await g.press(g.action(/값 늘리기$/)); await g.press(g.action(/값 늘리기$/))
    await expect(g.tile('1')).toHaveAccessibleName(/상자 A에 2 넣기/)
    await g.press(g.button('되돌리기'))
    await expect(g.tile('1')).toHaveAccessibleName(/상자 A에 1 넣기/)
    await g.press(palette(page, '상자 A의 값을 1만큼 바꾸기'))
    await expect(g.tile('2')).toHaveAccessibleName(/상자 A에 1 더하기/)
    await g.select('2'); await g.press(g.action(/\+1\/−1 바꾸기$/))
    await expect(g.tile('2')).toHaveAccessibleName(/상자 A에서 1 빼기/)
  })

  test('T50: 상자 A가 0보다 작아지면 어느 맵에서 왜 멈췄는지 알려 주고 고치기는 원인 블록', async ({ page }) => {
    const g = await open(page, '상자에 든 수만큼')
    // 1번 맵 A=2에서 1을 세 번 빼면 -1
    for (let i = 0; i < 3; i++) { await g.press(palette(page, '상자 A의 값을 1만큼 바꾸기')); await g.select(String(i + 1)); await g.press(g.action(/\+1\/−1 바꾸기$/)) }
    expect(await g.runToEnd()).toMatch(/1번 맵에서 .*0보다 작거나/)
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(g.tile('3'), '세 번째 빼기가 원인').toHaveAttribute('aria-pressed', 'true')
  })

  test('@layout T50: 좁은 화면에서도 값이 바뀌는 순간(전 → 후)이 보이고 목표 문장이 잘리지 않는다', async ({ page }) => {
    const g = await open(page, '값을 넣는 순서', ['u5-1', 'u5-2'])
    await g.select('2'); await g.press(g.action(/앞으로 옮기기$/))
    await g.press(g.button('한 단계'))
    await expect(page.getByText(/0\s*→\s*3/).filter({ visible: true }).first(), '0 → 3 표시').toBeVisible()
    const goal = page.locator('.stage-goal')
    const clipped = await goal.evaluate(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
    expect(clipped, '목표 문장 잘림 없음').toBe(false)
  })

  test('@layout T50: 영어 5단원 화면 — 한국어 없음, 맵 120px 이상, 가로 스크롤 없음', async ({ page }) => {
    await page.goto('/?lang=en')
    await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), before)
    await page.reload()
    const g = new Game(page)
    await g.press(page.getByRole('button', { name: 'Stages', exact: true }))
    await g.press(page.locator('.stage-card', { hasText: 'As Many as the Box Says' }))
    await g.noHorizontalScroll()
    expect((await g.board.boundingBox())!.height).toBeGreaterThanOrEqual(120)
    const korean = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /[\uAC00-\uD7A3]/.test(e.textContent ?? '') && (e as HTMLElement).offsetParent !== null && !e.closest('[lang=ko]')).map(e => e.textContent?.slice(0, 20)))
    expect(korean, '한국어 없음').toEqual([])
  })
})
