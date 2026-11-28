import type { BlockType, RunResult } from './types'

export type ActivityKind = 'puzzle' | 'bonus' | 'prediction' | 'demo'
export type HistoryResult = RunResult['result']
export const historyResults: HistoryResult[] = ['success', 'collision', 'unfinished', 'stepLimit', 'variableRange', 'missingReturn', 'indexRange', 'comparisonLimit']
export const blockTypes: BlockType[] = ['forward', 'turnLeft', 'turnRight', 'repeat', 'if', 'while', 'call', 'set', 'change', 'return', 'on', 'forEach', 'breakForEach']
export type HistoryPayloads = {
  visitStarted: Record<string, never>
  visitEnded: { reason: 'leave' | 'hidden' | 'reload' | 'unknown' }
  attemptStarted: { revision: number; mode: 'auto' | 'step'; changed: boolean; previousAttemptId?: string }
  executionCalculated: { result: HistoryResult; variants: HistoryResult[]; failedVariant: number | null; cause?: BlockType; path?: number[]; callId?: string }
  resultReached: Record<string, never>
  executionInterrupted: { reason: 'reset' | 'rerun' | 'leave' | 'hidden' }
  codeChanged: { revision: number; changes: number; counts: Partial<Record<BlockType, number>>; changed: boolean }
  fixRequested: { previousAttemptId: string; source: 'button' | 'edit' }
  undo: { revision: number }
  hintShown: { step: 1 | 2; first: boolean }
  demoStarted: { demoId: string }
  demoEnded: { demoId: string; reachedEnd: boolean }
  completionConfirmed: { first: boolean; stars: number }
  reviewChanged: { selected: boolean }
  // Non-overlapping intervals since the preceding time segment. No per-click log.
  timeSegment: { startMs: number; endMs: number; lastInputMs: number; visible: boolean; mode: 'activity' | 'playback' | 'demo' }
}
export type HistoryEnvelope = {
  id: string; sequence: number; learnerId: string; deviceId: string; visitId: string; attemptId?: string
  activityKind: ActivityKind; activityId: string; unit: number; recordedAt: string; elapsedMs: number
  appVersion: string; contentVersion: string; evaluationVersion: string
}
export type HistoryEvent = { [K in keyof HistoryPayloads]: HistoryEnvelope & { type: K; data: HistoryPayloads[K] } }[keyof HistoryPayloads]
export type HistoryEventInput = HistoryEvent extends infer E ? E extends HistoryEvent ? Omit<E, 'id' | 'sequence' | 'learnerId' | 'deviceId'> : never : never
export type PuzzleHistorySummary = {
  activityKind: ActivityKind; activityId: string; unit: number; attempts: number; completions: number
  failures: Partial<Record<HistoryResult, number>>; hint1Attempts: number; hint2Attempts: number; demoUses: number; demoEnds: number
  activityMs: number; playbackMs: number; demoMs: number; inactiveMs: number
  recentResults: HistoryResult[]; recentSequences: number[]; reviewSelected: boolean; reviewSequence: number
}
export type HistoryRollup = { visitId: string; from: string; to: string; throughSequence: number; summary: PuzzleHistorySummary }
export type HistoryDocument = { version: 1; nextSequence: number; events: HistoryEvent[]; rollups: HistoryRollup[]; incomplete: boolean; compactedAt: string | null }
export const emptyHistory = (): HistoryDocument => ({ version: 1, nextSequence: 1, events: [], rollups: [], incomplete: false, compactedAt: null })
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const token = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128 && /^[\w.:-]+$/.test(v)
export const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v))
const result = (v: unknown) => historyResults.includes(v as HistoryResult)
const schemas: Record<keyof HistoryPayloads, Record<string, (v: unknown) => boolean>> = {
  visitStarted: {}, visitEnded: { reason: v => ['leave', 'hidden', 'reload', 'unknown'].includes(v as string) },
  attemptStarted: { revision: integer, mode: v => v === 'auto' || v === 'step', changed: v => typeof v === 'boolean', 'previousAttemptId?': token },
  executionCalculated: { result, variants: v => Array.isArray(v) && v.length > 0 && v.length <= 128 && v.every(result), failedVariant: v => v === null || integer(v), 'cause?': v => blockTypes.includes(v as BlockType), 'path?': v => Array.isArray(v) && v.length <= 20 && v.every(n => integer(n) || n === -1), 'callId?': token },
  resultReached: {}, executionInterrupted: { reason: v => ['reset', 'rerun', 'leave', 'hidden'].includes(v as string) },
  codeChanged: { revision: integer, changes: integer, changed: v => typeof v === 'boolean', counts: v => isRecord(v) && Object.entries(v).every(([k, n]) => blockTypes.includes(k as BlockType) && integer(n)) },
  fixRequested: { previousAttemptId: token, source: v => v === 'button' || v === 'edit' }, undo: { revision: integer },
  hintShown: { step: v => v === 1 || v === 2, first: v => typeof v === 'boolean' },
  demoStarted: { demoId: token }, demoEnded: { demoId: token, reachedEnd: v => typeof v === 'boolean' },
  completionConfirmed: { first: v => typeof v === 'boolean', stars: v => integer(v) && v >= 1 && v <= 3 },
  reviewChanged: { selected: v => typeof v === 'boolean' },
  timeSegment: { startMs: integer, endMs: integer, lastInputMs: integer, visible: v => typeof v === 'boolean', mode: v => ['activity', 'playback', 'demo'].includes(v as string) },
}
export function validHistoryEvent(v: unknown): v is HistoryEvent {
  if (!isRecord(v) || !isRecord(v.data) || !Object.hasOwn(schemas, String(v.type))) return false
  const required = ['id', 'learnerId', 'deviceId', 'visitId', 'activityId', 'appVersion', 'contentVersion', 'evaluationVersion']
  if (!required.every(k => token(v[k])) || !integer(v.sequence) || v.sequence < 1 || !integer(v.unit) || v.unit > 12 || !integer(v.elapsedMs) || !validDate(v.recordedAt)) return false
  if (!['puzzle', 'bonus', 'prediction', 'demo'].includes(v.activityKind as string) || (v.attemptId !== undefined && !token(v.attemptId))) return false
  const allowed = [...required, 'sequence', 'unit', 'elapsedMs', 'recordedAt', 'activityKind', 'attemptId', 'type', 'data']
  if (Object.keys(v).some(k => !allowed.includes(k))) return false
  const data = v.data
  const schema = schemas[v.type as keyof HistoryPayloads]
  if (Object.keys(v.data).some(k => !Object.hasOwn(schema, k) && !Object.hasOwn(schema, `${k}?`))) return false
  if (!Object.entries(schema).every(([key, check]) => key.endsWith('?') ? data[key.slice(0, -1)] === undefined || check(data[key.slice(0, -1)]) : check(data[key]))) return false
  if (['attemptStarted', 'executionCalculated', 'resultReached', 'executionInterrupted', 'completionConfirmed'].includes(v.type as string) && !token(v.attemptId)) return false
  if (v.type === 'timeSegment' && ((v.data.endMs as number) < (v.data.startMs as number) || (v.data.endMs as number) > v.elapsedMs || (v.data.lastInputMs as number) > (v.data.endMs as number))) return false
  if (v.type === 'executionCalculated') {
    const variants = v.data.variants as HistoryResult[]
    const failed = variants.findIndex(r => r !== 'success')
    if (v.data.failedVariant !== (failed < 0 ? null : failed) || v.data.result !== (failed < 0 ? 'success' : variants[failed])) return false
  }
  return true
}
