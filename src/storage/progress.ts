import type { Program, Stage } from '../engine/types'
import { stages } from '../stages'

export type StageProgress = { completed: boolean; bestStars: number; lastProgram: Program }
export type Progress = { version: 1; stages: Record<string, StageProgress> }
export type ProgressStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const progressKey = 'lealnspire.progress'
const empty = (): Progress => ({ version: 1, stages: {} })
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validProgram(value: unknown): value is Program {
  if (!Array.isArray(value)) return false
  const pending: unknown[] = [...value]
  const ids = new Set<string>()
  while (pending.length) {
    const block = pending.pop()
    if (!record(block) || typeof block.id !== 'string' || !block.id || ids.has(block.id)) return false
    ids.add(block.id)
    if (block.type === 'repeat') {
      if (!Number.isInteger(block.count) || (block.count as number) < 2 || (block.count as number) > 10 || !Array.isArray(block.body)) return false
      for (const child of block.body) pending.push(child)
    } else if (!['forward', 'turnLeft', 'turnRight'].includes(block.type as string)) return false
  }
  return true
}

export function parseProgress(raw: string | null): Progress {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!record(value) || value.version !== 1 || !record(value.stages)) return empty()
    const entries = Object.entries(value.stages).filter(([, entry]) =>
      record(entry) && typeof entry.completed === 'boolean' &&
      Number.isInteger(entry.bestStars) && (entry.bestStars as number) >= 0 && (entry.bestStars as number) <= 3 &&
      validProgram(entry.lastProgram))
    return { version: 1, stages: Object.fromEntries(entries) as Record<string, StageProgress> }
  } catch {
    return empty()
  }
}

// stageIndex는 0부터 시작하며, 순서는 스테이지 데이터 배열을 따른다.
export function isUnlocked(progress: Progress, stageIndex: number): boolean {
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= stages.length) return false
  return stageIndex === 0 || progress.stages[stages[stageIndex - 1].id]?.completed === true
}

function browserStorage(): ProgressStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function createProgressStore(storage: ProgressStorage | undefined = browserStorage()) {
  let progress = empty()
  try {
    progress = parseProgress(storage?.getItem(progressKey) ?? null)
  } catch {
    storage = undefined
  }
  function persist() {
    try {
      storage?.setItem(progressKey, JSON.stringify(progress))
    } catch {
      storage = undefined
    }
  }
  return {
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
