import type { Page } from '@playwright/test'
import { expect, fontsReady, Game, test } from './helpers'

/** T24 접근성 점검. 인증이 아니라 진행을 막는 결함을 찾는 자동 검사(항목별 결과는 WORK_HISTORY에 기록) */

const worldSwitch = { sketchbook: '크레용 스케치북 월드로 바꾸기', train: '기차 마을 월드로 바꾸기', handheld: '나의 게임기 월드로 바꾸기' } as const

async function openWorld(page: Page, world: keyof typeof worldSwitch) {
  const g = new Game(page)
  await g.fresh()
  await page.evaluate(() => localStorage.setItem('lealnspire.progress', JSON.stringify({ version: 1, stages: { 1: { completed: true, bestStars: 3, lastProgram: [] } } })))
  await page.reload()
  await g.press(g.button('스테이지 목록'))
  await g.press(page.locator('.stage-card').first())
  await g.press(page.getByRole('button', { name: worldSwitch[world] }))
  return g
}

/** 보이는 글자의 대비. 배경 이미지·그라데이션 위 글자는 계산할 수 없어 건너뛰고 개수만 보고 */
async function lowContrast(page: Page) {
  await fontsReady(page)
  return page.evaluate(() => {
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 } }
    const lum = ({ r, g, b }: { r: number, g: number, b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const bad: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!; const text = n.textContent?.trim()
      if (!text || el.closest('[aria-hidden="true"]')) continue
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue
      let bg = null as null | ReturnType<typeof parse>, skip = false
      for (let a: HTMLElement | null = el; a; a = a.parentElement) {
        const s = getComputedStyle(a)
        if (s.backgroundImage !== 'none') { skip = true; break }
        const c = parse(s.backgroundColor); if (c.a > 0.9) { bg = c; break }
      }
      if (skip || !bg) continue
      // 비활성 버튼 글자는 WCAG 예외
      if (el.closest('button:disabled')) continue
      const fg = parse(cs.color); const L1 = lum(fg), L2 = lum(bg)
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5
      if (ratio < need) bad.push(`${text.slice(0, 20)} ${ratio.toFixed(2)}:1 (<${need})`)
    }
    return [...new Set(bad)]
  })
}

test.describe('@a11y 접근성', () => {
  for (const world of Object.keys(worldSwitch) as (keyof typeof worldSwitch)[]) {
    test(`${world}: 글자 대비 4.5:1(큰 글자 3:1) 이상, 모든 버튼에 이름`, async ({ page }) => {
      const g = await openWorld(page, world)
      await g.build('F 2[L]')
      expect(await lowContrast(page), '대비 부족 글자').toEqual([])
      const unnamed = await page.locator('button:visible').evaluateAll(es => es.filter(e => !(e.getAttribute('aria-label') || e.textContent?.trim())).map(e => e.outerHTML.slice(0, 80)))
      expect(unnamed, '이름 없는 버튼').toEqual([])
    })
  }

  test('홈·목록·결과 창·힌트·기록 안내의 글자 대비', async ({ page }) => {
    const g = new Game(page)
    await g.fresh()
    const issues: string[] = []
    issues.push(...(await lowContrast(page)).map(s => `홈 ${s}`))
    await g.press(g.button('내 기록 안내')); issues.push(...(await lowContrast(page)).map(s => `기록 안내 ${s}`)); await page.keyboard.press('Escape')
    await g.press(g.button('스테이지 목록')); issues.push(...(await lowContrast(page)).map(s => `목록 ${s}`))
    await g.press(page.locator('.stage-card').first())
    await g.press(g.button('힌트')); issues.push(...(await lowContrast(page)).map(s => `힌트 ${s}`))
    await g.build('F'); await g.speed('빠르게'); await g.runToEnd(); issues.push(...(await lowContrast(page)).map(s => `결과 창 ${s}`))
    expect(issues).toEqual([])
  })

  test('맵의 대체 설명에 로봇의 위치와 방향이 있고, 움직이면 바뀐다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    const before = await g.board.getAttribute('aria-label')
    expect(before, '방향').toMatch(/동|서|남|북|오른쪽|왼쪽|위|아래/)
    expect(before, '위치(줄·칸)').toMatch(/\d+\s*번째 줄|\d+\s*줄|\d+\s*칸/)
    await g.build('F'); await g.press(g.button('한 단계'))
    await expect.poll(() => g.board.getAttribute('aria-label'), '움직이면 설명이 바뀜').not.toBe(before)
  })

  test('동작 줄이기 설정이면 재생 중 애니메이션이 돌지 않는다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const g = await openWorld(page, 'sketchbook')
    await g.build('F L R L R F')
    await g.speed('느리게'); await g.press(g.runButton)
    await page.waitForTimeout(1200)
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => (a as CSSAnimation).animationName ?? 'transition'))
    expect(running).toEqual([])
  })

  for (const world of Object.keys(worldSwitch) as (keyof typeof worldSwitch)[]) {
    test(`키보드(Tab·Shift+Tab·Enter)만으로 ${world}: 반복 편집 → 실패 → 고치기 → 힌트 → 성공, 도착할 때마다 포커스가 보인다`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', '데스크톱 전용(물리 키보드)')
      const g = await openWorld(page, world)
      await page.locator('body').click({ position: { x: 1, y: 1 } })
      const focusVisible = () => page.evaluate(() => { const e = document.activeElement as HTMLElement | null; if (!e || e === document.body) return false; const s = getComputedStyle(e); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none' })
      /** .focus() 없이 Tab(필요하면 Shift+Tab)만 눌러 대상에 도착한 뒤 Enter. 도달할 수 없으면 실패 */
      const reach = async (target: ReturnType<Game['button']>, name: string) => {
        for (const key of ['Tab', 'Shift+Tab']) {
          for (let i = 0; i < 60; i++) {
            if (await target.evaluate(e => e === document.activeElement).catch(() => false)) {
              expect(await focusVisible(), `${name}: 포커스 표시`).toBe(true)
              await page.keyboard.press('Enter'); return
            }
            await page.keyboard.press(key)
          }
        }
        throw new Error(`${name}: Tab으로 도달할 수 없음`)
      }
      await reach(g.palette('N'), 'N번 반복')
      await reach(g.tile('1'), '1번 반복 타일')
      await reach(g.action(/줄이기$/), '줄이기')
      await reach(g.action(/추가 대상으로 선택$|안에 넣기$/), '안에 넣기')
      await reach(g.palette('L'), '왼쪽')
      await reach(g.action(/선택 해제$|넣기 해제$/), '넣기 해제')
      await reach(g.button('빠르게'), '빠르게')
      await reach(g.runButton, '실행')
      await expect(g.dialog).toBeVisible({ timeout: 10_000 })
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), '결과 창으로 포커스 이동').toBe(true)
      // 결과 창 안에서 Tab이 밖으로 새지 않음(포커스 가두기)
      for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), '창 안에서 순환').toBe(true) }
      await reach(g.dialog.getByRole('button', { name: '고치기' }), '고치기')
      await expect(g.dialog).toHaveCount(0)
      expect(await focusVisible(), '창을 닫은 뒤에도 포커스가 보이는 곳에 있음').toBe(true)
      await reach(g.button('힌트'), '힌트')
      await expect(page.locator('#stage-hint')).toBeVisible()
      await reach(g.tile('1'), '1번 반복 타일(다시)')
      await reach(g.action(/삭제$/), '삭제')
      await reach(g.palette('F'), '앞으로'); await page.keyboard.press('Enter')
      await reach(g.runButton, '실행(다시)')
      await expect(g.dialog).toContainText(/성공|별/, { timeout: 10_000 })
    })
  }
})
