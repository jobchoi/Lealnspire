import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { StageSelectPage } from './StageSelectPage'
import { PlayPage } from './PlayPage'
import { createProgressStore } from '../storage/progress'
import { stages } from '../stages'
import { ko } from '../i18n/ko'

const noop = () => {}
describe('화면 렌더링', () => {
  it('기록이 없으면 이어하기를 숨기고 편집 기록이 있으면 표시한다', () => {
    const store = createProgressStore()
    const home = () => renderToString(<HomePage progress={store.getProgress()} onStart={noop} onContinue={noop} onList={noop} />)
    expect(home()).not.toContain(ko.continue)
    expect(home()).toContain(ko.start)
    store.saveProgram('1', [])
    expect(home()).toContain(ko.continue)
    for (const stage of stages) store.completeStage(stage.id, 3, [])
    expect(home()).not.toContain(ko.continue)
  })
  it('8개 카드와 잠김, 최고 별을 표시하고 이전 완료 시 다음 카드가 열린다', () => {
    const store = createProgressStore()
    const list = () => renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
    expect(list().match(/class="stage-card"/g)).toHaveLength(8)
    expect(list().match(/disabled=""/g)).toHaveLength(7)
    expect(list()).toContain(ko.locked)
    store.completeStage('1', 2, [])
    expect(list().match(/disabled=""/g)).toHaveLength(6)
    expect(list()).toContain(ko.bestStars(2))
    expect(list().replaceAll('<!-- -->', '')).toContain('★★☆')
  })
  it('저장 코드로 게임을 열고 힌트와 결과는 닫힌 상태로 시작한다', () => {
    const store = createProgressStore()
    store.saveProgram('4', [{ id: 'saved', type: 'turnRight' }])
    const html = renderToString(<PlayPage stage={stages[3]} progressStore={store} onList={noop} onNext={noop} lastStage={false} />)
    expect(html.replaceAll('<!-- -->', '')).toContain('aria-label="1번 오른쪽으로 돌기"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain(stages[3].hint)
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain(ko.stageList)
    expect(html).toContain('data-page-title')
  })
})

it('완료한 게임을 다시 열면 상단 다음 버튼이 보이고 실행 기호의 이름을 유지한다', () => {
  const store = createProgressStore()
  const page = (lastStage = false) => renderToString(<PlayPage stage={stages[0]} progressStore={store} onList={noop} onNext={noop} lastStage={lastStage} />)
  expect(page()).not.toContain(`aria-label="${ko.nextStage}"`)
  store.completeStage('1', 3, [])
  expect(page()).toContain(`aria-label="${ko.nextStage}"`)
  expect(page(true)).not.toContain(`aria-label="${ko.nextStage}"`)
  for (const name of [ko.run, ko.step, ko.reset, ko.hint, ko.stageList, ...Object.values(ko.speeds)]) {
    expect(page()).toContain(`aria-label="${name}"`)
    expect(page()).toContain(`title="${name}"`)
  }
  expect(page()).toContain('aria-pressed="true"')
})
