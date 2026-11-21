import { expect, Game, test } from './helpers'

/** T15: 실패하면 원인 블록과 칸을 보여 주고, 코드를 그대로 둔 채 고쳐서 성공한다 */
test.describe('실패 지점에서 고쳐 보기', () => {
  test('잘못된 회전으로 벽에 부딪힘 → 고치기 → 원인 블록 확인 → 고쳐서 성공', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F R F') // 1번 스테이지(S.G, 동쪽): 오른쪽으로 돌면 3번 앞으로에서 벽에 부딪힘
    await g.speed('빠르게')
    const text = await g.runToEnd()
    expect(text).toContain('부딪')

    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(g.dialog).toBeHidden()
    expect(await g.blockCount(), '코드 그대로').toBe(3)
    const cause = g.tile('3')
    await expect(cause, '원인 블록이 선택됨').toHaveAttribute('aria-pressed', 'true')
    await expect(cause.getByRole('img', { name: '실패 지점 블록' }), '원인 블록에 실패 표시(스크린리더에도 읽힘)').toBeVisible()
    expect(await g.inView(cause), '원인 블록이 화면 안').toBe(true)
    await expect(g.board.getByRole('img', { name: '실패 지점' }).first(), '맵에 실패 칸 표시').toBeVisible()
    await expect(g.runButton, '바로 다시 실행할 수 있음(출발점 복귀)').toBeEnabled()

    // 원인을 본 아이가 앞의 회전을 지운다 → 표시가 사라지고 성공
    await g.remove('2')
    await expect(page.locator('.failure-badge')).toHaveCount(0)
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  })

  test('목표에 못 미치면 마지막 블록과 멈춘 칸을 보여 주고, 다시 실행하면 표시가 사라진다', async ({ page }) => {
    const g = new Game(page)
    await g.fresh(); await g.start()
    await g.build('F')
    await g.speed('빠르게')
    expect(await g.runToEnd()).toContain('도달하지')
    await g.press(g.dialog.getByRole('button', { name: '고치기' }))
    await expect(g.tile('1')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.failure-badge')).toHaveCount(1)
    await g.add('F')
    await expect(page.locator('.failure-badge'), '편집하면 표시가 사라짐').toHaveCount(0)
    expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
  })
})

/** T22: 결과 창을 닫은 뒤 "처음으로"를 누르지 않아도 바로 고칠 수 있다 */
test('실패 → 닫기 → 바로 블록을 더 넣어(자동으로 처음으로) 성공', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('F')
  await g.speed('빠르게')
  expect(await g.runToEnd()).toContain('도달하지')
  await g.press(g.dialog.getByRole('button', { name: '닫기' }))
  await expect(g.palette('F'), '닫은 뒤에도 팔레트가 눌림').toBeEnabled()
  await g.add('F')
  expect(await g.blockCount(), '한 번 눌러 바로 추가됨').toBe(2)
  await expect(page.locator('.failure-badge'), '실패 표시는 사라짐').toHaveCount(0)
  expect(await g.runToEnd()).toMatch(/성공|별 \d개|★/)
})
