import { describe, expect, it } from 'vitest'
import { createProgressStore, isUnlocked, parseProgress, progressKey } from './progress'
import { stages } from '../stages'
import type { Program } from '../engine/types'

const program: Program = [{ id: 'r', type: 'repeat', count: 2, body: [{ id: 'f', type: 'forward' }] }]
function fakeStorage(raw: string | null = null) {
  const values = new Map<string, string>(raw === null ? [] : [[progressKey, raw]])
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
const serialize = (lastProgram: unknown = program, bestStars: unknown = 3, completed: unknown = true) =>
  JSON.stringify({ version: 1, stages: { [stages[0].id]: { completed, bestStars, lastProgram } } })

describe('진행 상황 저장', () => {
  it('편집과 성공 결과가 새 저장소에서도 유지되고 최고 별이 낮아지지 않는다', () => {
    const storage = fakeStorage()
    const store = createProgressStore(storage)
    store.saveProgram(stages[0].id, program)
    expect(createProgressStore(storage).getProgram(stages[0])).toEqual(program)
    store.completeStage(stages[0].id, 3, program)
    store.completeStage(stages[0].id, 1, [])
    store.saveProgram(stages[0].id, program)
    expect(createProgressStore(storage).getProgress().stages[stages[0].id]).toEqual({ completed: true, bestStars: 3, lastProgram: program })
  })
  it('저장 코드, 초기 코드, 빈 코드 순서로 복원하고 빈 저장 코드도 유지한다', () => {
    const store = createProgressStore(fakeStorage())
    const stage = { ...stages[0], initialProgram: program }
    expect(store.getProgram(stage)).toEqual(program)
    expect(store.getProgram({ ...stage, initialProgram: undefined })).toEqual([])
    store.saveProgram(stage.id, [])
    expect(store.getProgram(stage)).toEqual([])
  })
  it('첫 스테이지와 직전 스테이지 완료 여부로만 잠금을 판정한다', () => {
    const store = createProgressStore(fakeStorage())
    expect(isUnlocked(store.getProgress(), 0)).toBe(true)
    expect(isUnlocked(store.getProgress(), 1)).toBe(false)
    store.completeStage(stages[0].id, 1, [])
    expect(isUnlocked(store.getProgress(), 1)).toBe(true)
    expect(isUnlocked(store.getProgress(), 2)).toBe(false)
    for (const index of [-1, 0.5, stages.length]) expect(isUnlocked(store.getProgress(), index)).toBe(false)
  })
  it('손상 JSON, 다른 버전과 잘못된 최상위 구조를 초기화한다', () => {
    for (const raw of [null, '{', 'null', '[]', '{"version":2,"stages":{}}', '{"version":1,"stages":[]}']) {
      expect(parseProgress(raw)).toEqual({ version: 1, stages: {} })
    }
  })
  it('블록 타입, 중첩 구조, 반복 횟수, ID, 별과 완료 여부를 검증한다', () => {
    for (const invalid of [null, {}, [{ id: 'x', type: 'bad' }], [{ type: 'forward' }],
      [{ id: 'x', type: 'repeat', count: 1, body: [] }], [{ id: 'x', type: 'repeat', count: 11, body: [] }],
      [{ id: 'x', type: 'repeat', count: 2.5, body: [] }], [{ id: 'x', type: 'repeat', count: 2, body: {} }],
      [{ id: 'x', type: 'repeat', count: 2, body: [{ id: 'x', type: 'forward' }] }]]) {
      expect(parseProgress(serialize(invalid)).stages).toEqual({})
    }
    for (const stars of [-1, 4, 1.5, '3']) expect(parseProgress(serialize(program, stars)).stages).toEqual({})
    expect(parseProgress(serialize(program, 3, 'true')).stages).toEqual({})
    expect(parseProgress(serialize()).stages[stages[0].id].lastProgram).toEqual(program)
  })
  it('손상 항목만 버리고 정상 스테이지는 보존한다', () => {
    const value = JSON.parse(serialize())
    value.stages.bad = { completed: true }
    expect(Object.keys(parseProgress(JSON.stringify(value)).stages)).toEqual([stages[0].id])
  })
  it('읽기나 쓰기 예외가 나도 메모리에서 계속 동작한다', () => {
    for (const storage of [
      { getItem: () => { throw Error('denied') }, setItem: () => { throw Error('denied') } },
      { getItem: () => serialize(), setItem: () => { throw Error('quota') } },
    ]) {
      const store = createProgressStore(storage)
      store.saveProgram(stages[0].id, program)
      store.completeStage(stages[0].id, 2, program)
      expect(store.getProgram(stages[0])).toEqual(program)
      expect(store.getProgress().stages[stages[0].id].completed).toBe(true)
    }
  })
  it('브라우저 저장소 접근 자체가 예외여도 동작한다', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('denied') } })
    try {
      const store = createProgressStore()
      store.completeStage(stages[0].id, 1, program)
      expect(store.getProgram(stages[0])).toEqual(program)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
  it('외부 프로그램 변경이 저장 상태를 바꾸지 않는다', () => {
    const store = createProgressStore(fakeStorage())
    const input = structuredClone(program)
    store.saveProgram(stages[0].id, input)
    input.length = 0
    store.getProgram(stages[0]).length = 0
    store.getProgress().stages[stages[0].id].bestStars = 3
    expect(store.getProgram(stages[0])).toEqual(program)
    expect(store.getProgress().stages[stages[0].id].bestStars).toBe(0)
  })
})
