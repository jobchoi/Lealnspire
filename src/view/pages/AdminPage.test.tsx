import { afterEach, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { AdminPage } from './AdminPage'
import { HomePage } from './HomePage'
import { AppController } from '../../controller/AppController'
import { ProgressRepository, progressV2Key } from '../../model/ProgressRepository'
import { challenges } from '../../model/challenges'
import { adminSummary } from '../../model/adminSummary'
import { compactHistory } from '../../model/historySummary'
import { allStages } from '../../model/stages'
import type { HistoryEventInput, HistoryResult } from '../../model/history'
import { stageLabel, i18n, t } from '../../i18n/I18n'

const noop = () => {}
const render = (app: AppController) => renderToString(<AdminPage data={app.adminData} onHome={app.home} />)
afterEach(() => { i18n.locale = 'ko' })
function fixture() {
  const app = new AppController()
  let visitId = 'first', attemptId = 'a0', tick = 0
  const add = (event: Pick<HistoryEventInput, 'type' | 'data'>) => {
    const input = { visitId, attemptId, activityKind: 'puzzle', activityId: '1', unit: 1, recordedAt: new Date(Date.UTC(2026, 10, 28, 0, 0, tick++)).toISOString(), elapsedMs: event.type === 'timeSegment' && 'endMs' in event.data ? event.data.endMs : tick * 1000, appVersion: '1', contentVersion: '1', evaluationVersion: '1', ...event } as HistoryEventInput
    expect(app.repository.appendHistory(input)).toBe(true)
  }
  const attempt = (id: string, result: HistoryResult, interrupted = false) => {
    attemptId = id
    add({ type: 'attemptStarted', data: { revision: 0, mode: 'auto', changed: false } })
    add({ type: 'executionCalculated', data: { result, variants: [result], failedVariant: result === 'success' ? null : 0 } })
    add(interrupted ? { type: 'executionInterrupted', data: { reason: 'reset' } } : { type: 'resultReached', data: {} })
  }
  return { app, add, attempt, nextVisit: () => { add({ type: 'visitEnded', data: { reason: 'leave' } }); visitId = 'second'; add({ type: 'visitStarted', data: {} }) } }
}
it('renders empty and unavailable state, twelve units, 45 puzzles and both languages', () => {
  const app = new AppController()
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = render(app)
    expect(html).toContain(t('admin.ratio', { count: 0, total: 45 }))
    for (const key of ['development', 'local', 'unavailable', 'noAttempts', 'emptyDetail', 'noAttention']) expect(html).toContain(t(`admin.${key}`))
    expect(html.match(/<th scope="row">/g)).toHaveLength(12 + app.adminData.challengeEntries.length)
    expect(html).not.toContain('theme-sketchbook')
    expect(html).not.toContain('admin.events.')
  }
})
it('uses authoritative progress for migrated users and excludes bonuses', () => {
  const raw = JSON.stringify({ version: 2, stages: { '1': { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } } } })
  const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: noop })
  const app = new AppController(repo)
  repo.completeStage('b1', 3, [])
  expect(app.adminData.completed).toBe(1)
  expect(app.adminData.entries).toHaveLength(45)
  expect(render(app)).toContain(t('admin.older'))
  expect(render(app)).toContain(t('admin.saved'))
})
it('counts three reached failures, repeated kinds and help without treating interruptions as failures', () => {
  const { app, attempt, add } = fixture()
  attempt('a1', 'collision'); attempt('a2', 'collision'); attempt('a3', 'unfinished', true)
  expect(app.adminData.entries[0].puzzle.needsAttention).toBe(false)
  attempt('a4', 'missingReturn')
  add({ type: 'hintShown', data: { step: 1, first: true } })
  const entry = app.adminData.entries[0]
  expect(entry.puzzle.needsAttention).toBe(true)
  expect(entry.repeated).toEqual(['collision'])
  expect(entry.helpedUnfinished).toBe(true)
  const html = render(app)
  for (const key of ['threeFailures', 'helpedUnfinished']) expect(html).toContain(t(`admin.${key}`))
  expect(html).toContain(t('admin.repeated', { result: t('admin.results.collision') }))
})
it('links hint/demo use to later attempts and only counts independent success in another visit', () => {
  const { app, add, attempt, nextVisit } = fixture()
  add({ type: 'hintShown', data: { step: 1, first: true } })
  add({ type: 'hintShown', data: { step: 1, first: false } })
  add({ type: 'hintShown', data: { step: 2, first: true } })
  add({ type: 'demoStarted', data: { demoId: 'repeat' } })
  add({ type: 'demoEnded', data: { demoId: 'repeat', reachedEnd: true } })
  attempt('a1', 'success', true); attempt('a2', 'success')
  nextVisit(); attempt('a3', 'success')
  const entry = app.adminData.entries[0]
  expect(entry).toMatchObject({ helpedAttempts: 2, helpedSuccess: 1, independentSuccess: 1 })
  expect(entry.puzzle).toMatchObject({ attempts: 3, hint1Attempts: 2, hint2Attempts: 2, demoUses: 1, demoEnds: 1 })
  expect(render(app)).not.toContain('<td>3<p>')
})
it('orders retained detail by sequence and represents compacted visits once without inventing help outcomes', () => {
  const { app, add, attempt, nextVisit } = fixture()
  add({ type: 'visitStarted', data: {} })
  attempt('a1', 'collision')
  add({ type: 'hintShown', data: { step: 1, first: true } })
  add({ type: 'codeChanged', data: { revision: 1, changes: 1, counts: {}, changed: true } })
  attempt('a2', 'success')
  let html = render(app)
  const labels = [t('admin.events.visitStarted'), `${t('admin.events.attemptStarted')} → ${t('admin.results.collision')}`, t('admin.hintStep', { step: 1 }), t('admin.codeChanges', { count: 1 }), `${t('admin.events.attemptStarted')} → ${t('admin.results.success')}`]
  for (const label of labels) expect(html).toContain(label)
  expect(html).not.toContain(t('admin.events.executionCalculated'))
  expect(html).not.toContain(t('admin.events.resultReached'))
  expect(labels.map(label => html.indexOf(label))).toEqual(labels.map(label => html.indexOf(label)).sort((a,b) => a-b))
  nextVisit()
  const compacted = compactHistory(app.repository.getHistory(), '2027-05-01T00:00:00.000Z')
  const data = { ...adminSummary(compacted, app.progress, allStages, app.repository.getProgressDocument()), persistent: false }
  expect(data.entries[0].puzzle.attempts).toBe(2)
  expect(data.entries[0].helpedSuccess).toBe(0)
  expect(data.entries[0].timeline.filter(item => !('event' in item))).toHaveLength(1)
  html = renderToString(<AdminPage data={data} onHome={noop} />)
  expect(html).toContain(t('admin.compacted'))
  expect(html).toContain('2026')
})
it('opens from home information tools and navigates back without adding learning activity', () => {
  const app = new AppController()
  const html = renderToString(<HomePage progress={app.progress} onAdmin={app.admin} onStart={noop} onContinue={noop} onList={noop} />)
  expect(html.indexOf('admin-entry')).toBeLessThan(html.indexOf('<h1'))
  const before = app.repository.getHistory()
  app.admin(); expect(app.getSnapshot()).toEqual({ page: 'admin' })
  app.home(); expect(app.getSnapshot()).toEqual({ page: 'home' })
  expect(app.repository.getHistory()).toEqual(before)
})
it('estimates activity minutes separately from playback and reports latest retained activity', () => {
  const { app, add } = fixture()
  add({ type: 'timeSegment', data: { startMs: 0, endMs: 60000, lastInputMs: 0, visible: true, mode: 'activity' } })
  add({ type: 'timeSegment', data: { startMs: 60000, endMs: 180000, lastInputMs: 60000, visible: true, mode: 'playback' } })
  expect(app.adminData.units[0].minutes).toBe(1)
  expect(app.adminData.lastActivity).toBe('2026-11-28T00:00:01.000Z')
  expect(render(app)).toContain(t('admin.minuteValue', { count: 1 }))
})

it('shows hint-only puzzles, merges consecutive edits across time segments, and separates dates and visits', () => {
  const { app, add, attempt, nextVisit } = fixture()
  add({ type: 'hintShown', data: { step: 2, first: true } })
  add({ type: 'codeChanged', data: { revision: 1, changes: 2, counts: {}, changed: true } })
  add({ type: 'timeSegment', data: { startMs: 0, endMs: 3000, lastInputMs: 0, visible: true, mode: 'activity' } })
  add({ type: 'codeChanged', data: { revision: 2, changes: 3, counts: {}, changed: true } })
  nextVisit()
  add({ type: 'codeChanged', data: { revision: 3, changes: 1, counts: {}, changed: true } })
  attempt('stopped', 'success', true)
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = render(app)
    expect(html).toContain(t('admin.codeChanges', { count: 5 }))
    expect(html).toContain(t('admin.codeChanges', { count: 1 }))
    expect(html).toContain(`${t('admin.events.attemptStarted')} → ${t('admin.events.executionInterrupted')}`)
    expect(html).not.toContain(t('admin.events.timeSegment'))
    expect(html.match(/<h4>/g)).toHaveLength(1)
    expect(html.match(/<th scope="row">/g)).toHaveLength(13 + app.adminData.challengeEntries.length)
    expect(html).toContain('admin-help-cards')
    expect(html).toContain('<dt>')
    expect(html).toContain('<dd>')
  }
  add({ type: 'visitEnded', data: { reason: 'leave' } })
  const data = app.adminData
  const item = data.entries[0].timeline.at(-1)!
  if ('event' in item) item.event.recordedAt = '2026-11-29T00:00:00.000Z'
  expect(renderToString(<AdminPage data={data} onHome={noop} />).match(/<h4>/g)).toHaveLength(2)
})

it('shows only registered challenge puzzles in both table and cards, following registry additions and removals', () => {
  const app = new AppController()
  const original = challenges.slice()
  const check = () => {
    const data = app.adminData
    const expected = allStages.filter(stage => !stage.id.startsWith('b') && challenges.some(c => c.stageId === stage.id))
    expect(data.challengeEntries.map(e => e.stage.id)).toEqual(expected.map(stage => stage.id))
    expect(data.entries).toHaveLength(45)
    expect(data.total).toBe(45)
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      const section = render(app).split('<section aria-labelledby="admin-challenges">')[1].split('</section>')[0]
      expect(section.match(/<th scope="row">/g) ?? []).toHaveLength(expected.length)
      expect(section.match(/<article>/g) ?? []).toHaveLength(expected.length)
      expect(section).toContain('admin-challenges-cards')
      for (const stage of allStages.filter(stage => !stage.id.startsWith('b'))) {
        expect(section.includes(stageLabel(stage))).toBe(expected.some(e => e.id === stage.id))
      }
      for (const entry of data.challengeEntries) {
        expect(entry.challenges).toEqual([])
        expect(section).toContain(`<td>${t('admin.none')}</td>`)
      }
    }
  }
  try {
    check()
    challenges.push({ stageId: '1', id: 'admin-test', kind: 'shorter', ruleVersion: 1, params: { maxBlocks: 3 } })
    check()
    challenges.push({ ...challenges[0], id: 'second-challenge' })
    check()
    challenges.splice(0, challenges.length)
    check()
  } finally {
    challenges.splice(0, challenges.length, ...original)
  }
})

it('shows factory activity separately with viewed block types and adult error explanations', () => {
  const app = new AppController()
  const base = { visitId: 'factory-visit', activityKind: 'project' as const, activityId: 'factory-project', unit: 0, recordedAt: '2026-11-28T00:00:00.000Z', elapsedMs: 0, appVersion: '1', contentVersion: '1', evaluationVersion: '1' }
  app.repository.appendHistory({ ...base, type: 'projectCreated', data: {} })
  app.repository.appendHistory({ ...base, type: 'projectRunStarted', data: {} })
  app.repository.appendHistory({ ...base, type: 'projectRunEnded', data: { outcome: 'error', error: 'beltEmpty', executed: ['takeBelt'] } })
  app.repository.appendHistory({ ...base, type: 'projectDeleted', data: {} })
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = render(app)
    expect(html).toContain(t('factory.activityTitle'))
    expect(html).toContain(t('factory.deletedProject'))
    expect(html).toContain(t('factory.takeBelt'))
    expect(html).toContain(t('factory.adultErrors.beltEmpty'))
    expect(html).toContain('factory-activity-cards')
    expect(app.adminData.completed).toBe(0)
    expect(app.adminData.entries.some(e => e.attention)).toBe(false)
  }
})
