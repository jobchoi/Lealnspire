import { describe, expect, it } from 'vitest'
import { createProgressStore } from '../storage/progress'
import { stages } from '../stages'
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
  it('완주 후에는 이어하기를 숨긴다', () => {
    const store = createProgressStore()
    for (const stage of stages) store.completeStage(stage.id, 3, stage.solution)
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
