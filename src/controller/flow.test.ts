import { AppController } from './AppController'
import { isUnlocked, ProgressRepository, progressKey } from '../model/ProgressRepository'
import { describe, expect, it } from 'vitest'
import { createProgressStore } from '../model/ProgressRepository'
import { stages, allStages, unit2Stages, unit3Stages } from '../model/stages'
import { continueStageIndex, showNextStage } from './flow'

describe('이어하기 대상', () => {
  it('진행이 없거나 알려진 스테이지 기록이 없으면 숨긴다', () => {
    const store = createProgressStore()
    expect(continueStageIndex(store.getProgress())).toBeUndefined()
    store.saveProgram('unknown', [])
    expect(continueStageIndex(store.getProgress())).toBeUndefined()
  })
  it('빈 코드도 기록이며 완료하지 않은 첫 열린 스테이지로 간다', () => {
    const store = createProgressStore()
    store.saveProgram(stages[0].id, [])
    expect(continueStageIndex(store.getProgress())).toBe(0)
    store.completeStage(stages[0].id, 3, [])
    expect(continueStageIndex(store.getProgress())).toBe(1)
    store.completeStage(stages[2].id, 3, [])
    expect(continueStageIndex(store.getProgress())).toBe(1)
  })
  it('1단원 완주 뒤 2단원으로 이어가고 전체 완주 후 숨긴다', () => {
    const store = createProgressStore()
    for (const stage of stages) store.completeStage(stage.id, 3, stage.solution)
    expect(continueStageIndex(store.getProgress())).toBe(allStages.indexOf(unit2Stages[0]))
    for (const stage of [...unit2Stages, ...unit3Stages]) store.completeStage(stage.id, 3, stage.solution)
    expect(continueStageIndex(store.getProgress())).toBeUndefined()
  })
})

it('완료한 스테이지에서만 다음 버튼을 표시하며 마지막에서는 숨긴다', () => {
  const store = createProgressStore()
  expect(showNextStage(store.getProgress(), '1', false)).toBe(false)
  store.saveProgram('1', [])
  expect(showNextStage(store.getProgress(), '1', false)).toBe(false)
  store.completeStage('1', 3, [])
  expect(showNextStage(store.getProgress(), '1', false)).toBe(true)
  expect(showNextStage(store.getProgress(), '1', true)).toBe(false)
  expect(showNextStage(store.getProgress(), 'unknown', false)).toBe(false)
})

it('preserves version 1 regular completion and isolates the bonus next flow', () => {
  const old = { version: 1, stages: Object.fromEntries(stages.map(stage => [stage.id, { completed: true, bestStars: 3, lastProgram: stage.solution }])) }
  let raw = JSON.stringify(old)
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
  const repository = new ProgressRepository(storage)
  expect(repository.getProgress()).toEqual(old)
  expect(continueStageIndex(repository.getProgress())).toBe(allStages.indexOf(unit2Stages[0]))
  expect(isUnlocked(repository.getProgress(), 8)).toBe(true)
  expect(isUnlocked(repository.getProgress(), 9)).toBe(false)
  const app = new AppController(repository)
  app.openStage(7)
  app.next()
  expect(app.getSnapshot().page).toBe('list')
  app.openStage(9)
  expect(app.getSnapshot().page).toBe('list')
  app.openStage(8)
  repository.completeStage('b1', 3, app.game!.stage.solution)
  app.next()
  expect(app.getSnapshot()).toEqual({ page: 'play', index: 9 })
  repository.completeStage('b2', 3, app.game!.stage.solution)
  app.next()
  expect(app.getSnapshot().page).toBe('list')
  const restored = new ProgressRepository(storage)
  expect(restored.getProgress().version).toBe(1)
  expect(restored.getProgress().stages.b2.completed).toBe(true)
  expect(continueStageIndex(restored.getProgress())).toBe(allStages.indexOf(unit2Stages[0]))
  expect(progressKey).toBe('lealnspire.progress')
})

it('unlocks unit 2 sequentially, continues without bonus completion and returns to the list after u2-4', () => {
  const repository = new ProgressRepository()
  const app = new AppController(repository)
  for (const stage of stages) repository.completeStage(stage.id, 3, stage.solution)
  for (const [offset, stage] of unit2Stages.entries()) {
    const index = allStages.indexOf(stage)
    expect(continueStageIndex(app.progress)).toBe(index)
    expect(isUnlocked(app.progress, index)).toBe(true)
    for (const later of unit2Stages.slice(offset + 1)) expect(isUnlocked(app.progress, allStages.indexOf(later))).toBe(false)
    app.continue()
    expect(app.getSnapshot()).toEqual({ page: 'play', index })
    repository.completeStage(stage.id, 3, stage.solution)
    app.next()
    expect(app.getSnapshot()).toEqual(offset === unit2Stages.length - 1 ? { page: 'list' } : { page: 'play', index: index + 1 })
  }
  expect(continueStageIndex(app.progress)).toBe(allStages.indexOf(unit3Stages[0]))
  expect(app.progress.stages.b1).toBeUndefined()
})

it('continues through unit 3 and returns to the list after its final stage', () => {
  const repository = new ProgressRepository()
  for (const stage of [...stages, ...unit2Stages]) repository.completeStage(stage.id, 3, stage.solution)
  const app = new AppController(repository)
  for (const [offset, stage] of unit3Stages.entries()) {
    const index = allStages.indexOf(stage)
    expect(continueStageIndex(app.progress)).toBe(index)
    app.continue()
    expect(app.getSnapshot()).toEqual({ page: 'play', index })
    repository.completeStage(stage.id, 3, stage.solution)
    app.next()
    expect(app.getSnapshot()).toEqual(offset === 2 ? { page: 'list' } : { page: 'play', index: index + 1 })
  }
  expect(continueStageIndex(app.progress)).toBeUndefined()
})
