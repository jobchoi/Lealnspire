import type { Page } from '@playwright/test'
import { expect, Game, test } from './helpers'

/** T38: 2단원 조건 if. 같은 코드로 두 맵을 모두 지나가야 성공(docs/design/unit2-conditions.md 7절) */
const unit1Done = JSON.stringify({ version: 1, stages: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8'].map(id => [id, { completed: true, bestStars: 3, lastProgram: [] }])) })

async function openU21(page: Page) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(v => localStorage.setItem('lealnspire.progress', v), unit1Done)
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  const card = page.locator('.stage-card', { hasText: '막히면 돌아요' })
  await expect(card, '1단원 정규 8개를 끝내면 2단원이 열림(보너스 불필요)').toBeEnabled()
  await g.press(card)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('막히면 돌아요')
  return g
}
const ifBlock = (page: Page) => page.locator('.palette').getByRole('button', { name: '앞이 막혔으면', exact: true })
const into = (g: Game) => g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
const out = (g: Game) => g.press(g.action(/선택 해제$|넣기 해제$/))

/** repeat N [ if 앞 막힘 [ 돌기 ], 앞으로 ] 를 사용자처럼 조립(기본: 4번, 오른쪽) */
async function buildSolution(g: Game, page: Page, count = 4, turn: 'L' | 'R' = 'R') {
  await g.add('N'); await g.select('1')
  for (let c = 3; c < count; c++) await g.press(g.action(/늘리기$/))
  await into(g)
  await g.press(ifBlock(page))
  await g.select('1.1'); await into(g); await g.add(turn); await out(g)
  await g.select('1'); await into(g); await g.add('F'); await out(g)
}

test.describe('2단원 조건 if', () => {
  test('if 없이 한 맵만 맞춘 코드 → 2번 맵에서 실패 → 고치기는 2번 맵으로 → if로 두 맵 모두 성공 → 새로고침 후 코드 복원', async ({ page }) => {
    const g = await openU21(page)
    const cards = page.getByRole('group', { name: '2단원: 조건 (if)' }).getByRole('button')
    await expect(cards, '실행 전에도 두 맵을 미리 볼 수 있음').toHaveCount(2)
    await g.build('F F R F F')
    await g.speed('빠르게')
    const result = await g.runToEnd()
    expect(result, '어느 맵에서 왜 실패했는지').toMatch(/2번 맵에서 .*부딪/)
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(cards.nth(1), '실패한 2번 맵으로 전환').toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.workspace .failure-badge')).toHaveCount(1)

    await g.clear()
    await buildSolution(g, page)
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toMatch(/성공/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    await page.reload()
    await g.press(g.button('스테이지 목록'))
    await g.press(page.locator('.stage-card', { hasText: '막히면 돌아요' }))
    expect(await g.blockCount(), 'if가 든 코드도 v2로 저장·복원').toBe(4)
    expect(await page.evaluate(v => localStorage.getItem('lealnspire.progress') === v, unit1Done), '1단원 v1 원본 불변').toBe(true)
  })

  test('한 단계 실행: 검사할 때 센서 결과가 보이고, 거짓이면 if 안쪽을 건너뛴다', async ({ page }) => {
    const g = await openU21(page)
    await buildSolution(g, page)
    const status = page.locator('[role=status]').filter({ hasText: /앞이 (막혔어요|열려 있어요)/ })
    // 1번 맵: 처음 검사는 열려 있음(거짓) → 건너뜀
    for (let i = 0; i < 4 && !(await status.count()); i++) await g.press(g.button('한 단계'))
    await expect(status).toContainText('앞이 열려 있어요')
    await expect(page.getByText('건너뜀').first(), '거짓이면 건너뜀 표시').toBeVisible()
    expect(await g.board.getAttribute('aria-label'), '맵 설명에도 센서 결과').toMatch(/열려|막혔/)
    // 계속 진행하면 언젠가 참(막힘) 검사가 나온다
    let blocked = false
    for (let i = 0; i < 20 && !blocked; i++) {
      if (await g.dialog.count()) break
      await g.press(g.button('한 단계'))
      blocked = (await status.count()) > 0 && (await status.innerText()).includes('막혔어요')
    }
    expect(blocked, '막힘(참) 검사도 보임').toBe(true)
  })

  test('@layout 2단원 화면(맵 카드·if 포함)도 가로 스크롤 없이 맵·팔레트·실행 버튼이 보이고 겹치지 않으며 버튼은 44px 이상', async ({ page }, info) => {
    const g = await openU21(page)
    await buildSolution(g, page)
    await page.screenshot({ path: `e2e-results/screens/${info.project.name}-unit2-u21.png` })
    await g.noHorizontalScroll()
    expect(await page.evaluate(() => window.scrollY), '페이지 세로 스크롤 없음').toBe(0)
    for (const [name, l] of [['맵', g.board], ['팔레트', page.locator('.palette')], ['if 블록', ifBlock(page)], ['실행 버튼', g.runButton]] as const)
      expect(await g.inView(l), `${name} 화면 안`).toBe(true)
    const boxes = await Promise.all([g.board, page.locator('.palette'), g.workspace, page.locator('.playback-controls').last()].map(l => l.boundingBox()))
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!
      expect(a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1, `영역 ${i}와 ${j} 겹침 없음`).toBe(false)
    }
    const small = await page.locator('button:visible').evaluateAll(es => es.map(e => [e.getAttribute('aria-label') ?? e.textContent?.trim(), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)] as const).filter(([, w, h]) => w < 44 || h < 44))
    expect(small, '44px 미만 버튼').toEqual([])
  })

  test('1단원 화면에는 if 블록이 나오지 않는다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await expect(ifBlock(page)).toHaveCount(0)
  })

  test('T39: 2단원을 처음부터 끝까지 — u2-1~u2-4를 풀고(u2-4는 미리 놓인 코드가 1번 맵에서 실패) "2단원 완주"', async ({ page }) => {
    test.setTimeout(120_000)
    const g = await openU21(page)
    await g.speed('빠르게')
    const solve = async (title: string, count: number, turn: 'L' | 'R') => {
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
      await g.clear(); await buildSolution(g, page, count, turn)
      return g.runToEnd()
    }
    await solve('막히면 돌아요', 4, 'R'); await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
    await solve('왼쪽일 수도 있어요', 4, 'L'); await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
    await solve('두 번 꺾는 길', 5, 'R'); await g.press(g.dialog.getByRole('button', { name: '다음 스테이지' }))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('if는 계속 지켜보지 않아요')
    expect(await g.blockCount(), '미리 놓인 코드: if·오른쪽·repeat·앞으로').toBe(4)
    expect(await g.runToEnd(), '처음 한 번만 검사해서 1번 맵에서 부딪힘').toMatch(/1번 맵에서 .*부딪/)
    await g.press(g.dialog.getByRole('button', { name: '닫기' }))
    // 전체를 지우지 않고 고치기: 바깥 if 삭제 → 반복 안 맨 앞에 if 다시 놓기 → if 안에 오른쪽 돌기
    await g.remove('1')
    expect(await g.blockCount(), 'repeat 4 [앞으로]만 남음').toBe(2)
    await g.select('1'); await into(g); await g.press(ifBlock(page)); await out(g)
    // 새 if는 몸체 끝(1.2)에 붙으므로 앞으로 옮긴다
    await g.select('1.2'); await g.press(g.action(/앞으로 옮기기$/))
    await g.select('1.1'); await into(g); await g.add('R'); await out(g)
    expect(await g.blockCount()).toBe(4)
    expect(await g.runToEnd()).toContain('2단원 완주')
  })

  test('T39: 조건 예측 도전 — u2-1을 깬 뒤 "if는 한 번만 검사한다"를 예측, 정답은 하나', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(v => {
      const s = JSON.parse(v); s.stages['u2-1'] = { completed: true, bestStars: 3, lastProgram: [] }
      localStorage.setItem('lealnspire.progress', JSON.stringify(s))
    }, unit1Done)
    await page.reload()
    await g.press(g.button('스테이지 목록'))
    const entry = page.locator('.stage-card', { hasText: '막히면 돌아요' }).locator('xpath=..').getByRole('button', { name: '예측 도전' })
    await g.press(entry.or(page.getByRole('button', { name: '예측 도전' }).last()).first())
    const choices = page.getByRole('button', { name: /^후보 [ABC]: / })
    await expect(choices).toHaveCount(3)
    const marks: string[] = []
    for (let i = 0; i < 3; i++) {
      await g.press(choices.nth(i))
      const feedback = page.locator('.prediction-feedback')
      await expect(feedback).toContainText(/예상과 (같아요|달라요)/, { timeout: 20_000 })
      await expect(feedback, '검사 결과도 설명').toContainText(/검사|열려|막혀/)
      marks.push((await feedback.innerText()).includes('같아요') ? 'O' : 'X')
      if (i < 2) await g.press(g.button('다시 고르기'))
    }
    expect(marks.filter(m => m === 'O'), marks.join('')).toHaveLength(1)
  })

  test('T40: 실패 표시는 실패한 맵에만 — U2-4 처음 코드는 1번 맵 실패·2번 맵 성공, 2번 맵을 볼 때 실패 칸이 없다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    await page.evaluate(v => {
      const s = JSON.parse(v); for (const id of ['u2-1', 'u2-2', 'u2-3']) s.stages[id] = { completed: true, bestStars: 3, lastProgram: [] }
      localStorage.setItem('lealnspire.progress', JSON.stringify(s))
    }, unit1Done)
    await page.reload()
    await g.press(g.button('스테이지 목록'))
    await g.press(page.locator('.stage-card', { hasText: 'if는 계속 지켜보지 않아요' }))
    await g.speed('빠르게')
    expect(await g.runToEnd()).toMatch(/1번 맵에서/)
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    const cards = page.getByRole('group', { name: '2단원: 조건 (if)' }).getByRole('button')
    await expect(cards.nth(0), '고치기는 실패한 1번 맵').toHaveAttribute('aria-pressed', 'true')
    await expect(g.board.getByRole('img', { name: '실패 지점' })).toHaveCount(1)
    await g.press(cards.nth(1))
    await expect(g.board.getByRole('img', { name: '실패 지점' }), '성공한 2번 맵에는 실패 칸 없음').toHaveCount(0)
    await g.press(cards.nth(0))
    await expect(g.board.getByRole('img', { name: '실패 지점' }), '1번 맵으로 돌아오면 다시 보임').toHaveCount(1)
  })
})
