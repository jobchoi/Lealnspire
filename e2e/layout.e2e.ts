import type { Page } from '@playwright/test'
import { expect, fontsReady, Game, test } from './helpers'

/** 화면 배치 점검: 스크린샷은 e2e-results/screens/에 저장해 사람이(또는 Claude가) 직접 봅니다. */
const worldSwitch = { sketchbook: '크레용 스케치북 월드로 바꾸기', train: '기차 마을 월드로 바꾸기', handheld: '나의 게임기 월드로 바꾸기' } as const
type World = keyof typeof worldSwitch

/**
 * stage 앞 스테이지까지 깬 상태로 그 스테이지를 엽니다. world를 주면 월드 전환 버튼으로 바꿉니다
 * (완료한 스테이지만 다른 월드로 다시 풀 수 있으므로 그때는 stage 자신도 완료로 둡니다).
 */
async function startIn(page: Page, stage: number, world?: World) {
  const g = new Game(page)
  await g.fresh()
  const done = world ? stage : stage - 1
  await page.evaluate(n => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { completed: true, bestStars: 3, lastProgram: [] }])) })), done)
  await page.reload()
  const card = page.locator('.stage-card').nth(stage - 1)
  // 새로고침 직후 첫 누름이 앱 준비 전에 들어가 무시되는 경우가 있어(간헐 실패 2회), 목록이 보일 때까지 다시 누른다
  await expect(async () => {
    if (!(await card.isVisible())) await g.press(g.button('스테이지 목록'))
    await expect(card).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
  await expect(card).toBeEnabled()
  await g.press(card)
  if (world) await g.press(page.getByRole('button', { name: worldSwitch[world] }))
  return g
}

/** 배치 점검 대상: 세 월드를 같은 스테이지(1)에서 바꿔 본 경우 + 각 월드 본래 스테이지(맵 비율·문구·블록 상한이 다름) */
const layoutCases: { name: string, stage: number, world: World, switchTo?: World, programs: string[], blocks: number }[] = [
  ...(Object.keys(worldSwitch) as World[]).map(world => ({ name: `${world} 월드(1번에서 전환)`, stage: 1, world, switchTo: world, programs: ['F L F', '3[F F R]', '2[L F]'], blocks: 10 })),
  { name: 'train 본래 스테이지 4(초기 블록 3개)', stage: 4, world: 'train', programs: ['3[F F R]', '2[L F]'], blocks: 10 },
  { name: 'handheld 본래 스테이지 8(상한 7)', stage: 8, world: 'handheld', programs: ['2[F L F R] F L'], blocks: 7 },
]

for (const c of layoutCases) test.describe(`@layout ${c.name}`, () => {
  test('블록을 상한까지(반복 포함) 채워도 맵·팔레트·실행 버튼이 스크롤 없이 보이고, 겹치거나 잘리지 않는다', async ({ page }, info) => {
    const g = await startIn(page, c.stage, c.switchTo)
    await expect(page.locator(`.theme-${c.world}`)).toBeVisible()
    for (const program of c.programs) await g.build(program)
    expect(await g.blockCount()).toBe(c.blocks)
    await fontsReady(page)
    await page.screenshot({ path: `e2e-results/screens/${info.project.name}-${c.world}-s${c.stage}-full.png` })

    expect(await page.evaluate(() => window.scrollY), '페이지 스크롤 없음').toBe(0)
    await g.noHorizontalScroll()
    for (const [name, l] of [['맵', g.board], ['팔레트', page.locator('.palette')], ['실행 버튼', g.runButton]] as const)
      expect(await g.inView(l), `${name} 화면 안`).toBe(true)

    // 작업 공간이 실제로 보이는 크기: 사용자가 만든 블록을 볼 수 있어야 함
    const vp = page.viewportSize()!
    const tileSize = (await g.tile('1').boundingBox())!.height
    const [sh, ch] = await g.workspace.evaluate(e => [e.scrollHeight, e.clientHeight])
    if (vp.height >= 640) {
      // 데스크톱·일반 폰(375x667): 블록이 작업 공간 스크롤 없이 모두 보임
      expect(sh, `작업 공간 스크롤 없이 ${c.blocks}개 모두 보임`).toBeLessThanOrEqual(ch + 1)
    } else {
      // 작은 폰(360x560): 최소 블록 두 줄은 보임(나머지는 작업 공간 안에서만 스크롤)
      expect(ch, `작업 공간 높이 ${ch}px ≥ 블록 두 줄(${Math.round(tileSize * 2)}px)`).toBeGreaterThanOrEqual(tileSize * 2)
    }
    // 작업 공간에 보이는 타일이 다른 영역(실행 컨트롤 등)에 가려지지 않음
    const ws = (await g.workspace.boundingBox())!
    const controls = (await page.locator('.playback-controls').last().boundingBox())!
    const sameColumn = ws.x < controls.x + controls.width && controls.x < ws.x + ws.width
    if (sameColumn && controls.y > ws.y) expect(ws.y + ws.height, '작업 공간이 실행 컨트롤 위에서 끝남').toBeLessThanOrEqual(controls.y + 1)

    // 주요 영역끼리 겹치지 않음
    const boxes = await Promise.all([g.board, page.locator('.palette'), g.workspace, page.locator('.playback-controls').last()].map(l => l.boundingBox()))
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!
      const overlap = a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1
      expect(overlap, `영역 ${i}와 ${j} 겹침 없음`).toBe(false)
    }
  })

})

for (const world of Object.keys(worldSwitch) as World[]) test.describe(`@layout ${world} 월드 버튼`, () => {
  test('누를 수 있는 모든 버튼은 최소 44×44px이고, 버튼 글자가 잘리지 않는다', async ({ page }) => {
    const g = await startIn(page, 1, world)
    await g.build('F 2[L]')
    await g.select('2')
    await fontsReady(page)
    const bad = await page.locator('button:visible').evaluateAll(es => es.flatMap(e => {
      const r = e.getBoundingClientRect(); const label = e.getAttribute('aria-label') ?? e.textContent?.trim() ?? ''
      const issues: string[] = []
      if (r.width < 44 || r.height < 44) issues.push(`${label}: ${Math.round(r.width)}x${Math.round(r.height)}`)
      // 버튼 안 모든 글자(라벨, 순서 번호, 반복 횟수)의 실제 위치가 버튼 안에 있음.
      // 반복 범위 띠·바퀴 같은 그림 장식이 밖으로 나오는 것은 글자 잘림이 아니므로 글자만 잰다.
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue
        const range = document.createRange(); range.selectNodeContents(n)
        // 비교할 경계: 버튼 + 버튼 안에서 overflow로 내용을 자르는 조상(예: 좁은 라벨에 overflow:hidden)
        const clips: DOMRect[] = [r]
        for (let el = n.parentElement; el && el !== e; el = el.parentElement) {
          const cs = getComputedStyle(el)
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') clips.push(el.getBoundingClientRect())
        }
        const out = [...range.getClientRects()].some(t => t.width && clips.some(b => t.top < b.top - 1 || t.bottom > b.bottom + 1 || t.left < b.left - 1 || t.right > b.right + 1))
        if (out) issues.push(`${label}: 글자 잘림(${n.textContent.trim()})`)
      }
      // 짧은 버튼 글자(예: 해 보기!)가 한 글자씩 세로로 쪼개지지 않음
      for (const small of e.querySelectorAll('small')) {
        const lh = parseFloat(getComputedStyle(small).lineHeight) || parseFloat(getComputedStyle(small).fontSize) * 1.3
        if ((small.textContent ?? '').trim().length <= 6 && small.getBoundingClientRect().height > lh * 1.6) issues.push(`${label}: 글자 줄바꿈`)
      }
      return issues
    }))
    expect(bad, '작은 버튼·잘린 글자').toEqual([])
  })

})

test.describe('@layout 공통', () => {
  test('블록 타일은 정사각형이고 옆으로 이어진다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F F F')
    const [a, b] = await Promise.all([g.tile('1').boundingBox(), g.tile('2').boundingBox()])
    expect(Math.abs(a!.width - a!.height), '정사각형').toBeLessThanOrEqual(2)
    expect(b!.x, '두 번째 블록이 오른쪽에').toBeGreaterThan(a!.x + a!.width - 1)
    expect(Math.abs(b!.y - a!.y), '같은 줄').toBeLessThanOrEqual(2)
  })

  test('실행 중 현재 블록 강조가 화면 안에 보인다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F L R L R L R F')
    await g.speed('느리게')
    await g.press(g.runButton)
    await page.waitForTimeout(2600)
    const active = page.locator('.block-active, [aria-current="step"]').first()
    await expect(active).toBeVisible()
    expect(await g.inView(active)).toBe(true)
  })
})

/** T64 2차: 빈 작업 공간 안내문이 글자 단위로 쪼개지지 않는다(세 월드 × 좁은 화면) */
for (const world of ['크레용 스케치북', '기차 마을']) {
  for (const viewport of [{ width: 375, height: 667 }, { width: 360, height: 560 }, { width: 1280, height: 720 }]) {
    test(`@layout ${world} ${viewport.width}: 빈 작업 공간 안내가 쪼개지지 않음`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const g = new Game(page)
      await g.fresh()
      await page.evaluate(() => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: { '1': { completed: true, bestStars: 3 } } })))
      await page.reload()
      await g.press(g.button('스테이지 목록'))
      await g.press(page.locator('.stage-card').first())
      await g.press(page.getByRole('button', { name: `${world} 월드로 바꾸기` }))
      const hint = page.locator('.workspace > p').first()
      await expect(hint).toBeVisible()
      // 글자 줄 상자의 서로 다른 위쪽 좌표 개수 = 실제 줄 수
      const lines = await hint.evaluate(e => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].map(b => Math.round(b.top))).size })
      expect(lines, '안내문 줄 수(2줄 이하)').toBeLessThanOrEqual(2)
    })
  }
}

/** T64 2차: 스케치북 데스크톱 — 팔레트 원 버튼이 블록 수 표시·안내 문장과 겹치지 않는다(단원마다 팔레트 개수가 다름) */
import { allStages } from '../src/model/stages'
test('@layout 스케치북 1280: 모든 단원 첫 스테이지에서 팔레트가 블록 수 표시와 겹치지 않음', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1280, height: 720 })
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(ids => localStorage.setItem('lealnspire.progress.v2', JSON.stringify({ version: 2, stages: Object.fromEntries(ids.map(id => [id, { completed: true, bestStars: 3 }])) })), allStages.map(s => s.id))
  const firsts = ['1', 'u2-1', 'u3-1', 'u4-1', 'u5-1', 'u6-1', 'u7-1', 'u8-1', 'u9-1', 'u10-1', 'u11-1', 'u12-1', 'u12-2', 'u12-3']
  const problems: string[] = []
  for (const id of firsts) {
    await page.goto('/')
    await g.press(g.button('스테이지 목록'))
    await g.press(page.locator('.stage-card').nth(allStages.findIndex(s => s.id === id)))
    const sketch = page.getByRole('button', { name: '크레용 스케치북 월드로 바꾸기' })
    if (await sketch.count()) await g.press(sketch)
    const texts = await page.locator('.block-budget p').all()
    for (const button of await page.locator('.palette button').all()) {
      const a = (await button.boundingBox())!
      for (const text of texts) {
        if (!(await text.isVisible())) continue
        const b = (await text.boundingBox())!
        if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2) problems.push(`${id}: ${await button.getAttribute('aria-label')}`)
      }
    }
  }
  expect(problems, '팔레트가 블록 수 표시와 겹치는 스테이지').toEqual([])
})
