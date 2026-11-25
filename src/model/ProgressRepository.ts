import type { Program, Stage } from './types'
import { allStages as stages, stages as unit1Stages } from './stages'

export type StageProgress = { completed: boolean; bestStars: number; lastProgram: Program }
export type Progress = { version: 1; stages: Record<string, StageProgress> }
export type ProgressStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }
export const progressKey = 'lealnspire.progress'
export const progressV2Key = 'lealnspire.progress.v2'
export type ProgressV2 = { version: 2; stages: Record<string, Omit<StageProgress, 'lastProgram'> & { lastProgram: { main: Program; functions: [] } }> }
export const settingsKey = 'lealnspire.settings'
const empty = (): Progress => ({ version: 1, stages: {} })
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validProgram(value: unknown): value is Program {
  if (!Array.isArray(value)) return false
  const pending = value.map(block => ({ block: block as unknown, depth: 1 }))
  const ids = new Set<string>()
  while (pending.length) {
    const { block, depth } = pending.pop()!
    if (depth > 8 || ids.size >= 60) return false
    if (!record(block) || typeof block.id !== 'string' || !block.id || ids.has(block.id)) return false
    ids.add(block.id)
    if (block.type === 'if') {
      if (block.condition !== 'blockedAhead' || !Array.isArray(block.body)) return false
      for (const child of block.body) pending.push({ block: child, depth: depth + 1 })
    } else if (block.type === 'repeat') {
      if (!Number.isInteger(block.count) || (block.count as number) < 2 || (block.count as number) > 10 || !Array.isArray(block.body)) return false
      for (const child of block.body) pending.push({ block: child, depth: depth + 1 })
    } else if (!['forward', 'turnLeft', 'turnRight'].includes(block.type as string)) return false
  }
  return true
}

const knownStageIds = new Set(stages.map(stage => stage.id))
function normalizeStages(entries: Record<string, unknown>): Record<string, StageProgress> {
  return Object.fromEntries(Object.entries(entries).flatMap(([id, value]) => {
    if (!knownStageIds.has(id)) return []
    const entry = record(value) ? value : {}
    return [[id, {
      completed: typeof entry.completed === 'boolean' ? entry.completed : false,
      bestStars: Number.isInteger(entry.bestStars) && (entry.bestStars as number) >= 0 && (entry.bestStars as number) <= 3
        ? entry.bestStars as number : 0,
      lastProgram: validProgram(entry.lastProgram) ? entry.lastProgram : [],
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
    [id, { ...clone(entry), lastProgram: { main: clone(entry.lastProgram), functions: [] } }])) }
}
function readJSON(raw: string | null): unknown {
  try { return JSON.parse(raw ?? 'null') } catch { return null }
}
function fromDocument(value: unknown): Progress | undefined {
  if (!record(value) || value.version !== 2 || !record(value.stages)) return undefined
  const entries = Object.fromEntries(Object.entries(value.stages).map(([id, value]) => {
    const entry = record(value) ? value : {}
    const code = entry.lastProgram
    const main = record(code) && Array.isArray(code.functions) && code.functions.length === 0 ? code.main : undefined
    return [id, { ...entry, lastProgram: main }]
  }))
  return { version: 1, stages: normalizeStages(entries) }
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

function makeStore(storage?: ProgressStorage) {
  const deletionStorage = storage
  let language: 'ko' | 'en' | undefined
  try {
    const settings: unknown = JSON.parse(storage?.getItem(settingsKey) ?? 'null')
    if (record(settings) && settings.version === 1 && (settings.lang === 'ko' || settings.lang === 'en')) language = settings.lang
  } catch { /* Invalid or unavailable settings use the default language. */ }
  let progress = empty()
  try {
    const current = readJSON(storage?.getItem(progressV2Key) ?? null)
    const restored = fromDocument(current)
    if (restored) progress = restored
    else if (!unknownVersion(current)) {
      const legacy = storage?.getItem(progressKey) ?? null
      if (!unknownVersion(readJSON(legacy))) {
        progress = fromDocument(migrations[0](legacy))!
        if (legacy !== null) persist()
      }
    }
  } catch {
    storage = undefined
  }
  function persist() {
    try {
      storage?.setItem(progressV2Key, JSON.stringify(toDocument(progress)))
    } catch {
      storage = undefined
    }
  }
  return {
    getLanguage: () => language,
    saveLanguage(lang: 'ko' | 'en') {
      language = lang
      try { storage?.setItem(settingsKey, JSON.stringify({ version: 1, lang })) }
      catch { /* Keep the selection in memory when settings cannot be saved. */ }
    },
    get persistent() { return storage !== undefined },
    clear() {
      progress = empty()
      try {
        if (!deletionStorage?.removeItem) return false
        let removed = true
        for (const key of [progressKey, progressV2Key]) {
          try { deletionStorage.removeItem(key) }
          catch { removed = false }
        }
        if (!removed) storage = undefined
        return removed && storage !== undefined
      } catch {
        storage = undefined
        return false
      }
    },
    getProgress: (): Progress => clone(progress),
    getProgram: (stage: Stage): Program => clone(progress.stages[stage.id]?.lastProgram ?? stage.initialProgram ?? []),
    saveProgram(stageId: string, program: Program) {
      const previous = progress.stages[stageId]
      progress.stages = { ...progress.stages, [stageId]: {
        completed: previous?.completed ?? false, bestStars: previous?.bestStars ?? 0, lastProgram: clone(program),
      } }
      persist()
    },
    completeStage(stageId: string, stars: number, program: Program) {
      if (!Number.isInteger(stars) || stars < 1 || stars > 3) return
      const previous = progress.stages[stageId]
      progress.stages = { ...progress.stages, [stageId]: {
        completed: true, bestStars: Math.max(previous?.bestStars ?? 0, stars), lastProgram: clone(program),
      } }
      persist()
    },
  }
}

export class ProgressRepository {
  private store: ReturnType<typeof makeStore>
  constructor(storage?: ProgressStorage) { this.store = makeStore(storage) }
  get persistent() { return this.store.persistent }
  getLanguage = () => this.store.getLanguage()
  saveLanguage = (lang: 'ko' | 'en') => this.store.saveLanguage(lang)
  clear = () => this.store.clear()
  getProgress = () => this.store.getProgress()
  getProgram = (stage: Stage) => this.store.getProgram(stage)
  saveProgram = (id: string, program: Program) => this.store.saveProgram(id, program)
  completeStage = (id: string, stars: number, program: Program) => this.store.completeStage(id, stars, program)
}
export const createProgressStore = (storage?: ProgressStorage) => new ProgressRepository(storage)
