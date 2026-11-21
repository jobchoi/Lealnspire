import { expect, Game, test } from './helpers'

/** T18: 반복을 한 단계씩 실행하면 몇 번째 도는 중인지 보인다 */
test('반복을 한 단계씩 실행하며 1/3 → 2/3 → 3/3을 확인하고, 처음으로 가면 표시가 사라진다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('3[L]')
  const progress = g.tile('1').getByRole('img', { name: /3번 중 \d번째/ })
  await expect(progress, '실행 전에는 회차 없음').toHaveCount(0)
  for (const n of [1, 2, 3]) {
    await g.press(g.button('한 단계'))
    await expect(progress).toHaveAccessibleName(`3번 중 ${n}번째`)
    await expect(progress).toHaveText(`${n}/3`)
  }
  // 세 번째 단계가 마지막이라 결과 창이 뜬다. 창을 닫아도 마지막 회차(3/3)는 남아 있어야 한다
  await expect(g.dialog).toBeVisible()
  await g.press(g.dialog.getByRole('button', { name: '닫기' }))
  await expect(progress).toHaveText('3/3')
  await g.press(g.button('처음으로'))
  await expect(page.locator('.loop-progress'), '처음으로 가면 사라짐').toHaveCount(0)
})

test('반복 안의 반복은 바깥과 안쪽 회차를 함께 보여 준다', async ({ page }) => {
  const g = new Game(page)
  await g.fresh(); await g.start()
  await g.build('2[L]')
  await g.select('1'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
  await g.add('N') // 1.2번: 안쪽 반복(기본 3번)
  await g.press(g.action(/선택 해제$|넣기 해제$/))
  await g.select('1.2'); await g.press(g.action(/추가 대상으로 선택$|안에 넣기$/))
  await g.add('R')
  await g.press(g.action(/선택 해제$|넣기 해제$/))
  // 실행 순서: L(바깥 1/2) → R(바깥 1/2, 안쪽 1/3) …
  await g.press(g.button('한 단계'))
  await g.press(g.button('한 단계'))
  await expect(g.tile('1').getByRole('img', { name: '2번 중 1번째' }).first()).toBeVisible()
  await expect(g.tile('1.2').getByRole('img', { name: '3번 중 1번째' })).toBeVisible()
})
