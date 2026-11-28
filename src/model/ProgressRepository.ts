import { emptyHistory, validHistoryEvent, validDate } from './history'
import type { HistoryDocument, HistoryEvent, HistoryEventInput } from './history'
import { compactHistory, historyLimits, parseHistory } from './historySummary'
import { programDocument } from './types'
import type { Program, ProgramDocument, ProgramInput, FunctionDef, Stage } from './types'
import { normalizeLogicProgram, validDocument } from './program'
import { allStages as stages, stages as unit1Stages } from './stages'

export type StageProgress = { completed: boolean; bestStars: number; lastProgram: Program; functions?: FunctionDef[] }
export type Progress = { version: 1; stages: Record<string, StageProgress> }
export type ProgressStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }
export const progressKey = 'lealnspire.progress'
export const progressV2Key = 'lealnspire.progress.v2'
export const progressV3Key = 'lealnspire.progress.v3'
export const historyKey = 'lealnspire.history.v1'
export type ProgressV3 = Omit<ProgressV2, 'version'> & { version: 3; learnerId: string; historyStartedAt: string; pastDetailsUnavailable: boolean }
export type HistoryOptions = { now?: () => string; createId?: () => string }
let identitySequence = 0
const newIdentity = () => `local-${Date.now().toString(36)}-${(++identitySequence).toString(36)}-${Math.random().toString(36).slice(2)}`
export type ProgressV2 = { version: 2; stages: Record<string, Omit<StageProgress, 'lastProgram'> & { lastProgram: ProgramDocument }> }
export const demoIds = ['add-run', 'rotation', 'repeat', 'condition', 'else', 'while', 'function', 'variable', 'logic', 'parameter', 'return', 'event', 'list', 'search']
export const settingsKey = 'lealnspire.settings'
const empty = (): Progress => ({ version: 1, stages: {} })
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Omitted palettes still have the unit's default commands.
function stagePolicy(id: string) {
  const stage = stages.find(stage => stage.id === id)
  const palette: NonNullable<Stage['palette']> = stage?.palette ??
    ['forward', 'turnLeft', 'turnRight', 'repeat', ...(id.startsWith('u2-') ? ['if' as const] : [])]
  return { palette, allowVariableCount: !!stage?.lists || id.startsWith('u5-') || stage?.params === true }
}
function validStageDocument(value: unknown, id: string): value is ProgramDocument {
  const { palette, allowVariableCount } = stagePolicy(id)
  return validDocument(value, palette, allowVariableCount, id.startsWith('u6-'), stages.find(stage => stage.id === id)?.params === true, stages.find(stage => stage.id === id)?.returns === true, stages.find(stage => stage.id === id)?.events === true, !!stages.find(stage => stage.id === id)?.lists, !!stages.find(stage => stage.id === id)?.search)
}

const knownStageIds = new Set(stages.map(stage => stage.id))
function normalizeStages(entries: Record<string, unknown>, withFunctions = false): Record<string, StageProgress> {
  return Object.fromEntries(Object.entries(entries).flatMap(([id, value]) => {
    if (!knownStageIds.has(id)) return []
    const entry = record(value) ? value : {}
    return [[id, {
      completed: typeof entry.completed === 'boolean' ? entry.completed : false,
      bestStars: Number.isInteger(entry.bestStars) && (entry.bestStars as number) >= 0 && (entry.bestStars as number) <= 3
        ? entry.bestStars as number : 0,
      ...(withFunctions && Array.isArray(entry.functions) && entry.functions.length ? { functions: entry.functions as FunctionDef[] } : {}),
      lastProgram: validStageDocument({ main: entry.lastProgram, functions: withFunctions ? entry.functions ?? [] : [] }, id) ? (id.startsWith('u6-') ? normalizeLogicProgram(entry.lastProgram as Program) : entry.lastProgram as Program) : [],
    }]]
  }))
}

export function parseProgress(raw: string | null): Progress {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!record(value) || value.version !== 1 || !record(value.stages)) return empty()
    return { version: 1, stages: normalizeStages(value.stages) }
  } catch {
    return empty()
  }
}

// Each migration is pure; later schema versions can add the next conversion here.
export function migrateV1toV2(raw: string | null): ProgressV2 {
  return toDocument(parseProgress(raw))
}
const migrations = [migrateV1toV2]

function toDocument(progress: Progress): ProgressV2 {
  return { version: 2, stages: Object.fromEntries(Object.entries(progress.stages).map(([id, entry]) =>
    [id, { completed: entry.completed, bestStars: entry.bestStars, lastProgram: { main: clone(entry.lastProgram), functions: clone(entry.functions ?? []) } }])) }
}
function readJSON(raw: string | null): unknown {
  try { return JSON.parse(raw ?? 'null') } catch { return null }
}
function fromDocument(value: unknown): Progress | undefined {
  if (!record(value) || value.version !== 2 || !record(value.stages)) return undefined
  const entries = Object.fromEntries(Object.entries(value.stages).map(([id, value]) => {
    const entry = record(value) ? value : {}
    const code = entry.lastProgram
    const valid = validStageDocument(code, id)
    return [id, { ...entry, lastProgram: valid ? code.main : [], functions: valid ? code.functions : [] }]
  }))
  return { version: 1, stages: normalizeStages(entries, true) }
}
function unknownVersion(value: unknown): boolean {
  return record(value) && 'version' in value && value.version !== 1 && value.version !== 2
}

// stageIndex는 0부터 시작하며, 순서는 스테이지 데이터 배열을 따른다.
export function isUnlocked(progress: Progress, stageIndex: number): boolean {
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= stages.length) return false
  if (stages[stageIndex].variants) return unit1Stages.every(stage => progress.stages[stage.id]?.completed === true)
    && (stages[stageIndex - 1]?.variants ? progress.stages[stages[stageIndex - 1].id]?.completed === true : true)
  return stageIndex === 0 || progress.stages[stages[stageIndex - 1].id]?.completed === true
}

function makeStore(storage?: ProgressStorage, options: HistoryOptions = {}) {
  const now = options.now ?? (() => new Date().toISOString())
  const createId = options.createId ?? newIdentity
  let learnerId = createId()
  let historyStartedAt = now()
  let pastDetailsUnavailable = false
  let history: HistoryDocument = emptyHistory()
  let progressWritable = true
  let historyWritable = true
  let preservedBytes = 0
  let settingsBytes = 0
  let futureProgressBytes = 0
  let progressBytes = 0
  let historyBytes = 0
  let historyDirty = false
  let identityPersisted = false
  const deletionStorage = storage
  let seenDemos: string[] = []
  let language: 'ko' | 'en' | undefined
  try {
    const settings: unknown = JSON.parse(storage?.getItem(settingsKey) ?? 'null')
    if (record(settings) && (settings.version === 1 || settings.version === 2) && (settings.lang === 'ko' || settings.lang === 'en')) language = settings.lang
    if (record(settings) && settings.version === 2 && Array.isArray(settings.seenDemos) && settings.seenDemos.every(id => demoIds.includes(id))) seenDemos = [...new Set(settings.seenDemos)]
    if (record(settings) && (settings.version === 1 || settings.version === 2) && ('lang' in settings || 'seenDemos' in settings)) persistSettings()
  } catch { /* Invalid or unavailable settings use the default language. */ }
  function persistSettings() {
    try {
      const raw = JSON.stringify({ version: 2, ...(language ? { lang: language } : {}), seenDemos })
      settingsBytes = raw.length * 2
      storage?.setItem(settingsKey, raw)
    }
    catch { /* Settings remain available for this session. */ }
  }
  let progress = empty()
  try {
    const v3 = readJSON(storage?.getItem(progressV3Key) ?? null)
    const v2raw = storage?.getItem(progressV2Key) ?? null
    const v1raw = storage?.getItem(progressKey) ?? null
    preservedBytes = ((v1raw?.length ?? 0) + (v2raw?.length ?? 0)) * 2
    settingsBytes = (storage?.getItem(settingsKey)?.length ?? 0) * 2
    try {
      const historyRaw = storage?.getItem(historyKey) ?? null
      const historyValue = readJSON(historyRaw)
      historyWritable = !(record(historyValue) && 'version' in historyValue && historyValue.version !== 1)
      if (historyWritable) history = parseHistory(historyRaw)
      else { history.incomplete = true; preservedBytes += (historyRaw?.length ?? 0) * 2 }
    } catch { historyWritable = false; history.incomplete = true }
    if (record(v3) && v3.version === 3 && record(v3.stages)) {
      identityPersisted = true
      progress = fromDocument({ ...v3, version: 2 })!
      if (typeof v3.learnerId === 'string' && /^[\w.:-]{1,128}$/.test(v3.learnerId)) learnerId = v3.learnerId
      else history.incomplete = true
      if (validDate(v3.historyStartedAt)) historyStartedAt = v3.historyStartedAt
      else history.incomplete = true
      pastDetailsUnavailable = v3.pastDetailsUnavailable !== false
    } else if (record(v3) && 'version' in v3 && v3.version !== 3) { progressWritable = false; futureProgressBytes = (storage?.getItem(progressV3Key)?.length ?? 0) * 2 }
    else {
      const current = readJSON(v2raw)
      const restored = fromDocument(current)
      if (restored) { progress = restored; pastDetailsUnavailable = true }
      else if (!unknownVersion(current) && !unknownVersion(readJSON(v1raw))) {
        progress = fromDocument(migrations[0](v1raw))!
        pastDetailsUnavailable = v1raw !== null
      } else progressWritable = false
      if (progressWritable && (v1raw !== null || v2raw !== null)) { persist(); historyDirty = true; flushHistory() }
    }
  } catch { storage = undefined }
  function progressDocument(): ProgressV3 {
    return { ...toDocument(progress), version: 3, learnerId, historyStartedAt, pastDetailsUnavailable }
  }
  function persist() {
    const raw = JSON.stringify(progressDocument())
    progressBytes = progressWritable ? raw.length * 2 : futureProgressBytes
    if (!storage || !progressWritable) return
    try {
      if (preservedBytes + settingsBytes + progressBytes + historyBytes > historyLimits.bytes) {
        historyDirty = true
        flushHistory(false)
        if (preservedBytes + settingsBytes + progressBytes + historyBytes > historyLimits.bytes) throw Error('app storage budget')
      }
      storage?.setItem(progressV3Key, raw)
      identityPersisted = true
    } catch {
      history = compactHistory(history, now(), preservedBytes + settingsBytes + progressBytes, true)
      try {
        const rawHistory = JSON.stringify(history); historyBytes = rawHistory.length * 2
        if (historyBytes + preservedBytes + settingsBytes + progressBytes > historyLimits.bytes) throw Error('app storage budget')
        if (historyWritable) storage?.setItem(historyKey, rawHistory)
        storage?.setItem(progressV3Key, raw)
        identityPersisted = true
      } catch { storage = undefined }
    }
  }
  function flushHistory(ensureIdentity = true) {
    if (!historyDirty) return
    if (ensureIdentity && !identityPersisted && progressWritable) persist()
    const otherBytes = preservedBytes + settingsBytes + (progressBytes || (progressWritable ? JSON.stringify(progressDocument()).length * 2 : futureProgressBytes))
    history = compactHistory(history, now(), otherBytes)
    const write = () => {
      const raw = JSON.stringify(history)
      historyBytes = raw.length * 2
      if (historyBytes + otherBytes > historyLimits.bytes) throw Error('app storage budget')
      if (historyWritable) storage?.setItem(historyKey, raw)
    }
    try { write() }
    catch {
      history = compactHistory(history, now(), otherBytes, true)
      try { write() } catch { storage = undefined }
    }
    historyDirty = false
  }
  // Apply retention on restore, even when the next action is a read-only dashboard.
  const restoredHistory = compactHistory(history, now(), preservedBytes + settingsBytes + (progressWritable ? JSON.stringify(progressDocument()).length * 2 : futureProgressBytes))
  if (JSON.stringify(restoredHistory) !== JSON.stringify(history)) { history = restoredHistory; historyDirty = true; flushHistory() }
  historyBytes = JSON.stringify(history).length * 2
  let recovered = false
  function recoverHistory() {
    if (recovered) return
    recovered = true
    // A previous process may have disappeared without delivering pagehide.
    const open = new Map<string, HistoryEvent>()
    for (const event of history.events) {
      if (event.type === 'visitEnded') open.delete(event.visitId)
      else open.set(event.visitId, event)
    }
    for (const event of open.values()) {
      const { id: _id, sequence: _sequence, learnerId: _learner, deviceId: _device, attemptId: _attempt, ...context } = event
      const closed = { ...context, type: 'visitEnded', data: { reason: 'unknown' }, recordedAt: now(), id: `${learnerId}:${history.nextSequence}`, sequence: history.nextSequence++, learnerId: event.learnerId, deviceId: event.deviceId } as HistoryEvent
      history.events.push(closed); historyDirty = true
    }
    flushHistory()
  }
  return {
    now, createId, flushHistory, recoverHistory,
    getSeenDemos: () => [...seenDemos],
    markDemoSeen(id: string) { if (!demoIds.includes(id)) return; seenDemos = [...new Set([...seenDemos, id])]; persistSettings() },
    resetDemos() { seenDemos = []; persistSettings() },
    getLanguage: () => language,
    saveLanguage(lang: 'ko' | 'en') {
      language = lang
      persistSettings()
    },
    get persistent() { return storage !== undefined && progressWritable && historyWritable },
    clear() {
      if (deletionStorage) {
        if (!deletionStorage.removeItem) return false
        let removed = true
        for (const key of [progressKey, progressV2Key, progressV3Key, historyKey]) {
          try { deletionStorage.removeItem(key) }
          catch { removed = false }
        }
        if (!removed) return false
      }
      progress = empty()
      history = emptyHistory(); historyBytes = 0; historyDirty = false; learnerId = createId(); historyStartedAt = now(); pastDetailsUnavailable = false
      progressWritable = true; historyWritable = true; preservedBytes = 0; identityPersisted = false; progressBytes = 0; recovered = false
      return true
    },
    getProgressDocument: () => clone(progressDocument()),
    getHistory: () => clone(history),
    appendHistory(input: HistoryEventInput, deferred = false): boolean {
      const event = { ...clone(input), learnerId, deviceId: learnerId, id: `${learnerId}:${history.nextSequence}`, sequence: history.nextSequence } as HistoryEvent
      if (!validHistoryEvent(event) || history.rollups.some(r => r.visitId === event.visitId)) return false
      const previous = history.events.filter(e => e.visitId === event.visitId)
      if (previous.some(e => e.type === 'visitEnded') || previous.some(e => e.activityKind !== event.activityKind || e.activityId !== event.activityId || e.unit !== event.unit) || (previous.length > 0 && event.elapsedMs < previous[previous.length - 1].elapsedMs)) return false
      history.events.push(event); history.nextSequence++; historyDirty = true; if (!deferred) flushHistory(); return true
    },
    getProgress: (): Progress => clone(progress),
    getProgram: (stage: Stage): Program => clone(progress.stages[stage.id]?.lastProgram ?? stage.initialProgram ?? []),
    getDocument: (stage: Stage): ProgramDocument => ({ main: clone(progress.stages[stage.id]?.lastProgram ?? stage.initialProgram ?? []), functions: clone(progress.stages[stage.id] ? progress.stages[stage.id].functions ?? [] : stage.initialFunctions ?? []) }),
    saveProgram(stageId: string, program: ProgramInput) {
      const previous = progress.stages[stageId]
      progress.stages = { ...progress.stages, [stageId]: {
        completed: previous?.completed ?? false, bestStars: previous?.bestStars ?? 0, lastProgram: clone(programDocument(program).main), ...(programDocument(program).functions.length ? { functions: clone(programDocument(program).functions) } : {}),
      } }
      persist()
    },
    completeStage(stageId: string, stars: number, program: ProgramInput) {
      if (!Number.isInteger(stars) || stars < 1 || stars > 3) return
      const previous = progress.stages[stageId]
      progress.stages = { ...progress.stages, [stageId]: {
        completed: true, bestStars: Math.max(previous?.bestStars ?? 0, stars), lastProgram: clone(programDocument(program).main), ...(programDocument(program).functions.length ? { functions: clone(programDocument(program).functions) } : {}),
      } }
      persist()
    },
  }
}

export class ProgressRepository {
  private store: ReturnType<typeof makeStore>
  constructor(storage?: ProgressStorage, options: HistoryOptions = {}) { this.store = makeStore(storage, options) }
  get persistent() { return this.store.persistent }
  getSeenDemos = () => this.store.getSeenDemos()
  markDemoSeen = (id: string) => this.store.markDemoSeen(id)
  resetDemos = () => this.store.resetDemos()
  getLanguage = () => this.store.getLanguage()
  saveLanguage = (lang: 'ko' | 'en') => this.store.saveLanguage(lang)
  clear = () => this.store.clear()
  getProgressDocument = () => this.store.getProgressDocument()
  getHistory = () => this.store.getHistory()
  recoverHistory = () => this.store.recoverHistory()
  historyNow = () => this.store.now()
  historyId = () => this.store.createId()
  flushHistory = () => this.store.flushHistory()
  appendHistory = (input: HistoryEventInput, deferred = false) => this.store.appendHistory(input, deferred)
  setReview = (id: string, selected: boolean) => {
    const visitId = this.historyId()
    const context = { visitId, activityKind: id.startsWith('b') ? 'bonus' as const : 'puzzle' as const, activityId: id,
      unit: Number(/^u(\d+)-/.exec(id)?.[1] ?? 1), recordedAt: this.historyNow(), elapsedMs: 0,
      appVersion: '1.20.0', contentVersion: '1', evaluationVersion: '1' }
    this.appendHistory({ ...context, type: 'reviewChanged', data: { selected } }, true)
    this.appendHistory({ ...context, type: 'visitEnded', data: { reason: 'leave' } })
  }
  getProgress = () => this.store.getProgress()
  getProgram = (stage: Stage) => this.store.getProgram(stage)
  getDocument = (stage: Stage) => this.store.getDocument(stage)
  saveProgram = (id: string, program: ProgramInput) => this.store.saveProgram(id, program)
  completeStage = (id: string, stars: number, program: ProgramInput) => this.store.completeStage(id, stars, program)
}
export const createProgressStore = (storage?: ProgressStorage, options: HistoryOptions = {}) => new ProgressRepository(storage, options)
