import type { Progress } from './ProgressRepository'
import type { Stage } from './types'
import { emptyHistory, historyResults, isRecord, validDate, validHistoryEvent } from './history'
import type { ActivityKind, HistoryDocument, HistoryEvent, HistoryResult, PuzzleHistorySummary } from './history'

export const summaryKey = (kind: ActivityKind, id: string) => `${kind}:${id}`
export function emptySummary(activityKind: ActivityKind, activityId: string, unit: number): PuzzleHistorySummary {
  return { activityKind, activityId, unit, attempts: 0, completions: 0, failures: {}, hint1Attempts: 0, hint2Attempts: 0, demoUses: 0, demoEnds: 0, activityMs: 0, playbackMs: 0, demoMs: 0, inactiveMs: 0, recentResults: [], recentSequences: [], reviewSelected: false, reviewSequence: 0 }
}
export function mergeSummary(a: PuzzleHistorySummary, b: PuzzleHistorySummary): PuzzleHistorySummary {
  const recent = [...a.recentResults.map((result, i) => ({ result, sequence: a.recentSequences[i] })), ...b.recentResults.map((result, i) => ({ result, sequence: b.recentSequences[i] }))].sort((a, b) => a.sequence - b.sequence).slice(-3)
  const merged = { ...a, failures: { ...a.failures }, recentResults: recent.map(r => r.result), recentSequences: recent.map(r => r.sequence) }
  for (const key of ['attempts', 'completions', 'hint1Attempts', 'hint2Attempts', 'demoUses', 'demoEnds', 'activityMs', 'playbackMs', 'demoMs', 'inactiveMs'] as const) merged[key] += b[key]
  for (const key of historyResults) if (b.failures[key]) merged.failures[key] = (merged.failures[key] ?? 0) + b.failures[key]!
  if (b.reviewSequence > a.reviewSequence) { merged.reviewSequence = b.reviewSequence; merged.reviewSelected = b.reviewSelected }
  return merged
}
// One visit is the retention unit: hint context and attempt terminals never split.
export function summarizeVisit(events: HistoryEvent[]): PuzzleHistorySummary {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence)
  const first = sorted[0]
  const summary = emptySummary(first.activityKind, first.activityId, first.unit)
  const attempts = new Map<string, { result?: HistoryResult; terminal?: 'reached' | 'interrupted'; sequence?: number }>()
  const hints = new Set<number>()
  let timeThrough = 0
  for (const event of sorted) {
    switch (event.type) {
      case 'hintShown': hints.add(event.data.step); break
      case 'attemptStarted':
        if (!attempts.has(event.attemptId!)) {
          attempts.set(event.attemptId!, {}); summary.attempts++
          if (hints.has(1)) summary.hint1Attempts++
          if (hints.has(2)) summary.hint2Attempts++
        }
        break
      case 'executionCalculated': { const a = attempts.get(event.attemptId!); if (a && !a.result) a.result = event.data.result; break }
      case 'resultReached': { const a = attempts.get(event.attemptId!); if (a && !a.terminal) { a.terminal = 'reached'; a.sequence = event.sequence }; break }
      case 'executionInterrupted': { const a = attempts.get(event.attemptId!); if (a && !a.terminal) a.terminal = 'interrupted'; break }
      case 'completionConfirmed': summary.completions++; break
      case 'demoStarted': summary.demoUses++; break
      case 'demoEnded': if (event.data.reachedEnd) summary.demoEnds++; break
      case 'reviewChanged': summary.reviewSelected = event.data.selected; summary.reviewSequence = event.sequence; break
      case 'timeSegment': {
        const d = event.data
        const start = Math.max(d.startMs, timeThrough)
        const duration = Math.max(0, d.endMs - start)
        timeThrough = Math.max(timeThrough, d.endMs)
        if (!d.visible) { summary.inactiveMs += duration; break }
        if (d.mode === 'playback') summary.playbackMs += duration
        else if (d.mode === 'demo') summary.demoMs += duration
        else {
          const active = Math.max(0, Math.min(d.endMs, d.lastInputMs + 60_000) - Math.max(start, d.lastInputMs))
          summary.activityMs += active; summary.inactiveMs += duration - active
        }
        break
      }
    }
  }
  for (const a of attempts.values()) if (a.terminal === 'reached' && a.result) {
    summary.recentResults.push(a.result); summary.recentSequences.push(a.sequence!)
    if (a.result !== 'success') summary.failures[a.result] = (summary.failures[a.result] ?? 0) + 1
  }
  const recent = summary.recentResults.map((result, i) => ({ result, sequence: summary.recentSequences[i] })).sort((a, b) => a.sequence - b.sequence).slice(-3)
  summary.recentResults = recent.map(r => r.result); summary.recentSequences = recent.map(r => r.sequence)
  return summary
}
export function historyVisits(events: HistoryEvent[]) {
  const visits = new Map<string, HistoryEvent[]>()
  for (const event of events) { const group = visits.get(event.visitId) ?? []; group.push(event); visits.set(event.visitId, group) }
  return visits
}
export function summarizeHistory(history: HistoryDocument, progress: Progress, stages: Pick<Stage, 'id'>[], provenance?: { historyStartedAt: string; pastDetailsUnavailable: boolean }) {
  const puzzles: Record<string, PuzzleHistorySummary & { completed?: boolean; needsAttention?: boolean }> = {}
  const add = (s: PuzzleHistorySummary) => { const key = summaryKey(s.activityKind, s.activityId); puzzles[key] = puzzles[key] ? mergeSummary(puzzles[key], s) : structuredClone(s) }
  // Order by the last sequence of each complete visit, including retained visits.
  const covered = new Set(history.rollups.map(r => r.visitId))
  const chunks = [...history.rollups.map(r => ({ sequence: r.throughSequence, summary: r.summary })),
    ...[...historyVisits(history.events).entries()].filter(([id]) => !covered.has(id)).map(([, events]) => ({ sequence: Math.max(...events.map(e => e.sequence)), summary: summarizeVisit(events) }))]
  chunks.sort((a, b) => a.sequence - b.sequence).forEach(c => add(c.summary))
  for (const stage of stages) {
    const kind = stage.id.startsWith('b') ? 'bonus' : 'puzzle'
    const unit = kind === 'bonus' ? 1 : Number(/^u(\d+)-/.exec(stage.id)?.[1] ?? 1)
    puzzles[summaryKey(kind, stage.id)] ??= emptySummary(kind, stage.id, unit)
  }
  for (const s of Object.values(puzzles)) { s.completed = s.activityKind === 'puzzle' || s.activityKind === 'bonus' ? progress.stages[s.activityId]?.completed === true : undefined; s.needsAttention = s.recentResults.length === 3 && s.recentResults.every(r => r !== 'success') }
  const units: Record<number, { completed: number; total: number }> = {}
  for (const stage of stages) {
    if (stage.id.startsWith('b')) continue
    const unit = Number(/^u(\d+)-/.exec(stage.id)?.[1] ?? 1)
    units[unit] ??= { completed: 0, total: 0 }; units[unit].total++
    if (progress.stages[stage.id]?.completed) units[unit].completed++
  }
  return { units, puzzles, historyStartedAt: provenance?.historyStartedAt ?? null, pastDetailsUnavailable: provenance?.pastDetailsUnavailable ?? false, detailFrom: history.events.length ? history.events.reduce((a, b) => a < b.recordedAt ? a : b.recordedAt, history.events[0].recordedAt) : null, compactedRanges: history.rollups.map(r => ({ from: r.from, to: r.to })), incomplete: history.incomplete }
}
function validSummary(v: unknown): v is PuzzleHistorySummary {
  if (!isRecord(v)) return false
  const base = emptySummary('puzzle', 'x', 1)
  if (Object.keys(v).length !== Object.keys(base).length || Object.keys(v).some(k => !Object.hasOwn(base, k))) return false
  return ['puzzle', 'bonus', 'prediction', 'demo'].includes(v.activityKind as string) && typeof v.activityId === 'string' && /^[\w.:-]{1,128}$/.test(v.activityId)
    && Number.isInteger(v.unit) && (v.unit as number) >= 0 && (v.unit as number) <= 12
    && Object.entries(base).filter(([, value]) => typeof value === 'number').every(([key]) => Number.isSafeInteger(v[key]) && (v[key] as number) >= 0)
    && typeof v.reviewSelected === 'boolean' && Array.isArray(v.recentResults) && v.recentResults.length <= 3 && v.recentResults.every(r => historyResults.includes(r))
    && Array.isArray(v.recentSequences) && v.recentSequences.length === v.recentResults.length && v.recentSequences.every(n => Number.isSafeInteger(n) && n > 0)
    && isRecord(v.failures) && Object.entries(v.failures).every(([k, n]) => k !== 'success' && historyResults.includes(k as HistoryResult) && Number.isSafeInteger(n) && (n as number) >= 0)
}
export function parseHistory(raw: string | null): HistoryDocument {
  const empty = emptyHistory()
  if (raw === null) return empty
  try {
    const v: unknown = JSON.parse(raw)
    if (!isRecord(v) || v.version !== 1 || !Array.isArray(v.events) || !Array.isArray(v.rollups)) return { ...empty, incomplete: true }
    const ids = new Set<string>(), sequences = new Set<number>(), visits = new Set<string>()
    const rollups = v.rollups.filter(r => {
      if (!isRecord(r) || Object.keys(r).some(k => !['visitId', 'from', 'to', 'throughSequence', 'summary'].includes(k)) || typeof r.visitId !== 'string' || !/^[\w.:-]{1,128}$/.test(r.visitId) || visits.has(r.visitId) || !validDate(r.from) || !validDate(r.to) || r.from > r.to || !Number.isSafeInteger(r.throughSequence) || (r.throughSequence as number) < 1 || !validSummary(r.summary)) return false
      visits.add(r.visitId); return true
    }) as HistoryDocument['rollups']
    const contexts = new Map<string, HistoryEvent>()
    const closed = new Set<string>()
    const candidates = [...v.events].sort((a, b) => (isRecord(a) && typeof a.sequence === 'number' ? a.sequence : 0) - (isRecord(b) && typeof b.sequence === 'number' ? b.sequence : 0))
    const events = candidates.filter(e => {
      if (!validHistoryEvent(e) || ids.has(e.id) || sequences.has(e.sequence) || visits.has(e.visitId)) return false
      const previous = contexts.get(e.visitId)
      if (closed.has(e.visitId) || previous && (e.activityKind !== previous.activityKind || e.activityId !== previous.activityId || e.unit !== previous.unit || e.learnerId !== previous.learnerId || e.deviceId !== previous.deviceId || e.elapsedMs < previous.elapsedMs)) return false
      contexts.set(e.visitId, e)
      if (e.type === 'visitEnded') closed.add(e.visitId)
      ids.add(e.id); sequences.add(e.sequence); return true
    }).sort((a, b) => a.sequence - b.sequence)
    const nextSequence = Math.max(1, ...events.map(e => e.sequence + 1), ...rollups.map(r => r.throughSequence + 1), Number.isSafeInteger(v.nextSequence) ? v.nextSequence as number : 1)
    return { version: 1, events, rollups, nextSequence, incomplete: v.incomplete === true || events.length !== v.events.length || rollups.length !== v.rollups.length, compactedAt: validDate(v.compactedAt) ? v.compactedAt : null }
  } catch { return { ...empty, incomplete: true } }
}
export const historyLimits = { days: 90, attempts: 2000, events: 10000, bytes: 2 * 1024 * 1024 }
export function compactHistory(input: HistoryDocument, now: string, otherBytes = 0, force = false, limits = historyLimits): HistoryDocument {
  const h = structuredClone(input)
  const visits = [...historyVisits(h.events).values()].filter(events => events.some(e => e.type === 'visitEnded')).sort((a, b) => Math.max(...a.map(e => e.sequence)) - Math.max(...b.map(e => e.sequence)))
  for (const events of visits) {
    const old = events.some(e => Date.parse(now) - Date.parse(e.recordedAt) > limits.days * 86400000)
    const over = h.events.length > limits.events || h.events.filter(e => e.type === 'attemptStarted').length > limits.attempts || JSON.stringify(h).length * 2 + otherBytes > limits.bytes
    if (!force && !old && !over) continue
    h.rollups.push({ visitId: events[0].visitId, from: events.reduce((a, e) => a < e.recordedAt ? a : e.recordedAt, events[0].recordedAt), to: events.reduce((a, e) => a > e.recordedAt ? a : e.recordedAt, events[0].recordedAt), throughSequence: Math.max(...events.map(e => e.sequence)), summary: summarizeVisit(events) })
    h.events = h.events.filter(e => e.visitId !== events[0].visitId); h.compactedAt = now
  }
  return h
}

// Learner-facing projection: progress is authoritative; optional activities stay separate.
export function learningSummary(history: HistoryDocument, progress: Progress, stages: Stage[], provenance?: { historyStartedAt: string; pastDetailsUnavailable: boolean }) {
  const regular = stages.filter(s => !s.id.startsWith('b'))
  const summary = summarizeHistory(history, progress, stages, provenance)
  const entries = stages.map(stage => {
    const puzzle = summary.puzzles[summaryKey(stage.id.startsWith('b') ? 'bonus' : 'puzzle', stage.id)]
    const events = history.events.filter(e => (e.activityKind === 'puzzle' || e.activityKind === 'bonus') && e.activityId === stage.id)
    const completions = events.filter(e => e.type === 'completionConfirmed')
    const completion = completions.at(-1)
    // Only explicit failure → edit/fix → successful completion evidence earns this sentence.
    const start = events.find(e => e.type === 'attemptStarted' && e.attemptId === completion?.attemptId)
    const fixed = !!completion && !!start && events.some(e => e.type === 'fixRequested' && e.sequence < start.sequence
      && events.some(c => c.type === 'codeChanged' && c.data.changed && c.sequence > e.sequence && c.sequence < start.sequence)
      && events.some(f => f.type === 'executionCalculated' && f.data.result !== 'success' && f.attemptId === e.data.previousAttemptId)
      && start.type === 'attemptStarted' && start.data.previousAttemptId === e.data.previousAttemptId)
    const rolled = history.rollups.filter(r => (r.summary.activityKind === 'puzzle' || r.summary.activityKind === 'bonus') && r.summary.activityId === stage.id)
    return { stage, index: stages.indexOf(stage), puzzle, fixed,
      completionSequence: Math.max(completion?.sequence ?? 0, ...rolled.filter(r => r.summary.completions > 0).map(r => r.throughSequence)),
      activitySequence: Math.max(0, ...events.filter(e => e.type !== 'reviewChanged' && e.type !== 'visitEnded').map(e => e.sequence), ...rolled.filter(r => r.summary.attempts > 0).map(r => r.throughSequence)) }
  })
  const recent = entries.filter(e => e.puzzle.completed && e.completionSequence > 0).sort((a,b) => b.completionSequence - a.completionSequence).slice(0,3)
  const selected = entries.filter(e => e.puzzle.reviewSelected).sort((a,b) => b.puzzle.reviewSequence - a.puzzle.reviewSequence)
  const unfinished = entries.filter(e => !e.puzzle.completed && e.activitySequence > 0 && !e.puzzle.reviewSelected && e.puzzle.reviewSequence === 0).sort((a,b) => b.activitySequence - a.activitySequence)
  return { ...summary, entries, recent, review: [...selected, ...unfinished].slice(0,3), completed: entries.filter(e => regular.includes(e.stage) && e.puzzle.completed).length }
}
