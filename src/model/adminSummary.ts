import { earnedChallenges, stageChallenges } from './challenges'
import type { Progress } from './ProgressRepository'
import type { Stage } from './types'
import type { HistoryDocument, HistoryEvent } from './history'
import { summarizeHistory, summaryKey } from './historySummary'

// Outcomes involving help require retained visit context; rollups do not store that link.
export function adminSummary(history: HistoryDocument, progress: Progress, stages: Stage[], provenance: { historyStartedAt: string; pastDetailsUnavailable: boolean }) {
  const summary = summarizeHistory(history, progress, stages, provenance)
  const covered = new Set(history.rollups.map(r => r.visitId))
  const events = history.events.filter(e => !covered.has(e.visitId)).sort((a, b) => a.sequence - b.sequence)
  const entries = stages.filter(s => !s.id.startsWith('b')).map(stage => {
    const puzzle = summary.puzzles[summaryKey('puzzle', stage.id)]
    const detail = events.filter(e => e.activityKind === 'puzzle' && e.activityId === stage.id)
    let helpedSuccess = 0, independentSuccess = 0, helpedAttempts = 0
    for (const event of detail) {
      if (event.type !== 'attemptStarted' || event.data.purpose === 'challenge') continue
      const help = detail.filter(e => e.sequence < event.sequence && (e.type === 'hintShown' || e.type === 'demoStarted'))
      const helped = help.some(e => e.visitId === event.visitId)
      if (helped) helpedAttempts++
      const result = detail.find(e => e.visitId === event.visitId && e.type === 'executionCalculated' && e.attemptId === event.attemptId && e.sequence > event.sequence)
      const terminal = detail.find(e => e.visitId === event.visitId && (e.type === 'resultReached' || e.type === 'executionInterrupted') && e.attemptId === event.attemptId && e.sequence > event.sequence)
      if (result?.type === 'executionCalculated' && result.data.result === 'success' && terminal?.type === 'resultReached') {
        if (helped) helpedSuccess++
        else if (help.some(e => e.visitId !== event.visitId)) independentSuccess++
      }
    }
    const repeated = [...new Set(puzzle.recentResults.filter(r => r !== 'success' && puzzle.recentResults.filter(other => other === r).length >= 2))]
    const helpedUnfinished = !puzzle.completed && (puzzle.hint1Attempts > 0 || puzzle.hint2Attempts > 0 || puzzle.demoUses > 0 || detail.some(e => e.type === 'hintShown'))
    const compacted = history.rollups.filter(r => r.summary.activityKind === 'puzzle' && r.summary.activityId === stage.id).map(r => ({ from: r.from, to: r.to, sequence: r.throughSequence }))
    const timeline: ({ sequence: number; event: HistoryEvent } | { sequence: number; from: string; to: string })[] = [
      ...detail.map(event => ({ sequence: event.sequence, event })), ...compacted,
    ].sort((a, b) => a.sequence - b.sequence)
    return { stage, puzzle, challenges: earnedChallenges(stage.id, progress.stages[stage.id]?.challenges), legacyStars: progress.stages[stage.id]?.bestStars ?? 0, repeated, helpedUnfinished, helpedAttempts, helpedSuccess, independentSuccess, timeline,
      attention: puzzle.needsAttention || repeated.length > 0 || helpedUnfinished }
  })
  const dates = [...events.map(e => e.recordedAt), ...history.rollups.map(r => r.to)].sort()
  return { ...summary, entries, challengeEntries: entries.filter(e => stageChallenges(e.stage.id).length > 0), completed: entries.filter(e => e.puzzle.completed).length, total: entries.length,
    lastActivity: dates.at(-1) ?? null,
    units: Array.from({ length: 12 }, (_, i) => {
      const unit = i + 1, rows = entries.filter(e => e.puzzle.unit === unit)
      return { unit, completed: rows.filter(e => e.puzzle.completed).length, total: rows.length,
        active: rows.filter(e => !e.puzzle.completed && (e.puzzle.attempts > 0 || e.timeline.length > 0)),
        minutes: Math.round(rows.reduce((sum, e) => sum + e.puzzle.activityMs, 0) / 60000) }
    }) }
}
