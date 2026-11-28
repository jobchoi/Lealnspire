import { afterEach, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { ReactElement } from 'react'
import { LearningPage } from './LearningPage'
import { AppController } from '../../controller/AppController'
import { ProgressRepository, progressV2Key } from '../../model/ProgressRepository'
import { allStages } from '../../model/stages'
import { i18n, t } from '../../i18n/I18n'
import { ResultModal } from '../components/ResultModal'
import { StageSelectPage } from './StageSelectPage'
import type { HistoryEventInput } from '../../model/history'

const noop = () => {}
const render = (app: AppController) => renderToString(<LearningPage data={app.learningData} onHome={noop} onList={noop} onUnit={app.unitList} onSelect={app.openStage} onRemove={id => app.setReview(id, false)} />)
afterEach(() => { i18n.locale = 'ko' })
it('renders an empty learner page with twelve tools, a first step, and Korean/English copy', () => {
  const app = new AppController()
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = render(app).replaceAll("&#x27;", "'")
    expect(html).toContain(t('learning.empty'))
    expect(html).toContain(t('learning.count', { count: 0 }))
    expect(html.match(/data-state=/g)).toHaveLength(12)
    expect(html.match(/data-state="active"/g)).toHaveLength(1)
    expect(html.match(/data-state="unopened"/g)).toHaveLength(11)
    expect(html).toContain(t('continue'))
    for (const key of ['bestStars', 'hint', 'stars']) expect(html).not.toContain(`aria-label="${t(key, { count: 0 })}"`)
  }
  expect(app.learningData.next?.index).toBe(0)
})
it('uses progress for all 45 regular achievements and twelve tool states, excluding bonus', () => {
  const app = new AppController()
  for (const stage of allStages) app.repository.completeStage(stage.id, 3, [])
  expect(app.learningData.completed).toBe(45)
  expect(app.learningData.tools).toHaveLength(12)
  expect(app.learningData.tools.every(tool => tool.completed > 0)).toBe(true)
  expect(app.learningData.next).toBeUndefined()
  expect(render(app).match(/data-state="completed"/g)).toHaveLength(12)
  app.unitList(8)
  expect(app.getSnapshot()).toEqual({ page: 'list', unit: 8 })
})
it('shows provenance for migrated progress without fabricating recent achievements', () => {
  const raw = JSON.stringify({ version: 2, stages: { '1': { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } } } })
  const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: noop, removeItem: noop })
  const app = new AppController(repo)
  expect(render(app)).toContain(t('learning.older'))
  expect(app.learningData.completed).toBe(1)
  expect(app.learningData.recent).toEqual([])
  expect(app.learningData.next?.stage.id).toBe('2')
})
it('shows fixed wording only with a linked failure, edit and completed retry', () => {
  const app = new AppController()
  const repo = app.repository
  const base = { visitId: 'visit', activityKind: 'puzzle' as const, activityId: '1', unit: 1, recordedAt: repo.historyNow(), elapsedMs: 0, appVersion: '1', contentVersion: '1', evaluationVersion: '1' }
  const add = (event: HistoryEventInput) => expect(repo.appendHistory(event)).toBe(true)
  add({ ...base, attemptId: 'failed', type: 'attemptStarted', data: { revision: 0, mode: 'step', changed: false } })
  add({ ...base, attemptId: 'failed', type: 'executionCalculated', data: { result: 'collision', variants: ['collision'], failedVariant: 0 } })
  add({ ...base, attemptId: 'failed', type: 'resultReached', data: {} })
  add({ ...base, type: 'fixRequested', data: { previousAttemptId: 'failed', source: 'edit' } })
  add({ ...base, type: 'codeChanged', data: { revision: 1, changes: 1, counts: {}, changed: true } })
  add({ ...base, attemptId: 'retry', type: 'attemptStarted', data: { revision: 1, mode: 'auto', changed: true, previousAttemptId: 'failed' } })
  add({ ...base, attemptId: 'retry', type: 'completionConfirmed', data: { first: true, stars: 3 } })
  expect(app.learningData.recent).toEqual([])
  repo.completeStage('1', 3, [])
  expect(render(app)).toContain(t('learning.fixed'))
  add({ ...base, attemptId: 'replay', type: 'attemptStarted', data: { revision: 1, mode: 'auto', changed: false, previousAttemptId: 'retry' } })
  add({ ...base, attemptId: 'replay', type: 'completionConfirmed', data: { first: false, stars: 3 } })
  expect(render(app)).not.toContain(t('learning.fixed'))
  expect(render(app)).toContain(t('learning.arrived'))
})
it('limits recent and review cards, dismisses unfinished suggestions, and persists selection', () => {
  const values = new Map<string, string>()
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) } }
  const app = new AppController(new ProgressRepository(storage))
  app.openStage(0)
  app.learning()
  expect(app.learningData.review.map(e => e.stage.id)).toEqual(['1'])
  app.setReview('1', false)
  expect(app.learningData.review).toEqual([])
  for (const id of ['1', '2', '3', '4']) {
    app.repository.completeStage(id, 3, [])
    app.setReview(id, true)
  }
  expect(app.learningData.review.map(e => e.stage.id)).toEqual(['4', '3', '2'])
  app.setReview('4', false)
  expect(app.learningData.review.map(e => e.stage.id)).toEqual(['3', '2', '1'])
  const restored = new AppController(new ProgressRepository(storage))
  expect(restored.isReview('3')).toBe(true)
  expect(restored.isReview('4')).toBe(false)
  expect(restored.repository.getHistory().events.filter(e => e.type === 'reviewChanged')).toHaveLength(6)
})
// Stateless page trees expose the same handlers passed to the real buttons.
type Node = ReactElement<Record<string, unknown>>
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (!value || typeof value !== 'object' || !('props' in value)) return []
  const node = value as Node
  return [node, ...nodes(node.props.children)]
}
it('dispatches review removal, unit navigation and continue from learner buttons', () => {
  const app = new AppController()
  app.setReview('1', true)
  const tree = nodes(LearningPage({ data: app.learningData, onHome: noop, onList: noop, onUnit: app.unitList, onSelect: app.openStage, onRemove: id => app.setReview(id, false) }))
  const buttons = tree.filter(n => n.type === 'button')
  ;(buttons.find(n => String(n.props['aria-label']).startsWith(t('learning.remove')))!.props.onClick as () => void)()
  expect(app.isReview('1')).toBe(false)
  ;(buttons.find(n => n.props['data-state'] === 'active')!.props.onClick as () => void)()
  expect(app.getSnapshot()).toEqual({ page: 'list', unit: 1 })
  ;(buttons.find(n => n.props.children === t('continue'))!.props.onClick as () => void)()
  expect(app.getSnapshot()).toEqual({ page: 'play', index: 0 })
  app.home()
})
it('renders selected toggles on both the result and list and records game toggle events', () => {
  const app = new AppController()
  app.start()
  app.game!.toggleReview()
  expect(app.game!.reviewSelected).toBe(true)
  const props = { result: 'success' as const, stars: 3, onRetry: noop, onClose: noop, reviewSelected: app.game!.reviewSelected, onReview: app.game!.toggleReview }
  expect(renderToString(<ResultModal {...props} />)).toContain('aria-pressed="true"')
  expect(renderToString(<StageSelectPage progress={app.progress} onSelect={noop} onHome={noop} isReview={app.isReview} onReview={app.setReview} />)).toContain('aria-pressed="true"')
  app.game!.toggleReview()
  expect(app.game!.reviewSelected).toBe(false)
  app.home()
})
it('projects real game failure → edit → success and keeps the latest three distinct completions', () => {
  const app = new AppController()
  app.start()
  const game = app.game!
  game.edit([{ id: 'wrong', type: 'turnLeft' }])
  do { game.step() } while (!game.finished)
  game.edit(allStages[0].solution)
  do { game.step() } while (!game.finished)
  app.learning()
  expect(app.learningData.recent[0]).toMatchObject({ fixed: true, stage: { id: '1' } })
  for (let i = 1; i < 5; i++) {
    app.openStage(i)
    app.game!.edit(allStages[i].solution)
    do { app.game!.step() } while (!app.game!.finished)
    app.learning()
  }
  expect(app.learningData.recent.map(e => e.stage.id)).toEqual(['5', '4', '3'])
  expect(app.learningData.recent.every(e => !e.fixed)).toBe(true)
})

it('keeps partial units in progress and supplies empty guidance and full puzzle names', () => {
  const app = new AppController()
  for (const stage of allStages.filter(s => /^\d+$/.test(s.id))) app.repository.completeStage(stage.id, 3, [])
  app.repository.completeStage('u2-1', 3, [])
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = render(app).replaceAll("&#x27;", "'")
    expect(html.match(/data-state="completed"/g)).toHaveLength(1)
    expect(html).toContain(t('learning.inProgress'))
    expect(html).toContain(t('learning.none'))
    expect(html).toContain(t('learning.reviewEmpty'))
    expect(html).toContain(t('unitStageLabel', { unit: 2, number: 2 }))
    expect(html.indexOf('id="learning-next"')).toBeLessThan(html.indexOf('id="learning-tools"'))
    expect(html).toContain('theme-sketchbook')
  }
})
