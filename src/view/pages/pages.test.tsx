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
import { stages, bonusStages, allStages, unit2Stages, unit3Stages, unit4Stages, unit5Stages, unit6Stages, unit7Stages, unit8Stages, unit9Stages, unit10Stages, unit11Stages, unit12Stages, isLastStage } from '../../model/stages'
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
    expect(home()).toContain(t('continue'))
    for (const stage of [...unit2Stages, ...unit3Stages, ...unit4Stages, ...unit5Stages, ...unit6Stages, ...unit7Stages, ...unit8Stages, ...unit9Stages, ...unit10Stages, ...unit11Stages, ...unit12Stages]) store.completeStage(stage.id, 3, [])
    expect(home()).not.toContain(t('continue'))
  })
  it('정규 8개와 보너스 2개 카드, 잠김, 최고 별을 표시하고 이전 완료 시 다음 카드가 열린다', () => {
    const store = createProgressStore()
    const list = () => renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
    expect(list().match(/class="stage-card"/g)).toHaveLength(allStages.length)
    expect(list().match(/disabled=""/g)).toHaveLength(allStages.length - 1)
    expect(list()).toContain(t('locked'))
    store.completeStage('1', 2, [])
    expect(list().match(/disabled=""/g)).toHaveLength(allStages.length - 2)
    expect(list()).toContain(t('bestStars', { count: 2 }))
    expect(list().match(/style="opacity:1"/g)).toHaveLength(2)
    expect(list().match(/style="opacity:0.25"/g)).toHaveLength(allStages.length * 3 - 2)
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

it('uses the localized Unit 2 title in play, list and results without exposing its storage ID', () => {
  const previous = i18n.locale
  try {
    const stage = allStages.find(stage => stage.id === 'u2-1')!
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      const title = locale === 'ko' ? '2단원 1: 막히면 돌아요' : 'Unit 2-1: Turn When Blocked'
      const store = createProgressStore()
      const controller = new GameController(stage, store)
      controller.edit(stage.solution)
      for (let i = 0; i < 1000 && !controller.finished; i++) controller.step()
      expect(controller.result).toBe('success')
      const html = renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage />).replaceAll('<!-- -->', '')
      expect(html).toContain(`<h1 tabindex="-1" data-page-title="true">${title}</h1>`)
      expect(html.split('role="dialog"')[1]).toContain(title)
      expect(html).not.toContain('u2-1')
      const list = renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)
      expect(list).toContain(title)
      expect(list).not.toContain('u2-1')
    }
  } finally { i18n.locale = previous }
})

it('renders stepLimit notices, the failed map and the correct while or repeat explanation', () => {
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      for (const whileLoop of [true, false]) {
        const stage = whileLoop ? unit3Stages[2] : stages[0]
        const store = createProgressStore()
        const controller = new GameController(stage, store)
        if (!whileLoop) controller.edit([{ id: 'a', type: 'repeat', count: 10, body: [{ id: 'b', type: 'repeat', count: 10, body: [{ id: 'c', type: 'repeat', count: 10, body: [{ id: 'd', type: 'repeat', count: 10, body: [{ id: 'r', type: 'turnRight' }] }] }] }] }])
        for (let i = 0; i < 1100 && !controller.finished; i++) controller.step()
        expect(controller.showResult).toBe(true)
        const html = renderToString(<PlayPage stage={stage} progressStore={store} controller={controller} onList={noop} onNext={noop} lastStage={false} />)
        const modal = html.split('role="dialog"')[1]
        expect(modal).toContain(t('stepLimitNotice'))
        const reason = t(whileLoop ? 'whileStepLimit' : 'failures.stepLimit')
        expect(modal).toContain(whileLoop ? t('variantFailure', { number: 1, reason }) : reason)
        if (!whileLoop) expect(modal).not.toContain(t('whileStepLimit'))
        controller.dispose()
      }
    }
  } finally { i18n.locale = previous }
})

it('renders unit 5 values, variable controls and range failures in both locales and all worlds', () => {
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      for (const world of ['sketchbook', 'train', 'handheld'] as const) {
        const stage = { ...unit5Stages[2], world }
        const store = createProgressStore()
        const game = new GameController(stage, store)
        const render = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={game} lastStage onList={noop} onNext={noop} />)
        let html = render()
        expect(html).toContain(t('variables.status', { value: 0 }))
        expect(html).toContain(t('blocks.set'))
        expect(html).toContain('×A')
        expect(html).not.toContain('×undefined')
        game.editor.select('repeat')
        expect(render()).toContain(t('variables.useNumber'))
        game.edit([{ id: 's', type: 'set', variable: 'A', value: 20 }, { id: 'c', type: 'change', variable: 'A', by: 1 }])
        game.step()
        html = render()
        expect(html).toContain(t('variables.changed', { from: 0, to: 20 }))
        game.step()
        expect(render()).toContain(t('failures.variableRange'))
        game.dispose()
      }
    }
  } finally { i18n.locale = previous }
})

it('renders parameter inputs, copied values and completion in both locales and all worlds', async () => {
  const { worlds } = await import('../theme/themes')
  const { ResultModal } = await import('../components/ResultModal')
  try {
    for (const locale of ['ko', 'en']) for (const world of worlds) {
      i18n.locale = locale
      const stage = { ...unit7Stages[0], world }, store = createProgressStore()
      store.saveProgram(stage.id, { main: stage.solution, functions: stage.solutionFunctions! })
      const game = new GameController(stage, store)
      const draw = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage={false} />)
      expect(draw()).toContain(t('parameters.disable.star'))
      expect(draw()).toContain(t('parameters.call.star', { order: 1, value: 'A' }))
      expect(draw()).toContain(t('parameters.value'))
      game.step()
      const running = draw()
      expect(running).toContain('◆2')
      expect(running).toContain('A → 2')
      expect(running).toContain(t('parameters.passed.star', { value: 2, a: 2 }))
      expect(running).toContain(t('variables.status', { value: 2 }))
      game.reset(); draw(); game.editor.toggleParameter('star')
      expect(draw()).toContain(t('parameters.enable.star'))
      expect(draw()).toContain('aria-pressed="false"')
      game.dispose()
      const result = renderToString(<ResultModal unit7 result="success" stars={3} lastStage onRetry={noop} onClose={noop} />)
      expect(result).toContain(t('unit7Congratulations'))
    }
  } finally { i18n.locale = 'ko' }
})

it('renders unit 8 return transfer, sensor observation, skipped blocks and completion in ko/en across all worlds', () => {
  const original = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      const store = createProgressStore()
      expect(renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)).toContain(t('unit8'))
      for (const world of ['sketchbook', 'train', 'handheld'] as const) {
        const stage = { ...unit8Stages[2], world }
        const game = new GameController(stage, store)
        game.edit({ main: stage.solution, functions: stage.solutionFunctions! })
        while (!game.frame?.returned) game.step()
        const html = renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage />)
        expect(html).toContain('return-socket')
        expect(html).toContain('return-transfer')
        expect(html).toContain(t('returns.ahead'))
        expect(html).toContain(t('returns.skipped'))
        expect(html).toContain('return-skipped')
        expect(html).toContain('ahead-observation')
        while (!game.finished) game.step()
        expect(renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage />)).toContain(t('unit8Congratulations'))
        game.dispose()
      }
    }
  } finally { i18n.locale = original }
})

it('renders signal scenarios, locks, dispatch, unconnected notices and unit9 completion in ko/en × three worlds', () => {
  const original = i18n.locale
  try {
    for (const locale of ['ko', 'en']) for (const world of ['sketchbook', 'train', 'handheld'] as const) {
      i18n.locale = locale
      const store = createProgressStore()
      const stage = { ...unit9Stages[1], world }
      const game = new GameController(stage, store)
      game.edit(stage.solution)
      game.selectVariant(1)
      const draw = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage />)
      const before = draw()
      expect(before).toContain(t('events.closed'))
      expect(before).toContain(t('events.upcoming'))
      expect(before).toContain(t('events.queue'))
      expect(before).toContain(t('events.running'))
      expect(before).toContain(t('events.notice').replaceAll("'", '&#x27;'))
      expect(before).toContain('scenario-signals')
      expect(before).toContain(t('events.tile', { order: 1, signal: t('events.diamond') }))
      while (game.frame?.events?.phase !== 'unconnected') game.step()
      const unconnected = draw()
      expect(unconnected).toContain(t('events.unconnected'))
      expect(unconnected).toContain('data-door="a" data-open="true"')
      expect(unconnected).toContain('data-door="b" data-open="false"')
      while (game.frame?.events?.handler?.signal !== '○') game.step()
      expect(draw()).toContain('data-block-id="u92-circle" class="block-tile block-on block-active"')
      while (!game.finished) game.step()
      expect(draw()).toContain(t('unit9Congratulations'))
      game.dispose()
      expect(renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)).toContain(t('unit9'))
    }
  } finally { i18n.locale = original }
})

it('renders indices/values, distinct pointers, index errors and unit10 completion in ko/en × three worlds', () => {
  try {
    for (const locale of ['ko', 'en']) for (const world of ['sketchbook', 'train', 'handheld'] as const) {
      i18n.locale = locale
      const store = createProgressStore()
      const stage = { ...unit10Stages[0], world }
      const game = new GameController(stage, store)
      game.edit(stage.solution)
      const draw = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage />)
      expect(draw()).toContain(t('lists.index', { index: 0 }))
      expect(draw()).toContain(t('lists.value', { value: 2 }))
      expect(draw()).toContain(t('lists.length', { length: 3 }))
      game.step()
      expect(draw()).toContain(t('lists.eachPointer', { index: 0, value: 2 }))
      expect(draw()).toContain('list-current')
      while (!game.finished) game.step()
      expect(draw()).toContain(t('unit10Congratulations'))
      game.dispose()
      const access = { ...unit10Stages[1], world }
      const reader = new GameController(access, store)
      reader.edit(access.solution); reader.step(); reader.step()
      const readDraw = () => renderToString(<PlayPage stage={access} progressStore={store} controller={reader} onList={noop} onNext={noop} lastStage />)
      expect(readDraw()).toContain(t('lists.atPointer', { index: 0, value: 2 }))
      expect(readDraw()).toContain('list-access')
      reader.reset()
      reader.edit([{ id: 'set', type: 'set', variable: 'A', value: 2 }, { id: 'r', type: 'repeat', countSource: 'listAtA', body: [] }])
      while (!reader.finished) reader.step()
      expect(readDraw()).toContain(t('lists.rangeShort', { index: 2, length: 2 }))
      expect(readDraw()).toContain(t('lists.range', { index: 2, length: 2 }))
      expect(readDraw()).not.toContain('class="list-access"')
      reader.dispose()
      expect(renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)).toContain(t('unit10'))
    }
  } finally { i18n.locale = 'ko' }
})

it('renders search comparison, found/unseen cells, repair cause and completion in ko/en × three worlds', () => {
  try {
    for (const locale of ['ko', 'en']) for (const world of ['sketchbook', 'train', 'handheld'] as const) {
      i18n.locale = locale
      const store = createProgressStore()
      const stage = { ...unit11Stages[1], world }
      const game = new GameController(stage, store)
      game.edit(stage.solution)
      const draw = () => renderToString(<PlayPage stage={stage} progressStore={store} controller={game} onList={noop} onNext={noop} lastStage />).replaceAll('<!-- -->', '')
      const before = draw()
      expect(before).toContain(t('search.count', { count: 0, limit: 2 }))
      expect(before).toContain(t('search.target', { value: 7 }))
      expect(before).toContain('search-page')
      expect(before).not.toContain(t('variables.label'))
      game.step(); game.step()
      const matched = draw()
      expect(matched).toContain('search-comparing')
      expect(matched).toContain('search-mark')
      expect(matched).toContain(t('search.found', { index: 0 }))
      while (!game.finished) game.step()
      const finished = draw()
      expect(finished).toContain(t('search.unseen'))
      expect(finished).toContain('search-unseen')
      expect(finished).toContain(t('search.reflect'))
      expect(finished).toContain(t('unit11Congratulations'))
      expect(finished.replace(/<[^>]*>/g, '')).not.toContain('🎯') // Visible targets are SVG; accessible names retain the localized condition.
      game.dispose()
      const repairStage = { ...unit11Stages[2], world }
      const repair = new GameController(repairStage, store)
      // Use a fresh repository so this is the initial front-direction program.
      repair.edit(repairStage.initialProgram!)
      while (!repair.finished) repair.step()
      const failed = renderToString(<PlayPage stage={repairStage} progressStore={store} controller={repair} onList={noop} onNext={noop} lastStage />)
      expect(failed).toContain(t('search.limit', { limit: 2 }))
      repair.fix(); expect(repair.editor.selectedBlock?.id).toBe('each')
      expect(renderToString(<PlayPage stage={repairStage} progressStore={store} controller={repair} onList={noop} onNext={noop} lastStage />)).toContain(t('search.front'))
      repair.editor.toggleDirection()
      expect(repair.getSnapshot().program).toEqual(repairStage.solution)
      repair.dispose()
      const observe = { ...unit11Stages[0], world }
      const observer = new GameController(observe, store); observer.edit(observe.solution)
      const empty = renderToString(<PlayPage stage={observe} progressStore={store} controller={observer} onList={noop} onNext={noop} lastStage />)
      expect(empty).toContain(t('search.empty'))
      observer.step(); observer.step(); observer.step(); observer.step()
      expect(renderToString(<PlayPage stage={observe} progressStore={store} controller={observer} onList={noop} onNext={noop} lastStage />)).toContain('search-mark')
      observer.dispose()
      expect(renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)).toContain(t('unit11'))
    }
  } finally { i18n.locale = 'ko' }
})

it('renders synthesis as unit12 in both locales and every world, with course completion only after all regular puzzles', () => {
  const store = createProgressStore()
  for (const locale of ['ko', 'en'] as const) {
    i18n.locale = locale
    for (const stage of unit12Stages) for (const world of ['sketchbook', 'train', 'handheld'] as const) {
      const rendered = renderToString(<PlayPage stage={{ ...stage, world }} progressStore={store} onList={noop} onNext={noop} lastStage={stage.id === 'u12-3'} />)
      expect(rendered).toContain(`aria-label="${t('unit12')}"`)
      expect(rendered).not.toContain('course-completion')
    }
    for (const stage of allStages.filter(s => stages.includes(s) || s.variants)) store.completeStage(stage.id, 3, [])
    expect(renderToString(<StageSelectPage progress={store.getProgress()} onSelect={noop} onHome={noop} />)).toContain(t('synthesis.complete'))
    const stage = unit12Stages[2], game = new GameController(stage, store)
    game.edit(stage.solution)
    while (!game.finished) game.step()
    const rendered = renderToString(<PlayPage stage={stage} controller={game} progressStore={store} onList={noop} onNext={noop} lastStage />)
    expect(rendered).toContain(t('unit12Congratulations'))
    expect(rendered).toContain(t('synthesis.complete'))
    game.dispose()
    store.clear()
  }
  i18n.locale = 'ko'
})

it('shows deletion failure with a retry action', () => {
  const html = renderToString(<RecordDialog clearFailed confirm={false} notice={t('privacy.clearFailed')} onClose={noop} onConfirm={noop} onCancel={noop} onClear={noop} />)
  expect(html).toContain(t('privacy.clearFailed'))
  expect(html).toContain(t('privacy.tryAgain'))
  expect(html).not.toContain(`>${t('privacy.clear')}<`)
})

it('shows the home completion badge only after all regular units, without bonus completion', () => {
  const store = createProgressStore()
  const home = () => renderToString(<HomePage progress={store.getProgress()} onStart={noop} onContinue={noop} onList={noop} />)
  expect(home()).not.toContain(t('synthesis.homeComplete'))
  for (const stage of allStages.filter(stage => !bonusStages.includes(stage))) store.completeStage(stage.id, 3, stage.solution)
  expect(home()).toContain(t('synthesis.homeComplete'))
  expect(home()).not.toContain(`>${t('continue')}<`)
})
