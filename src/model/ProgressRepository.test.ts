import { validDocument } from './program'
import { EditorController } from '../controller/EditorController'
import { describe, expect, it } from 'vitest'
import { createProgressStore, isUnlocked, parseProgress, progressKey, progressV2Key, migrateV1toV2, settingsKey } from './ProgressRepository'
import { allStages, stages } from './stages'
import type { Program } from './types'

const program: Program = [{ id: 'r', type: 'repeat', count: 2, body: [{ id: 'f', type: 'forward' }] }]
function fakeStorage(raw: string | null = null) {
  const values = new Map<string, string>(raw === null ? [] : [[progressKey, raw]])
  return { removeItem: (key: string) => { values.delete(key) }, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
const serialize = (lastProgram: unknown = program, bestStars: unknown = 3, completed: unknown = true) =>
  JSON.stringify({ version: 1, stages: { [stages[0].id]: { completed, bestStars, lastProgram } } })

it('clears persisted logic trees in earlier units, including nested branches and function bodies', () => {
  const storage = fakeStorage()
  const store = createProgressStore(storage)
  const condition = { kind: 'atom', atom: 'blockedLeft' } as const
  const cases: ({ id: string } & import('./types').ProgramDocument)[] = [
    { id: 'u2-1', main: [{ id: 'r', type: 'repeat', count: 2, body: [{ id: 'i', type: 'if', condition, body: [] }] }], functions: [] },
    { id: 'u3-1', main: [{ id: 'w', type: 'while', condition, body: [] }], functions: [] },
    { id: 'u4-1', main: [], functions: [{ id: 'fn', icon: 'star', body: [{ id: 'i', type: 'if', condition, body: [] }] }] },
  ]
  for (const entry of cases) store.completeStage(entry.id, 3, { main: entry.main, functions: entry.functions })
  const restored = createProgressStore(storage)
  for (const entry of cases) expect(restored.getProgress().stages[entry.id]).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
})

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
      expect(parseProgress(serialize(invalid)).stages['1']).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
    }
    for (const stars of [-1, 4, 1.5, '3']) expect(parseProgress(serialize(program, stars)).stages['1']).toEqual({ completed: true, bestStars: 0, lastProgram: program })
    expect(parseProgress(serialize(program, 3, 'true')).stages['1']).toEqual({ completed: false, bestStars: 3, lastProgram: program })
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


it('clears only the app key and resets progress, programs and locks across reloads', () => {
  const storage = fakeStorage()
  storage.setItem('other-app', 'keep')
  const store = createProgressStore(storage)
  store.completeStage(stages[0].id, 3, program)
  expect(store.clear()).toBe(true)
  expect(storage.getItem(progressKey)).toBeNull()
  expect(storage.getItem('other-app')).toBe('keep')
  expect(store.getProgress()).toEqual({ version: 1, stages: {} })
  expect(store.getProgram(stages[0])).toEqual(stages[0].initialProgram ?? [])
  expect(isUnlocked(store.getProgress(), 1)).toBe(false)
  expect(createProgressStore(storage).getProgress()).toEqual(store.getProgress())
  store.saveProgram(stages[0].id, program)
  expect(createProgressStore(storage).getProgram(stages[0])).toEqual(program)
})

it('clears memory without throwing when storage is absent or read, write or removal fails', () => {
  for (const failure of ['absent', 'read', 'write', 'remove']) {
    const storage = fakeStorage(serialize())
    const store = createProgressStore(failure === 'absent' ? undefined : {
      getItem: key => { if (failure === 'read') throw Error('denied'); return storage.getItem(key) },
      setItem: (key, value) => { if (failure === 'write') throw Error('quota'); storage.setItem(key, value) },
      removeItem: key => { if (failure === 'remove') throw Error('denied'); storage.removeItem(key) },
    })
    store.saveProgram(stages[0].id, program)
    expect(store.clear()).toBe(false)
    expect(store.getProgress().stages).toEqual({})
    if (failure === 'write') expect(storage.getItem(progressKey)).toBeNull()
  }
})


describe('language settings', () => {
  it('keeps settings separate from progress and preserves them when progress is deleted', () => {
    const storage = fakeStorage()
    const store = createProgressStore(storage)
    store.saveLanguage('en')
    store.completeStage(stages[0].id, 3, program)
    expect(JSON.parse(storage.getItem(settingsKey)!)).toEqual({ version: 1, lang: 'en' })
    expect(createProgressStore(storage).getLanguage()).toBe('en')
    expect(store.clear()).toBe(true)
    const restored = createProgressStore(storage)
    expect(restored.getLanguage()).toBe('en')
    expect(restored.getProgress().stages).toEqual({})
    restored.saveLanguage('ko')
    expect(createProgressStore(storage).getLanguage()).toBe('ko')
  })
  it('ignores invalid settings without losing valid progress', () => {
    for (const raw of ['{', 'null', '[]', '{"version":2,"lang":"en"}', '{"version":1,"lang":"fr"}']) {
      const storage = fakeStorage(serialize())
      storage.setItem(settingsKey, raw)
      const store = createProgressStore(storage)
      expect(store.getLanguage()).toBeUndefined()
      expect(store.getProgress().stages[stages[0].id].completed).toBe(true)
    }
  })
  it('keeps language changes in memory if storage is blocked', () => {
    const store = createProgressStore({ getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } })
    expect(store.getLanguage()).toBeUndefined()
    store.saveLanguage('en')
    expect(store.getLanguage()).toBe('en')
    expect(store.persistent).toBe(false)
    const storage = fakeStorage()
    const blocked = createProgressStore({ ...storage, setItem() { throw Error('blocked') } })
    blocked.saveLanguage('en')
    expect(blocked.getLanguage()).toBe('en')
  })
})


describe('T36 v2 migration', () => {
  it('migrates all regular and bonus stages without changing v1 through later writes', () => {
    const raw = JSON.stringify({ version: 1, stages: Object.fromEntries(allStages.filter(stage => !stage.variants).map(stage =>
      [stage.id, { completed: true, bestStars: 3, lastProgram: stage.solution }])) })
    const storage = fakeStorage(raw)
    const migrated = migrateV1toV2(raw)
    expect(Object.keys(migrated.stages)).toHaveLength(10)
    expect(migrated.stages.b1.lastProgram.functions).toEqual([])
    const store = createProgressStore(storage)
    expect(JSON.parse(storage.getItem(progressV2Key)!)).toEqual(migrated)
    for (const stage of allStages.filter(stage => !stage.variants)) expect(store.getProgram(stage)).toEqual(stage.solution)
    store.saveProgram('1', [])
    store.completeStage('2', 2, program)
    expect(storage.getItem(progressKey)).toBe(raw)
    expect(createProgressStore(storage).getProgram(stages[0])).toEqual([])
  })
  it('isolates corrupt stages in both versions and keeps a valid v2 ahead of v1', () => {
    const storage = fakeStorage(serialize())
    const document = migrateV1toV2(serialize())
    const bad = { completed: true, bestStars: 3, lastProgram: { main: [{ id: 'bad', type: 'if' }], functions: [] } }
    storage.setItem(progressV2Key, JSON.stringify({ ...document, stages: { ...document.stages, bad } }))
    expect(createProgressStore(storage).getProgress().stages).toEqual(parseProgress(serialize()).stages)
    storage.setItem(progressV2Key, JSON.stringify({ version: 2, stages: {} }))
    expect(createProgressStore(storage).getProgress().stages).toEqual({})
    const v1 = JSON.parse(serialize())
    v1.stages.bad = { completed: true, bestStars: 3, lastProgram: [{ id: 'bad', type: 'if' }] }
    expect(Object.keys(migrateV1toV2(JSON.stringify(v1)).stages)).toEqual(['1'])
  })
  it('preserves achievements with corrupt code through migration, v2 reads and save/reload', () => {
    for (const version of [1, 2]) {
      const entries = {
        '1': { completed: true, bestStars: 3, lastProgram: program },
        '2': { completed: true, bestStars: 2, lastProgram: [{ type: 'jump' }] },
        '3': { completed: 'true', bestStars: 2, lastProgram: program },
        '4': { completed: true, bestStars: 4, lastProgram: program },
        '5': null,
        unknown: { completed: true, bestStars: 3, lastProgram: program },
      }
      const raw = JSON.stringify({ version, stages: version === 1 ? entries : Object.fromEntries(
        Object.entries(entries).map(([id, entry]) => [id, entry && {
          ...entry, lastProgram: { main: entry.lastProgram, functions: [] },
        }])) })
      const storage = fakeStorage()
      storage.setItem(version === 1 ? progressKey : progressV2Key, raw)
      const expected = {
        '1': { completed: true, bestStars: 3, lastProgram: program },
        '2': { completed: true, bestStars: 2, lastProgram: [] },
        '3': { completed: false, bestStars: 2, lastProgram: program },
        '4': { completed: true, bestStars: 0, lastProgram: program },
        '5': { completed: false, bestStars: 0, lastProgram: [] },
      }
      const store = createProgressStore(storage)
      expect(store.getProgress().stages).toEqual(expected)
      expect(isUnlocked(store.getProgress(), 2)).toBe(true)
      // Saving a sibling must persist every repaired field without losing achievements.
      store.saveProgram('1', program)
      expect(createProgressStore(storage).getProgress().stages).toEqual(expected)
      expect(JSON.parse(storage.getItem(progressV2Key)!).stages['2']).toEqual({
        completed: true, bestStars: 2, lastProgram: { main: [], functions: [] },
      })
      if (version === 1) expect(storage.getItem(progressKey)).toBe(raw)
    }
  })
  it('retries v1 for invalid v2 envelopes but preserves unknown versions without migration', () => {
    for (const raw of ['{', 'null', '{"version":2,"stages":[]}']) {
      const storage = fakeStorage(serialize())
      storage.setItem(progressV2Key, raw)
      expect(createProgressStore(storage).getProgram(stages[0])).toEqual(program)
      expect(JSON.parse(storage.getItem(progressV2Key)!).version).toBe(2)
    }
    for (const key of [progressKey, progressV2Key]) {
      const storage = fakeStorage(serialize())
      const raw = '{"version":3,"stages":{}}'
      storage.setItem(key, raw)
      expect(createProgressStore(storage).getProgress().stages).toEqual({})
      expect(storage.getItem(key)).toBe(raw)
      if (key === progressKey) expect(storage.getItem(progressV2Key)).toBeNull()
    }
    const storage = fakeStorage()
    expect(createProgressStore(storage).getProgress().stages).toEqual({})
    expect(storage.getItem(progressV2Key)).toBeNull()
  })
  it('clears invalid v2 code while preserving completion, stars and sibling stages', () => {
    for (const lastProgram of [{ main: program, functions: [program] }, { main: program }, { main: null, functions: [] }]) {
      const storage = fakeStorage()
      const document = migrateV1toV2(serialize())
      storage.setItem(progressV2Key, JSON.stringify({ ...document, stages: { ...document.stages,
        '2': { completed: true, bestStars: 2, lastProgram } } }))
      expect(createProgressStore(storage).getProgress().stages).toEqual({
        '1': { completed: true, bestStars: 3, lastProgram: program },
        '2': { completed: true, bestStars: 2, lastProgram: [] },
      })
    }
  })
  it('enforces depth ten, sixty nodes and unique IDs across the whole program', () => {
    const nested = (depth: number): Program => {
      let blocks: Program = [{ id: 'leaf', type: 'forward' }]
      for (let i = 1; i < depth; i++) blocks = [{ id: `r${i}`, type: 'repeat', count: 2, body: blocks }]
      return blocks
    }
    const nodes = (count: number): Program => Array.from({ length: count }, (_, i) => ({ id: `f${i}`, type: 'forward' }))
    for (const blocks of [nested(10), nodes(60)]) expect(migrateV1toV2(serialize(blocks)).stages['1'].lastProgram.main).toEqual(blocks)
    for (const blocks of [nested(11), nodes(61), [...program, ...program]]) expect(migrateV1toV2(serialize(blocks)).stages['1']).toEqual({ completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } })
  })
  it('deletes both keys even when one removal throws and preserves settings', () => {
    const storage = fakeStorage(serialize())
    storage.setItem(settingsKey, '{"version":1,"lang":"en"}')
    const store = createProgressStore(storage)
    expect(store.clear()).toBe(true)
    expect(storage.getItem(progressKey)).toBeNull()
    expect(storage.getItem(progressV2Key)).toBeNull()
    expect(createProgressStore(storage).getLanguage()).toBe('en')
    const calls: string[] = []
    const failed = createProgressStore({ ...storage, removeItem(key) {
      calls.push(key)
      if (key === progressKey) throw Error('denied')
      storage.removeItem(key)
    } })
    expect(failed.clear()).toBe(false)
    expect(calls).toEqual([progressKey, progressV2Key])
  })
  it('keeps migrated progress in memory when migration write fails', () => {
    const storage = fakeStorage(serialize())
    const store = createProgressStore({ ...storage, setItem() { throw Error('quota') } })
    expect(store.persistent).toBe(false)
    expect(store.getProgram(stages[0])).toEqual(program)
    expect(storage.getItem(progressKey)).toBe(serialize())
    expect(storage.getItem(progressV2Key)).toBeNull()
  })
})

for (const mixed of [false, true]) {
  for (const depth of [9, 10]) {
    it(`preserves editor-created depth ${depth} ${mixed ? 'mixed if/repeat' : 'repeat'} code through saving and v1 migration`, () => {
      const editor = new EditorController()
      editor.configure([], () => {}, false)
      for (let level = 0; level < depth; level++) {
        editor.add(mixed && level % 2 === 0 ? 'if' : 'repeat')
        editor.select(editor.getSnapshot().addedId!)
        editor.toggleTarget()
      }
      const code = editor.program
      expect(editor.total).toBe(depth)
      const stage = mixed ? allStages.find(stage => stage.id === 'u2-1')! : stages[0]
      const storage = fakeStorage()
      createProgressStore(storage).saveProgram(stage.id, code)
      expect(createProgressStore(storage).getProgram(stage)).toEqual(code)
      const legacy = fakeStorage(JSON.stringify({ version: 1, stages: { [stage.id]: { completed: true, bestStars: 3, lastProgram: code } } }))
      expect(createProgressStore(legacy).getProgram(stage)).toEqual(code)
      expect(createProgressStore(legacy).getProgram(stage)).toEqual(code)
      expect(JSON.parse(legacy.getItem(progressV2Key)!).stages[stage.id].lastProgram.main).toEqual(code)
    })
  }
}

it('isolates saved palette violations while preserving completion, stars and other stages', () => {
  const storage = fakeStorage()
  storage.setItem(progressV2Key, JSON.stringify({ version: 2, stages: {
    'u3-3': { completed: true, bestStars: 3, lastProgram: { main: program, functions: [] } },
    'u3-1': { completed: true, bestStars: 2, lastProgram: { main: program, functions: [] } },
  } }))
  const repository = createProgressStore(storage)
  expect(repository.getProgress().stages['u3-3']).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
  expect(repository.getProgress().stages['u3-1'].lastProgram).toEqual(program)
  expect(repository.getProgram(allStages.find(stage => stage.id === 'u3-3')!)).toEqual([])
  const legacy = fakeStorage(JSON.stringify({ version: 1, stages: { 'u3-3': { completed: true, bestStars: 3, lastProgram: program } } }))
  expect(createProgressStore(legacy).getProgress().stages['u3-3']).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
})

it('validates mixed else/while depth, node, ID and branch shape boundaries', () => {
  // Structural bounds are independent of the stage's allowed commands.
  const read = (main: unknown) => ({ completed: true, bestStars: 3, lastProgram: validDocument({ main, functions: [] }) ? main : [] })
  const nested = (depth: number): Program => depth === 1 ? [{ id: 'leaf', type: 'forward' }] : depth % 2
    ? [{ id: `i${depth}`, type: 'if', condition: 'blockedAhead', body: [], else: nested(depth - 1) }]
    : [{ id: `w${depth}`, type: 'while', condition: 'clearAhead', body: nested(depth - 1) }]
  const nodes = (count: number): Program => [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [{ id: 'while', type: 'while', condition: 'clearAhead', body: Array.from({ length: count - 3 }, (_, i) => ({ id: `f${i}`, type: 'forward' })) }], else: [{ id: 'else-f', type: 'forward' }] }]
  for (const main of [nested(10), nodes(60)]) expect(read(main).lastProgram).toEqual(main)
  for (const main of [nested(11), nodes(61),
    [{ id: 'i', type: 'if', condition: 'blockedAhead', body: [{ id: 'same', type: 'forward' }], else: [{ id: 'same', type: 'forward' }] }],
    [{ id: 'i', type: 'if', condition: 'blockedAhead', body: [], else: {} }],
    [{ id: 'w', type: 'while', condition: 'clearAhead', body: [], else: [] }],
  ]) expect(read(main)).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
})

it('uses only stage palette blocks in every initial program', () => {
  for (const stage of allStages) {
    const visit = (blocks: Program) => {
      for (const block of blocks) {
        const palette = stage.palette ?? ['forward', 'turnLeft', 'turnRight', 'repeat', ...(stage.variants ? ['if'] : [])]
        expect(palette).toContain(block.type)
        if ('body' in block) visit(block.body)
        if (block.type === 'if' && block.else) visit(block.else)
      }
    }
    visit(stage.initialProgram ?? [])
  }
})

it('restores only effective unit palettes and permitted repeat sources while retaining awards', () => {
  const invalid = [
    { id: 'set', type: 'set', variable: 'A', value: 2 },
    { id: 'change', type: 'change', variable: 'A', by: -1 },
    { id: 'r', type: 'repeat', countVariable: 'A', body: [] },
    { id: 'outer', type: 'repeat', count: 2, body: [{ id: 'inner', type: 'repeat', countVariable: 'A', body: [] }] },
  ]
  for (const stage of allStages.filter(stage => !stage.id.startsWith('u5-'))) {
    for (const block of invalid) {
      const storage = fakeStorage()
      storage.setItem(progressV2Key, JSON.stringify({ version: 2, stages: {
        [stage.id]: { completed: true, bestStars: 3, lastProgram: { main: [block], functions: [] } },
        'u5-1': { completed: true, bestStars: 2, lastProgram: { main: [invalid[2]], functions: [] } },
      } }))
      const restored = createProgressStore(storage)
      expect(restored.getDocument(stage)).toEqual({ main: [], functions: [] })
      expect(restored.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
      expect(restored.getDocument(allStages.find(stage => stage.id === 'u5-1')!).main).toEqual([invalid[2]])
    }
  }
  for (const stage of allStages) {
    const storage = fakeStorage()
    const doc = { main: stage.solution, functions: stage.solutionFunctions ?? [] }
    storage.setItem(progressV2Key, JSON.stringify({ version: 2, stages: { [stage.id]: { completed: true, bestStars: 3, lastProgram: doc } } }))
    expect(createProgressStore(storage).getDocument(stage), stage.id).toEqual(doc)
  }
  const legacy = JSON.stringify({ version: 1, stages: { '1': { completed: true, bestStars: 3, lastProgram: [invalid[2]] } } })
  expect(parseProgress(legacy).stages['1']).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
})
