import { GameController } from '../../controller/GameController'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { StageSelectPage } from './StageSelectPage'
import { PlayPage } from './PlayPage'
import { createProgressStore } from '../../model/ProgressRepository'
import { stages } from '../../model/stages'
import { t } from '../../i18n/I18n'

const noop = () => {}
describe('화면 렌더링', () => {
  it('기록이 없으면 이어하기를 숨기고 편집 기록이 있으면 표시한다', () => {
    const store = createProgressStore()
    const home = () => renderToString(<HomePage progress={store.getProgress()} onStart={noop} onContinue={noop} onList={noop} />)
    expect(home()).not.toContain(t('continue'))
    expect(home()).toContain(t('start'))
    store.saveProgram('1', [])
    expect(home()).toContain(t('continue'))
    for (const stage of stages) store.completeStage(stage.id, 3, [])
    expect(home()).not.toContain(t('continue'))
  })
  it('8개 카드와 잠김, 최고 별을 표시하고 이전 완료 시 다음 카드가 열린다', () => {
    const store = createProgressStore()
    const list = () => renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
    expect(list().match(/class="stage-card"/g)).toHaveLength(8)
    expect(list().match(/disabled=""/g)).toHaveLength(7)
    expect(list()).toContain(t('locked'))
    store.completeStage('1', 2, [])
    expect(list().match(/disabled=""/g)).toHaveLength(6)
    expect(list()).toContain(t('bestStars', { count: 2 }))
    expect(list().match(/style="opacity:1"/g)).toHaveLength(2)
    expect(list().match(/style="opacity:0.25"/g)).toHaveLength(22)
  })
  it('저장 코드로 게임을 열고 힌트와 결과는 닫힌 상태로 시작한다', () => {
    const store = createProgressStore()
    store.saveProgram('4', [{ id: 'saved', type: 'turnRight' }])
    const html = renderToString(<PlayPage stage={stages[3]} progressStore={store} onList={noop} onNext={noop} lastStage={false} />)
    expect(html.replaceAll('<!-- -->', '')).toContain('aria-label="1번 오른쪽으로 돌기"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain(t(stages[3].hints.keys[0]))
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain(t('stageList'))
    expect(html).toContain('data-page-title')
  })
})

it('완료한 게임을 다시 열면 상단 다음 버튼이 보이고 실행 기호의 이름을 유지한다', () => {
  const store = createProgressStore()
  const page = (lastStage = false) => renderToString(<PlayPage stage={stages[0]} progressStore={store} onList={noop} onNext={noop} lastStage={lastStage} />)
  expect(page()).not.toContain(`aria-label="${t('nextStage')}"`)
  store.completeStage('1', 3, [])
  expect(page()).toContain(`aria-label="${t('nextStage')}"`)
  expect(page(true)).not.toContain(`aria-label="${t('nextStage')}"`)
  for (const name of [t('run'), t('step'), t('reset'), t('hint'), t('stageList'), ...['slow', 'normal', 'fast'].map(speed => t(`speeds.${speed}`))]) {
    expect(page()).toContain(`aria-label="${name}"`)
    expect(page()).toContain(`title="${name}"`)
  }
  expect(page()).toContain('aria-pressed="true"')
})

it('LCD HUD counts nested blocks and uses the stage limit or default', () => {
  const store = createProgressStore()
  store.saveProgram('7', [{ id: 'outer', type: 'repeat', count: 3, body: [
    { id: 'inner', type: 'repeat', count: 2, body: [{ id: 'step', type: 'forward' }] },
  ] }])
  for (const maxBlocks of [undefined, 6]) {
    const html = renderToString(<PlayPage stage={{ ...stages[6], maxBlocks }} progressStore={store} onList={noop} onNext={noop} lastStage={false} />).replaceAll('<!-- -->', '')
    const hud = html.split('class="lcd-hud"')[1].split('</div>')[0]
    expect(hud).toContain(`<span>3/${maxBlocks ?? 10}</span>`)
    expect(html).toContain(t('total', { count: 3, max: maxBlocks ?? 10 }))
  }
})

it('renders each requested hint with map emphasis across all worlds', () => {
  for (const stage of stages) {
    const store = createProgressStore(), controller = new GameController(stage, store)
    const page = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage={false} />).replaceAll('<!-- -->', '')
    expect(page()).not.toContain('data-hint-cell=')
    controller.toggleHint()
    expect(page()).toContain('1/2')
    expect(page()).toContain('id="stage-hint"')
    expect(page()).toContain('aria-controls="stage-hint"')
    expect(page()).toContain('aria-expanded="true"')
    expect(page()).not.toContain('class="stage-goal"')
    expect(page()).toContain(t(stage.hints.keys[0]))
    expect(page()).toContain('data-hint-cell=')
    expect(page()).toContain(`aria-label="${t('nextHint')}"`)
    controller.nextHint()
    expect(page()).toContain('2/2')
    expect(page()).toContain(t(stage.hints.keys[1]))
    expect(page()).not.toContain(`aria-label="${t('nextHint')}"`)
    controller.toggleHint()
    expect(page()).not.toContain('data-hint-cell=')
    expect(page()).toContain('aria-expanded="false"')
    expect(page()).toContain('class="stage-goal"')
  }
})
