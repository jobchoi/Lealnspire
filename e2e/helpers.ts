import { expect, test as base, type Locator, type Page } from '@playwright/test'

/** 화면 동작을 사용자 관점의 행동으로 묶은 도우미. 레이아웃이 바뀌면 이 파일만 고칩니다. */

export type Cmd = 'F' | 'L' | 'R'
const names: Record<Cmd | 'N', string> = { F: '앞으로', L: '왼쪽으로 돌기', R: '오른쪽으로 돌기', N: 'N번 반복' }

/** 모든 테스트: 콘솔 오류·페이지 예외가 하나라도 있으면 실패 */
export const test = base.extend<{ errors: string[] }>({
  errors: [async ({ page }, use) => {
    // T84: 앱은 진행 v3·이력 v1만 쓰고 v2에는 쓰지 않는다(옛 원본 보존). 테스트가 v2 키에 진행을 심으면
    // "옛 버전 사용자"로 다시 이행되도록 v3·이력을 지운다 — 기존 테스트의 v2 시드 의미를 그대로 유지
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'lealnspire.progress.v2') { this.removeItem('lealnspire.progress.v3'); this.removeItem('lealnspire.history.v1') }
        return original.call(this, key, value)
      }
    })
    const errors: string[] = []
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
    await use(errors)
    expect(errors, '콘솔 오류 없음').toEqual([])
  }, { auto: true }],
})
export { expect }

/** 웹 글꼴(@fontsource)이 다 로드된 뒤에 글자 폭·배치를 잰다. 로드 전후로 폭이 달라 배치 검사가 간헐적으로 실패했음(2026-11-25) */
export async function fontsReady(page: Page) { await page.evaluate(async () => { await document.fonts.ready }) }

export class Game {
  readonly page: Page
  constructor(page: Page) { this.page = page }
  private touch?: boolean
  /** 터치 기기면 tap, 아니면 click (실제 사용자 입력 방식) */
  async press(l: Locator) {
    this.touch ??= await this.page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    // 글꼴이 바뀌며 배치가 움직이는 도중에 누르면 tap이 '안정될 때까지' 기다리다 시간 초과되는 경우가 있었음
    await fontsReady(this.page)
    if (this.touch) await l.tap(); else await l.click()
  }
  button(name: string) { return this.page.getByRole('button', { name, exact: true }) }
  palette(c: Cmd | 'N') { return this.page.locator('.palette').getByRole('button', { name: names[c], exact: true }) }
  get workspace() { return this.page.locator('.workspace') }
  get dialog() { return this.page.getByRole('dialog') }
  get board() { return this.page.locator('.board') }
  get runButton() { return this.button('실행') }

  async fresh() { await this.page.goto('/'); await this.page.evaluate(() => localStorage.clear()); await this.page.reload() }
  async start() { await this.press(this.button('시작하기')) }
  async speed(s: '느리게' | '보통' | '빠르게') { await this.press(this.button(s)) }
  async add(c: Cmd | 'N') { await this.press(this.palette(c)) }
  async blockCount() { return Number((await this.page.locator('.editor').innerText()).match(/블록 (\d+)/)?.[1] ?? NaN) }

  /** 작업 공간의 블록 타일(aria-label이 "<번호>번 ..."으로 시작) */
  tile(order: string) { return this.workspace.getByRole('button', { name: new RegExp(`^${order.replace(/\./g, '\\.')}번 `) }).first() }
  /** 이미 선택돼 있으면 다시 누르지 않음(다시 누르면 선택 해제되는 동작) */
  async select(order: string) {
    const t = this.tile(order)
    if ((await t.getAttribute('aria-pressed')) !== 'true') await this.press(t)
  }
  /** 작업 막대 버튼(선택한 블록에 대해) */
  action(label: RegExp) { return this.page.getByRole('button', { name: label }).first() }
  async remove(order: string) { await this.select(order); await this.press(this.action(/삭제$/)) }

  async clear() {
    for (let i = 0; i < 40 && (await this.blockCount()) > 0; i++) await this.remove('1')
    expect(await this.blockCount()).toBe(0)
  }

  /** "F F R", "3[F L]" 같은 표기로 프로그램을 사용자처럼 조립 */
  async build(src: string) {
    for (const tok of src.match(/\d+\[[^\]]+\]|[FLR]/g) ?? []) {
      if (!tok.includes('[')) { await this.add(tok as Cmd); continue }
      const [, n, body] = tok.match(/(\d+)\[([^\]]+)\]/)!
      await this.add('N')
      const order = await this.lastTopOrder()
      await this.select(order)
      for (let c = 3; c < +n; c++) await this.press(this.action(/늘리기$/))
      for (let c = 3; c > +n; c--) await this.press(this.action(/줄이기$/))
      await this.press(this.action(/추가 대상으로 선택$|안에 넣기$/))
      for (const c of body.split(' ')) await this.add(c as Cmd)
      await this.press(this.action(/선택 해제$|넣기 해제$/))
    }
  }
  async lastTopOrder() {
    const labels = await this.workspace.getByRole('button').evaluateAll(es => es.map(e => e.getAttribute('aria-label') ?? ''))
    const tops = labels.map(l => l.match(/^(\d+)번 /)?.[1]).filter(Boolean) as string[]
    return tops[tops.length - 1]
  }

  async runToEnd() {
    await this.press(this.runButton)
    await expect(this.dialog).toBeVisible({ timeout: 20_000 })
    return (await this.dialog.innerText()).replace(/\s+/g, ' ')
  }

  /** 요소가 페이지 스크롤 없이 화면 안에 완전히 보이는지 */
  async inView(l: Locator) {
    const vp = this.page.viewportSize()!
    const b = await l.boundingBox()
    return !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1
  }
  async noHorizontalScroll() {
    const [sw, w] = await this.page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(sw, '가로 스크롤 없음').toBeLessThanOrEqual(w)
  }
}

export const SOLUTIONS: Record<number, string> = {
  1: 'F F', 2: 'F F R F', 3: 'F R F L F R F', 4: 'F R F', 5: '6[F]', 6: '3[F L F R]', 7: '3[F F R]', 8: '2[F L F R] F',
}

/** 요소 안 글자·SVG 기호의 전경색과 가장 가까운 불투명 배경색의 대비(배경 이미지면 null) */
export async function contrastOf(l: Locator) {
  return l.evaluate(el => {
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 } }
    const lum = ({ r, g, b }: { r: number, g: number, b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const target = (el.querySelector('small, strong, svg') ?? el) as HTMLElement
    const cs = getComputedStyle(target)
    const fg = parse(target instanceof SVGElement ? (cs.stroke !== 'none' ? cs.stroke : cs.fill) : cs.color)
    let bg = null as null | ReturnType<typeof parse>
    for (let a: HTMLElement | null = target; a; a = a.parentElement) {
      const s = getComputedStyle(a); if (s.backgroundImage !== 'none') return null
      const c = parse(s.backgroundColor); if (c.a > 0.9) { bg = c; break }
    }
    if (!bg) return null
    const L1 = lum(fg), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
  })
}