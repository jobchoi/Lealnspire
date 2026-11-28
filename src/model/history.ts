import type { BlockType, RunResult } from './types'

export type ActivityKind = 'puzzle' | 'bonus' | 'prediction' | 'demo' | 'project'
export type HistoryResult = RunResult['result']
export const historyResults: HistoryResult[] = ['success', 'collision', 'unfinished', 'stepLimit', 'variableRange', 'missingReturn', 'indexRange', 'comparisonLimit']
export const blockTypes: BlockType[] = ['forward', 'turnLeft', 'turnRight', 'repeat', 'if', 'while', 'call', 'set', 'change', 'return', 'on', 'forEach', 'breakForEach']
export const factoryBlockTypes = ['takeBelt', 'takePile', 'putPile', 'repeat', 'if', 'while', 'forEach', 'on', 'set', 'change', 'call', 'return', 'breakForEach'] as const
export const factoryErrors = ['heldOccupied', 'beltEmpty', 'pileEmpty', 'heldEmpty', 'pileFull', 'variableRange', 'missingReturn', 'indexRange', 'stepLimit'] as const
export type ProjectActivity = { projectId: string; created: number; opened: number; runs: number; saves: number; edited: boolean; revisitedEdit: boolean; deleted: boolean; lastAt: string; activityMs: number; executed: string[]; errors: string[] }
export type HistoryPayloads = {
  projectCreated: Record<string, never>
  projectOpened: { saved: boolean }
  projectEdited: { startChanged: boolean; codeChanged: boolean; changes: number; counts: Partial<Record<typeof factoryBlockTypes[number], number>>; saved: boolean }
  projectRunStarted: Record<string, never>
  projectRunEnded: { outcome: 'ended' | 'stopped' | 'error' | 'stepLimit'; error?: typeof factoryErrors[number]; executed: typeof factoryBlockTypes[number][] }
  projectSaved: { snapshotId: string; projectId: string }
  projectClosed: { unsaved: boolean }
  projectDeleted: Record<string, never>
  visitStarted: Record<string, never>
  visitEnded: { reason: 'leave' | 'hidden' | 'reload' | 'unknown' }
  attemptStarted: { revision: number; mode: 'auto' | 'step'; purpose?: 'challenge'; changed: boolean; previousAttemptId?: string }
  executionCalculated: { result: HistoryResult; variants: HistoryResult[]; failedVariant: number | null; cause?: BlockType; path?: number[]; callId?: string }
  resultReached: Record<string, never>
  executionInterrupted: { reason: 'reset' | 'rerun' | 'leave' | 'hidden' }
  codeChanged: { revision: number; changes: number; counts: Partial<Record<BlockType, number>>; changed: boolean }
  fixRequested: { previousAttemptId: string; source: 'button' | 'edit' }
  undo: { revision: number }
  hintShown: { step: 1 | 2; first: boolean }
  demoStarted: { demoId: string }
  demoEnded: { demoId: string; reachedEnd: boolean }
  completionConfirmed: { first: boolean; stars?: number }
  challengeAchieved: { challengeId: string; ruleVersion: number }
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
  project?: ProjectActivity
  activityKind: ActivityKind; activityId: string; unit: number; attempts: number; completions: number
  failures: Partial<Record<HistoryResult, number>>; hint1Attempts: number; hint2Attempts: number; demoUses: number; demoEnds: number
  activityMs: number; playbackMs: number; demoMs: number; inactiveMs: number
  recentResults: HistoryResult[]; recentSequences: number[]; reviewSelected: boolean; reviewSequence: number
}
export type HistoryRollup = { visitId: string; from: string; to: string; throughSequence: number; summary: PuzzleHistorySummary }
export type HistoryDocument = { version: 1 | 2 | 3; nextSequence: number; events: HistoryEvent[]; rollups: HistoryRollup[]; incomplete: boolean; compactedAt: string | null }
export const emptyHistory = (): HistoryDocument => ({ version: 3, nextSequence: 1, events: [], rollups: [], incomplete: false, compactedAt: null })
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const token = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128 && /^[\w.:-]+$/.test(v)
export const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v))
const result = (v: unknown) => historyResults.includes(v as HistoryResult)
const schemas: Record<keyof HistoryPayloads, Record<string, (v: unknown) => boolean>> = {
  projectCreated: {}, projectOpened: { saved: v => typeof v === 'boolean' },
  projectEdited: { startChanged: v => typeof v === 'boolean', codeChanged: v => typeof v === 'boolean', changes: integer, saved: v => typeof v === 'boolean', counts: v => isRecord(v) && Object.entries(v).every(([k, n]) => factoryBlockTypes.includes(k as typeof factoryBlockTypes[number]) && integer(n)) },
  projectRunStarted: {}, projectRunEnded: { outcome: v => ['ended', 'stopped', 'error', 'stepLimit'].includes(v as string), 'error?': v => factoryErrors.includes(v as typeof factoryErrors[number]), executed: v => Array.isArray(v) && v.length <= factoryBlockTypes.length && new Set(v).size === v.length && v.every(k => factoryBlockTypes.includes(k)) },
  projectSaved: { snapshotId: token, projectId: token }, projectClosed: { unsaved: v => typeof v === 'boolean' }, projectDeleted: {},
  visitStarted: {}, visitEnded: { reason: v => ['leave', 'hidden', 'reload', 'unknown'].includes(v as string) },
  attemptStarted: { revision: integer, mode: v => v === 'auto' || v === 'step', 'purpose?': v => v === 'challenge', changed: v => typeof v === 'boolean', 'previousAttemptId?': token },
  executionCalculated: { result, variants: v => Array.isArray(v) && v.length > 0 && v.length <= 128 && v.every(result), failedVariant: v => v === null || integer(v), 'cause?': v => blockTypes.includes(v as BlockType), 'path?': v => Array.isArray(v) && v.length <= 20 && v.every(n => integer(n) || n === -1), 'callId?': token },
  resultReached: {}, executionInterrupted: { reason: v => ['reset', 'rerun', 'leave', 'hidden'].includes(v as string) },
  codeChanged: { revision: integer, changes: integer, changed: v => typeof v === 'boolean', counts: v => isRecord(v) && Object.entries(v).every(([k, n]) => blockTypes.includes(k as BlockType) && integer(n)) },
  fixRequested: { previousAttemptId: token, source: v => v === 'button' || v === 'edit' }, undo: { revision: integer },
  hintShown: { step: v => v === 1 || v === 2, first: v => typeof v === 'boolean' },
  demoStarted: { demoId: token }, demoEnded: { demoId: token, reachedEnd: v => typeof v === 'boolean' },
  completionConfirmed: { first: v => typeof v === 'boolean', 'stars?': v => integer(v) && v >= 1 && v <= 3 },
  challengeAchieved: { challengeId: token, ruleVersion: v => integer(v) && v > 0 },
  reviewChanged: { selected: v => typeof v === 'boolean' },
  timeSegment: { startMs: integer, endMs: integer, lastInputMs: integer, visible: v => typeof v === 'boolean', mode: v => ['activity', 'playback', 'demo'].includes(v as string) },
}
export function validHistoryEvent(v: unknown): v is HistoryEvent {
  if (!isRecord(v) || !isRecord(v.data) || !Object.hasOwn(schemas, String(v.type))) return false
  const required = ['id', 'learnerId', 'deviceId', 'visitId', 'activityId', 'appVersion', 'contentVersion', 'evaluationVersion']
  if (!required.every(k => token(v[k])) || !integer(v.sequence) || v.sequence < 1 || !integer(v.unit) || v.unit > 12 || !integer(v.elapsedMs) || !validDate(v.recordedAt)) return false
  if (!['puzzle', 'bonus', 'prediction', 'demo', 'project'].includes(v.activityKind as string) || (v.attemptId !== undefined && !token(v.attemptId))) return false
  if ((String(v.type).startsWith('project')) !== (v.activityKind === 'project') && v.type !== 'visitEnded') return false
  if (v.activityKind === 'project' && v.unit !== 0) return false
  const allowed = [...required, 'sequence', 'unit', 'elapsedMs', 'recordedAt', 'activityKind', 'attemptId', 'type', 'data']
  if (Object.keys(v).some(k => !allowed.includes(k))) return false
  const data = v.data
  const schema = schemas[v.type as keyof HistoryPayloads]
  const dataKeys = Object.keys(schema).map(k => k.replace(/\?$/, ''))
  if (Object.keys(v.data).some(k => !dataKeys.includes(k))) return false
  if (!Object.entries(schema).every(([key, check]) => key.endsWith('?') ? data[key.slice(0, -1)] === undefined || check(data[key.slice(0, -1)]) : check(data[key]))) return false
  if (['attemptStarted', 'executionCalculated', 'resultReached', 'executionInterrupted', 'completionConfirmed', 'challengeAchieved'].includes(v.type as string) && !token(v.attemptId)) return false
  if (v.type === 'timeSegment' && ((v.data.endMs as number) < (v.data.startMs as number) || (v.data.endMs as number) > v.elapsedMs || (v.data.lastInputMs as number) > (v.data.endMs as number))) return false
  if (v.type === 'projectRunEnded') {
    if ((v.data.outcome === 'error' || v.data.outcome === 'stepLimit') !== (v.data.error !== undefined)) return false
    if ((v.data.outcome === 'stepLimit') !== (v.data.error === 'stepLimit')) return false
  }
  if (v.type === 'executionCalculated') {
    const variants = v.data.variants as HistoryResult[]
    const failed = variants.findIndex(r => r !== 'success')
    if (v.data.failedVariant !== (failed < 0 ? null : failed) || v.data.result !== (failed < 0 ? 'success' : variants[failed])) return false
  }
  return true
}
