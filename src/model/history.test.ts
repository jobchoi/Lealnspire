import { expect, it } from 'vitest'
import { ProgressRepository, historyKey, progressKey, progressV2Key, progressV4Key, settingsKey } from './ProgressRepository'
import { emptyHistory, validHistoryEvent } from './history'
import type { HistoryEventInput, HistoryResult } from './history'
import { compactHistory, historyLimits, parseHistory, summarizeHistory } from './historySummary'
import { stages } from './stages'

const date = '2026-11-28T00:00:00.000Z'
function storage() {
  const values = new Map<string, string>()
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) } }
}
const options = { now: () => date, createId: () => 'anonymous-1' }
const envelope = { visitId: 'v1', activityKind: 'puzzle' as const, activityId: '1', unit: 1, recordedAt: date, elapsedMs: 0, appVersion: '1.20.0', contentVersion: '1', evaluationVersion: '1' }
function flow(results: HistoryResult[] = ['collision', 'unfinished', 'stepLimit'], visitId = 'v1') {
  const repo = new ProgressRepository(undefined, options)
  const add = (e: HistoryEventInput) => { expect(repo.appendHistory(e)).toBe(true) }
  const base = { ...envelope, visitId }
  add({ ...base, type: 'visitStarted', data: {} })
  results.forEach((result, i) => {
    const attemptId = `a${i}`
    add({ ...base, attemptId, type: 'attemptStarted', data: { revision: i, mode: 'auto', changed: true } })
    add({ ...base, attemptId, type: 'executionCalculated', data: { result, variants: [result], failedVariant: result === 'success' ? null : 0, cause: 'forward' } })
    add({ ...base, attemptId, type: 'resultReached', data: {} })
  })
  add({ ...base, type: 'visitEnded', data: { reason: 'leave' } })
  return repo.getHistory()
}
const summarize = (h: ReturnType<typeof emptyHistory>) => summarizeHistory(h, { version: 1, stages: {} }, stages).puzzles['puzzle:1']
it('migrates v1 and v2 achievements and code, preserves originals and restores anonymous identity', () => {
  for (const version of [1, 2]) {
    const s = storage(), key = version === 1 ? progressKey : progressV2Key
    const code = [{ id: 'f', type: 'forward' }]
    const raw = JSON.stringify({ version, stages: { '1': { completed: true, bestStars: 2, lastProgram: version === 1 ? code : { main: code, functions: [] } } } })
    s.setItem(key, raw)
    const repo = new ProgressRepository(s, options)
    expect(repo.getProgress().stages['1']).toMatchObject({ completed: true, bestStars: 2, lastProgram: code })
    expect(repo.getProgressDocument()).toMatchObject({ version: 4, learnerId: 'anonymous-1', historyStartedAt: date, pastDetailsUnavailable: true })
    expect(repo.getHistory().events).toEqual([])
    repo.saveProgram('2', [])
    expect(s.getItem(key)).toBe(raw)
    expect(new ProgressRepository(s).getProgressDocument().learnerId).toBe('anonymous-1')
  }
})
it('isolates corrupted events and documents from completion and rejects unknown/private fields', () => {
  const s = storage(), repo = new ProgressRepository(s, options)
  repo.completeStage('1', 3, [])
  const h = flow(['success'])
  const bad = { ...h.events[0], name: 'private' }
  s.setItem(historyKey, JSON.stringify({ ...h, events: [h.events[0], bad, { ...bad, id: 'other', sequence: 90, name: undefined, data: { photo: 'x' } }, ...h.events.slice(1)] }))
  const restored = new ProgressRepository(s, options)
  expect(restored.getProgress().stages['1'].completed).toBe(true)
  expect(restored.getHistory().events).toHaveLength(h.events.length)
  expect(restored.getHistory().incomplete).toBe(true)
  expect(restored.appendHistory({ ...envelope, type: 'visitStarted', data: {}, name: 'x' } as HistoryEventInput)).toBe(false)
  s.setItem(historyKey, '{')
  expect(new ProgressRepository(s).getProgress().stages['1'].completed).toBe(true)
  expect(new ProgressRepository(s).getHistory().incomplete).toBe(true)
})
it('never overwrites future versions, including after edits and completions', () => {
  for (const key of [progressV4Key, historyKey, progressV2Key, progressKey]) {
    const s = storage(), raw = '{"version":99,"stages":{}}'
    s.setItem(key, raw)
    const repo = new ProgressRepository(s, options)
    repo.saveProgram('1', []); repo.completeStage('1', 3, [])
    repo.appendHistory({ ...envelope, type: 'visitStarted', data: {} })
    expect(s.getItem(key)).toBe(raw)
    expect(repo.persistent).toBe(false)
  }
})
it('counts hints per attempt, success after failures, interruptions excluded and progress authoritative', () => {
  const h = flow()
  expect(summarize(h)).toMatchObject({ attempts: 3, needsAttention: true, failures: { collision: 1, unfinished: 1, stepLimit: 1 } })
  h.events.pop()
  const repo = new ProgressRepository(storage(), options)
  const s = storage(); s.setItem(historyKey, JSON.stringify(h))
  const r = new ProgressRepository(s, options)
  const add = (event: HistoryEventInput) => expect(r.appendHistory(event)).toBe(true)
  for (const step of [1, 1, 2] as const) add({ ...envelope, type: 'hintShown', data: { step, first: step !== 1 } })
  for (const attemptId of ['interrupted', 'success']) {
    add({ ...envelope, attemptId, type: 'attemptStarted', data: { revision: 4, mode: 'step', changed: true } })
    add({ ...envelope, attemptId, type: 'executionCalculated', data: { result: 'success', variants: ['success'], failedVariant: null } })
    add(attemptId === 'interrupted' ? { ...envelope, attemptId, type: 'executionInterrupted', data: { reason: 'leave' } } : { ...envelope, attemptId, type: 'resultReached', data: {} })
  }
  expect(summarize(r.getHistory())).toMatchObject({ attempts: 5, hint1Attempts: 2, hint2Attempts: 2, needsAttention: false, completions: 0 })
  repo.completeStage('1', 1, [])
  expect(summarizeHistory(r.getHistory(), repo.getProgress(), stages).units[1]).toEqual({ total: 8, completed: 1 })
})
it('splits visible activity at 60 seconds, excludes hidden time and separates playback and demos', () => {
  const repo = new ProgressRepository(undefined, options)
  const segments = [
    { startMs: 0, endMs: 120000, lastInputMs: 0, visible: true, mode: 'activity' },
    { startMs: 120000, endMs: 130000, lastInputMs: 0, visible: true, mode: 'playback' },
    { startMs: 130000, endMs: 140000, lastInputMs: 0, visible: true, mode: 'demo' },
    { startMs: 140000, endMs: 150000, lastInputMs: 0, visible: false, mode: 'activity' },
  ] as const
  for (const data of segments) expect(repo.appendHistory({ ...envelope, elapsedMs: data.endMs, type: 'timeSegment', data })).toBe(true)
  expect(summarize(repo.getHistory())).toMatchObject({ activityMs: 60000, inactiveMs: 70000, playbackMs: 10000, demoMs: 10000 })
})
it.each(['days', 'attempts', 'events', 'bytes'] as const)('compacts closed visits at %s limit without changing aggregate totals or double counting', limit => {
  const h = flow(['collision', 'success'])
  const limits = { ...historyLimits, [limit]: limit === 'days' ? 0 : 1 }
  const compacted = compactHistory(h, '2026-11-29T00:00:00.000Z', 0, false, limits)
  expect(compacted.events).toHaveLength(0)
  expect(compacted.rollups).toHaveLength(1)
  expect(summarize(compacted)).toEqual(summarize(h))
  expect(summarize({ ...compacted, events: h.events })).toEqual(summarize(h))
  expect(parseHistory(JSON.stringify(compacted)).rollups).toEqual(compacted.rollups)
  expect(compactHistory(compacted, date, 0, true)).toEqual(compacted)
})
it('retains active visits and rolls oldest closed visits first', () => {
  const a = flow(['collision']), b = flow(['success'], 'v2')
  const shift = a.nextSequence
  b.events = b.events.map(e => ({ ...e, sequence: e.sequence + shift, id: `b-${e.id}` }))
  const h = { ...a, events: [...a.events, ...b.events.slice(0, -1)], nextSequence: shift + b.nextSequence }
  const compacted = compactHistory(h, date, 0, false, { ...historyLimits, events: 1 })
  expect(compacted.rollups.map(r => r.visitId)).toEqual(['v1'])
  expect(compacted.events.every(e => e.visitId === 'v2')).toBe(true)
  expect(summarize(compacted)).toEqual(summarize(h))
})
it('retries quota failure once with additional compaction, and preserves memory on persistent failure', () => {
  const s = storage(); s.setItem(historyKey, JSON.stringify(flow()))
  let writes = 0
  const repo = new ProgressRepository({ ...s, setItem(k, v) { writes++; if (writes === 1) throw Error('QuotaExceededError'); s.setItem(k, v) } }, options)
  repo.saveProgram('1', [])
  expect(writes).toBe(3)
  expect(repo.persistent).toBe(true)
  expect(repo.getHistory().events).toHaveLength(0)
  expect(summarize(repo.getHistory()).attempts).toBe(3)
  let failures = 0
  const blocked = new ProgressRepository({ ...s, setItem() { failures++; throw Error('denied') } }, options)
  blocked.completeStage('2', 2, [])
  expect(failures).toBe(2)
  expect(blocked.persistent).toBe(false)
  expect(blocked.getProgress().stages['2'].completed).toBe(true)
})
it('deletes all four learning keys, preserves settings and preserves memory on deletion failure', () => {
  const s = storage()
  for (const k of [progressKey, progressV2Key]) s.setItem(k, '{"version":1,"stages":{}}')
  const repo = new ProgressRepository(s, options)
  repo.saveLanguage('en'); repo.completeStage('1', 3, [])
  expect(repo.clear()).toBe(true)
  for (const k of [progressKey, progressV2Key, progressV4Key, historyKey]) expect(s.getItem(k)).toBeNull()
  expect(JSON.parse(s.getItem(settingsKey)!).lang).toBe('en')
  expect(repo.getHistory()).toEqual(emptyHistory())
  const failed = new ProgressRepository({ ...s, removeItem() { throw Error('denied') } }, options)
  failed.completeStage('1', 3, [])
  expect(failed.clear()).toBe(false)
  expect(failed.getProgress().stages['1'].completed).toBe(true)
})
it('rejects malformed payloads, duplicates and post-compaction late events', () => {
  const h = flow()
  const event = h.events.find(e => e.type === 'executionCalculated')!
  for (const data of [{ result: 'unknown' }, { ...event.data, failedVariant: 50 }, { ...event.data, cause: 'private' }]) expect(validHistoryEvent({ ...event, data })).toBe(false)
  expect(parseHistory(JSON.stringify({ ...h, events: [...h.events, h.events[0]] })).events).toHaveLength(h.events.length)
  const s = storage(); s.setItem(historyKey, JSON.stringify(compactHistory(h, date, 0, true)))
  const repo = new ProgressRepository(s, options)
  expect(repo.appendHistory({ ...envelope, type: 'visitStarted', data: {} })).toBe(false)
})
it('enforces the default 2000-attempt and 10000-event limits at exact boundaries', () => {
  for (const [type, count] of [['attemptStarted', 2000], ['codeChanged', 10000]] as const) {
    const first = flow(['success']).events[0]
    const events = Array.from({ length: count }, (_, i) => ({ ...first, id: `event-${i}`, sequence: i + 1, attemptId: `attempt-${i}`, type, data: type === 'attemptStarted' ? { revision: i, changed: true, mode: 'auto' } : { revision: i, changes: 1, changed: true, counts: {} } })) as HistoryEventInput[]
    const h = { ...emptyHistory(), events: events as ReturnType<typeof flow>['events'], nextSequence: count + 1 }
    expect(compactHistory(h, date).events).toHaveLength(count)
    const ended = { ...first, id: 'end', sequence: count + 2, type: 'visitEnded', data: { reason: 'leave' } } as ReturnType<typeof flow>['events'][number]
    const extra = { ...h.events[0], id: 'extra', attemptId: 'extra-attempt', sequence: count + 1 }
    const compacted = compactHistory({ ...h, events: [...h.events, extra, ended] }, date)
    expect(compacted.events).toHaveLength(0)
    expect(compacted.rollups[0].summary.attempts).toBe(type === 'attemptStarted' ? 2001 : 0)
  }
})
it('includes preserved original keys in the 2 MiB app budget without dropping last code', () => {
  const s = storage()
  s.setItem(progressKey, ' '.repeat(historyLimits.bytes / 2))
  const repo = new ProgressRepository(s, options)
  repo.completeStage('1', 3, [])
  expect(repo.persistent).toBe(false)
  expect(repo.getProgress().stages['1'].completed).toBe(true)
  expect(s.getItem(progressKey)).toHaveLength(historyLimits.bytes / 2)
})
it('keeps recent completed results ordered across overlapping visits before and after compaction', () => {
  const a = flow(['collision', 'unfinished', 'stepLimit'])
  const b = flow(['success'], 'v2')
  // Visit 2 completes before the older visit ends; chronology uses terminal sequences.
  a.events = a.events.map(e => ({ ...e, sequence: e.sequence * 10 }))
  b.events = b.events.map((e, i) => ({ ...e, sequence: i + 75, id: `b-${e.id}` }))
  const h = { ...a, events: [...a.events, ...b.events].sort((a, b) => a.sequence - b.sequence) }
  expect(summarize(h).needsAttention).toBe(false)
  expect(summarize(compactHistory(h, date, 0, true))).toEqual(summarize(h))
})
it('exposes migrated completion without inventing attempts and keeps bonus/demo/prediction separate', () => {
  const progress = { version: 1 as const, stages: { '1': { completed: true, bestStars: 3, lastProgram: [] } } }
  const summary = summarizeHistory(emptyHistory(), progress, stages, { historyStartedAt: date, pastDetailsUnavailable: true })
  expect(summary.puzzles['puzzle:1']).toMatchObject({ completed: true, attempts: 0, needsAttention: false })
  expect(summary.pastDetailsUnavailable).toBe(true)
  expect(summary.detailFrom).toBeNull()
  const repo = new ProgressRepository(undefined, options)
  expect(repo.appendHistory({ ...envelope, type: 'demoStarted', data: { demoId: 'repeat' } })).toBe(true)
  expect(repo.appendHistory({ ...envelope, type: 'demoEnded', data: { demoId: 'repeat', reachedEnd: true } })).toBe(true)
  expect(repo.appendHistory({ ...envelope, type: 'reviewChanged', data: { selected: true } })).toBe(true)
  expect(repo.appendHistory({ ...envelope, type: 'reviewChanged', data: { selected: false } })).toBe(true)
  expect(repo.appendHistory({ ...envelope, visitId: 'prediction', activityKind: 'prediction', attemptId: 'prediction1', type: 'attemptStarted', data: { revision: 0, mode: 'auto', changed: false } })).toBe(true)
  expect(summarize(repo.getHistory())).toMatchObject({ attempts: 0, demoUses: 1, demoEnds: 1, reviewSelected: false })
  expect(summarizeHistory(repo.getHistory(), progress, stages).puzzles['prediction:1'].attempts).toBe(1)
  const folded = compactHistory({ ...repo.getHistory(), events: [...repo.getHistory().events, { ...flow().events.at(-1)!, sequence: 100 }] }, date, 0, true)
  expect(summarize(folded)).toEqual(summarize(repo.getHistory()))
})
it('counts only explicit completion confirmations and keeps copies owned by the repository', () => {
  const repo = new ProgressRepository(undefined, options)
  expect(repo.appendHistory({ ...envelope, attemptId: 'a', type: 'attemptStarted', data: { revision: 0, mode: 'auto', changed: false } })).toBe(true)
  expect(repo.appendHistory({ ...envelope, attemptId: 'a', type: 'executionCalculated', data: { result: 'success', variants: ['success', 'success'], failedVariant: null } })).toBe(true)
  expect(summarize(repo.getHistory()).completions).toBe(0)
  expect(repo.appendHistory({ ...envelope, attemptId: 'a', type: 'resultReached', data: {} })).toBe(true)
  expect(repo.appendHistory({ ...envelope, attemptId: 'a', type: 'completionConfirmed', data: { first: true, stars: 3 } })).toBe(true)
  const h = repo.getHistory(); h.events.length = 0
  expect(summarize(repo.getHistory()).completions).toBe(1)
  expect(repo.getProgress().stages['1']).toBeUndefined()
})
it('preserves progress when only history reads fail or v3 metadata is damaged', () => {
  const s = storage(), repo = new ProgressRepository(s, options)
  repo.completeStage('1', 2, [{ id: 'f', type: 'forward' }])
  const brokenHistory = new ProgressRepository({ ...s, getItem(k) { if (k === historyKey) throw Error('denied'); return s.getItem(k) } }, options)
  expect(brokenHistory.getProgress().stages['1']).toMatchObject(repo.getProgress().stages['1'])
  expect(brokenHistory.getHistory().incomplete).toBe(true)
  expect(brokenHistory.persistent).toBe(false)
  const v3 = JSON.parse(s.getItem(progressV4Key)!); v3.learnerId = null; v3.historyStartedAt = 'invalid'
  s.setItem(progressV4Key, JSON.stringify(v3))
  const restored = new ProgressRepository(s, options)
  expect(restored.getProgress().stages['1']).toMatchObject(repo.getProgress().stages['1'])
  expect(restored.getHistory().incomplete).toBe(true)
})
it('applies the 90-day retention window on restore without waiting for a new event', () => {
  const s = storage(), repo = new ProgressRepository(s, options)
  repo.saveProgram('1', [])
  const h = flow(['success'])
  const old = '2026-08-29T00:00:00.000Z'
  s.setItem(historyKey, JSON.stringify({ ...h, events: h.events.map(e => ({ ...e, recordedAt: old })) }))
  const restored = new ProgressRepository(s, options)
  expect(restored.getHistory().events).toHaveLength(0)
  expect(restored.getHistory().rollups).toHaveLength(1)
  expect(summarize(restored.getHistory()).attempts).toBe(1)
  expect(JSON.parse(s.getItem(historyKey)!).events).toHaveLength(0)
})
it('keeps over-budget legacy migration in memory without recursive identity persistence', () => {
  const s = storage()
  const raw = JSON.stringify({ version: 1, stages: { '1': { completed: true, bestStars: 2, lastProgram: [] } } }) + ' '.repeat(historyLimits.bytes)
  s.setItem(progressKey, raw)
  const repo = new ProgressRepository(s, options)
  expect(repo.getProgress().stages['1'].completed).toBe(true)
  expect(repo.persistent).toBe(false)
  expect(s.getItem(progressKey)).toBe(raw)
})
