import { expect, test as base, type Locator, type Page } from '@playwright/test'

/** 화면 동작을 사용자 관점의 행동으로 묶은 도우미. 레이아웃이 바뀌면 이 파일만 고칩니다. */

export type Cmd = 'F' | 'L' | 'R'
const names: Record<Cmd | 'N', string> = { F: '앞으로', L: '왼쪽으로 돌기', R: '오른쪽으로 돌기', N: 'N번 반복' }

/** 모든 테스트: 콘솔 오류·페이지 예외가 하나라도 있으면 실패 */
export const test = base.extend<{ errors: string[] }>({
  errors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
    await use(errors)
    expect(errors, '콘솔 오류 없음').toEqual([])
  }, { auto: true }],
})
export { expect }

export class Game {
  readonly page: Page
  constructor(page: Page) { this.page = page }
  private touch?: boolean
  /** 터치 기기면 tap, 아니면 click (실제 사용자 입력 방식) */
  async press(l: Locator) {
    this.touch ??= await this.page.evaluate(() => matchMedia('(pointer: coarse)').matches)
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
