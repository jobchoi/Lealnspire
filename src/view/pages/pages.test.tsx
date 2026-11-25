import englishGuide from '../../../public/guide-en.html?raw'
import sourceGuide from '../../../docs/GUIDE.md?raw'
import publishedGuide from '../../../public/guide.html?raw'
import { GameController } from '../../controller/GameController'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomePage, RecordDialog } from './HomePage'
import { StageSelectPage } from './StageSelectPage'
import { PlayPage } from './PlayPage'
import { createProgressStore } from '../../model/ProgressRepository'
import { stages, bonusStages, allStages, isLastStage } from '../../model/stages'
import { t, i18n } from '../../i18n/I18n'

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
  it('정규 8개와 보너스 2개 카드, 잠김, 최고 별을 표시하고 이전 완료 시 다음 카드가 열린다', () => {
    const store = createProgressStore()
    const list = () => renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
    expect(list().match(/class="stage-card"/g)).toHaveLength(10)
    expect(list().match(/disabled=""/g)).toHaveLength(9)
    expect(list()).toContain(t('locked'))
    store.completeStage('1', 2, [])
    expect(list().match(/disabled=""/g)).toHaveLength(8)
    expect(list()).toContain(t('bestStars', { count: 2 }))
    expect(list().match(/style="opacity:1"/g)).toHaveLength(2)
    expect(list().match(/style="opacity:0.25"/g)).toHaveLength(28)
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


it('shows loop iterations during playback and clears them after leaving a loop or resetting', () => {
  for (const world of ['sketchbook', 'train', 'handheld'] as const) {
    const stage = { ...stages[0], world }
    const store = createProgressStore()
    let tick: (() => void) | undefined
    const controller = new GameController(stage, store, { set: callback => { tick = callback; return 0 }, clear: noop })
    controller.edit([{ id: 'loop', type: 'repeat', count: 3, body: [
      { id: 'inner', type: 'repeat', count: 2, body: [{ id: 'turn', type: 'turnRight' }] },
    ] }, { id: 'after', type: 'turnLeft' }])
    const page = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage={false} />).replaceAll('<!-- -->', '')
    expect(page()).not.toContain('class="loop-progress"')
    controller.step()
    expect(page()).toContain('aria-label="1번 반복 3번"')
    expect(page()).toContain('aria-label="3번 중 1번째"')
    expect(page()).toContain('aria-label="2번 중 1번째"')
    controller.step()
    controller.step()
    expect(page()).toContain('aria-label="3번 중 2번째"')
    controller.step()
    controller.step()
    expect(page()).toContain('aria-label="3번 중 3번째"')
    controller.reset()
    expect(page()).not.toContain('class="loop-progress"')
    controller.play()
    tick!()
    expect(page()).toContain('aria-label="3번 중 1번째"')
    controller.reset()
    for (let i = 0; i < 7; i++) controller.step()
    expect(controller.finished).toBe(true)
    expect(page()).not.toContain('class="loop-progress"')
    controller.dispose()
  }
})

it('keeps the final loop iteration through results and dismiss, clearing it on reset, edit, selection or replay', () => {
  for (const world of ['sketchbook', 'train', 'handheld'] as const) {
    for (const success of [false, true]) {
      const stage = { ...stages[0], world }
      const store = createProgressStore()
      const controller = new GameController(stage, store, { set: () => 0, clear: noop })
      const program = [{ id: 'loop', type: 'repeat' as const, count: success ? 2 : 3, body: [
        { id: 'command', type: success ? 'forward' as const : 'turnLeft' as const },
      ] }]
      const page = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage={false} />).replaceAll('<!-- -->', '')
      const finish = () => {
        controller.edit(program)
        for (let i = 0; i < program[0].count; i++) controller.step()
        expect(controller.finished).toBe(true)
        expect(controller.result).toBe(success ? 'success' : 'unfinished')
        expect(page()).toContain('role="dialog"')
        expect(page()).toContain(`aria-label="${program[0].count}번 중 ${program[0].count}번째"`)
        controller.dismiss()
        expect(page()).not.toContain('role="dialog"')
        expect(page()).toContain('class="loop-progress"')
      }
      const cleared = () => {
        expect(page()).not.toContain('class="loop-progress"')
        expect(page()).not.toContain('class="failure-badge"')
      }
      finish()
      controller.reset()
      cleared()
      finish()
      controller.edit(program)
      cleared()
      finish()
      controller.editor.select('loop')
      cleared()
      finish()
      controller.play()
      cleared()
      controller.dispose()
    }
  }
})


it('shows the record guide and a separate destructive confirmation', () => {
  const home = renderToString(<HomePage progress={createProgressStore().getProgress()} onStart={noop} onContinue={noop} onList={noop} />)
  expect(home).toContain(`aria-label="${t('privacy.title')}"`)
  const dialog = (confirm: boolean, notice?: string) => renderToString(<RecordDialog confirm={confirm} notice={notice} onClose={noop} onConfirm={noop} onCancel={noop} onClear={noop} />)
  const info = dialog(false, t('privacy.unavailable'))
  expect(info).toContain('role="dialog"')
  expect(info).toContain('aria-modal="true"')
  for (const key of ['location', 'records', 'browser', 'clear', 'unavailable']) expect(info).toContain(t(`privacy.${key}`))
  expect(info).toContain(`href="${import.meta.env.BASE_URL}guide.html"`)
  expect(info).toContain(t('privacy.guide'))
  expect(info).not.toContain('target=')
  expect(info).not.toContain(t('privacy.confirm'))
  for (const key of ['confirm', 'erase', 'cancel']) expect(dialog(true)).toContain(t(`privacy.${key}`))
  expect(dialog(true)).not.toContain(t('privacy.clear'))
})

it('keeps regular stage headings and uses bonus titles without an extra prefix in headings and card names', () => {
  const store = createProgressStore()
  const list = renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
  for (const stage of [...stages, ...bonusStages]) {
    const title = bonusStages.includes(stage) ? t(stage.title) : `${t('stage')} ${stage.id}: ${t(stage.title)}`
    const page = renderToString(<PlayPage stage={stage} progressStore={store} onList={noop} onNext={noop} lastStage={false} />).replaceAll('<!-- -->', '')
    expect(page).toContain(`<h1 tabindex="-1" data-page-title="true">${title}</h1>`)
    expect(list.replaceAll('<!-- -->', '')).toContain(`<strong>${title}</strong>`)
    if (bonusStages.includes(stage)) {
      for (const html of [page, list]) expect(html).not.toContain(`${t('stage')} ${stage.id}`)
    }
  }
})

it('keeps the published teacher guide consistent with the source guide', () => {
  const source = sourceGuide
  const published = publishedGuide
  for (const sentence of ['8개를 성공하면 1단원 완료', '이 기기의 브라우저에만', '별이 적어도 다음 스테이지는 열립니다.', '실제 휴대폰·태블릿 기기, 사파리·파이어폭스는 아직 검증하지 않았습니다.']) {
    expect(source).toContain(sentence)
    expect(published).toContain(sentence)
  }
  expect(published).toContain('href="./"')
  expect(published).toContain('lang="ko"')
})


it('distinguishes regular completion, bonus continuation and bonus completion in results', () => {
  for (const index of [7, 8, 9]) {
    const stage = allStages[index]
    const store = createProgressStore()
    const controller = new GameController(stage, store)
    controller.edit(stage.solution)
    for (let i = 0; i < 1000 && !controller.finished; i++) controller.step()
    expect(controller.result).toBe('success')
    expect(isLastStage(index)).toBe(index !== 8)
    const html = renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage={isLastStage(index)} />)
    const modal = html.split('role="dialog"')[1]
    expect(modal).toContain(`aria-label="${t(index === 8 ? 'nextStage' : 'toList')}"`)
    expect(modal.includes(t('congratulations'))).toBe(index === 7)
    expect(modal.includes(t('bonusCongratulations'))).toBe(index === 9)
    if (index !== 8) expect(modal).toContain('완주')
    controller.dispose()
  }
})


it('renders English controls, stage text and the matching teacher guide', () => {
  const previous = i18n.locale
  try {
    i18n.locale = 'en'
    const store = createProgressStore()
    const home = renderToString(<HomePage locale="en" progress={store.getProgress()} onStart={noop} onContinue={noop} onList={noop} />)
    expect(home).toContain('lang="ko"')
    expect(home).toContain('Change language')
    expect(home).toContain('Crayon Sketchbook')
    const dialog = renderToString(<RecordDialog confirm={false} onClose={noop} onConfirm={noop} onCancel={noop} onClear={noop} />)
    expect(dialog).toContain(`href="${import.meta.env.BASE_URL}guide-en.html"`)
    expect(dialog).toContain('Guide for teachers and parents')
    for (const stage of allStages) {
      const html = renderToString(<PlayPage stage={stage} progressStore={store} onList={noop} onNext={noop} lastStage={false} />)
      expect(html).not.toMatch(/[가-힣]/)
    }
  } finally { i18n.locale = previous }
})

it('publishes English guide statements matching the Unit 1 and privacy contracts', () => {
  for (const sentence of ['Finishing all 8 completes Unit 1.', 'only in this browser on this device', 'The next stage opens even with fewer stars.', 'Not yet tested: real phones and tablets, Safari, Firefox.', 'use the language button in the app']) expect(englishGuide).toContain(sentence)
  expect(englishGuide).toContain('lang="en"')
  expect(englishGuide).toContain('href="./?lang=en"')
})
