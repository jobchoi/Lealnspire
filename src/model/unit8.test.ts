import { expect, it } from 'vitest'
import { allStages, unit8Stages, unit7Stages, isLastStage } from './stages'
import { run, runAll, failurePoint } from './interpreter'
import { FunctionProgram, validDocument } from './program'
import { ProgressRepository, progressV2Key, isUnlocked } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import { continueStageIndex } from '../controller/flow'
import baseline from './unit1234567-run.fixture.json'
import type { Block, ProgramDocument } from './types'

const solution = (index = 0): ProgramDocument => structuredClone({ main: unit8Stages[index].solution, functions: unit8Stages[index].solutionFunctions! })
it('retains every unit 1–7 result and frame from the pre-T63 HEAD interpreter', () => {
  expect(baseline).toHaveLength(32)
  for (const entry of baseline) {
    const stage = allStages.find(stage => stage.id === entry.id)!
    expect(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] })).toEqual(entry.execution)
  }
})
it('solves six maps, records values and inputs, and fails both supplied repair maps as unfinished', () => {
  for (let i = 0; i < 3; i++) {
    const execution = runAll(unit8Stages[i], solution(i))
    expect(execution.results.map(result => result.result)).toEqual(['success', 'success'])
    expect(new FunctionProgram(solution(i)).count()).toBeLessThanOrEqual(unit8Stages[i].maxBlocks!)
    expect(execution.results.map(result => result.frames.flatMap(frame => frame.returned ? [frame.returned.value] : []))).toEqual(i === 2 ? [[2, 2], [4, 3]] : [[2], [4]])
    if (i === 1) expect(execution.results.every(result => result.frames.filter(frame => frame.returned).every(frame => frame.returned?.arg === 1))).toBe(true)
  }
  const stage = unit8Stages[2]
  expect(runAll(stage, { main: stage.initialProgram!, functions: stage.initialFunctions! }).results.map(result => result.result)).toEqual(['unfinished', 'unfinished'])
})
it('returns through nested repeats, discards statement results, freezes counts, and identifies missingReturn repeat', () => {
  const stage = { ...unit8Stages[0], grid: ['S....................G'], variants: undefined }
  const doc = solution()
  doc.functions[0].body = [{ id: 'nested', type: 'repeat', count: 3, body: [{ id: 'ret', type: 'return', value: { kind: 'number', value: 2 } }] }, { id: 'never', type: 'turnRight' }]
  doc.main = [{ id: 'repeat', type: 'repeat', countCall: { fn: 'star' }, body: [{ id: 'change', type: 'change', variable: 'A', by: 1 }, { id: 'f', type: 'forward' }] }]
  const execution = run(stage, doc)
  expect(execution.frames.at(-1)?.pos.x).toBe(2)
  expect(execution.frames.filter(frame => frame.returned)).toHaveLength(1)
  expect(execution.frames.some(frame => frame.activeBlockId === 'never')).toBe(false)
  expect(execution.frames.find(frame => frame.returned)?.returned).toMatchObject({ repeatId: 'repeat', blockId: 'ret', serial: 1, value: 2, skippedIds: ['never'] })
  doc.main = [{ id: 'statement', type: 'call', fn: 'star' }, { id: 'after', type: 'forward' }]
  expect(run(stage, doc).frames.at(-1)?.pos.x).toBe(1)
  doc.functions[0].body = []
  doc.main = [{ id: 'missing', type: 'repeat', countCall: { fn: 'star' }, body: [] }]
  const missing = run(stage, doc)
  expect(missing.result).toBe('missingReturn')
  expect(failurePoint(missing)?.blockId).toBe('missing')
  // Empty calls must consume budget too; return + numeric sensor have their own cost.
  doc.main = [{ id: 'outer', type: 'repeat', countVariable: 'A', body: [{ id: 'inner', type: 'repeat', countVariable: 'A', body: [{ id: 'deep', type: 'repeat', countVariable: 'A', body: [{ id: 'c', type: 'call', fn: 'star' }] }] }] }]
  expect(run(stage, doc, { A: 20 }).result).toBe('stepLimit')
  for (const value of [0, 20]) {
    doc.functions[0].body = [{ id: 'r', type: 'return', value: { kind: 'number', value } }]
    doc.main = [{ id: 'v', type: 'repeat', countCall: { fn: 'star' }, body: [{ id: 'f', type: 'forward' }] }]
    expect(run(stage, doc).frames.at(-1)?.pos.x).toBe(value)
  }
})
it('validates return contexts and isolates corrupt v2 code without losing completion or other stages', () => {
  const mutations: ((doc: ProgramDocument) => void)[] = [
    doc => { doc.main.push({ id: 'main-return', type: 'return', value: { kind: 'A' } }) },
    doc => { doc.functions[0].body = [{ id: 'r', type: 'return', value: { kind: 'param' } }] },
    doc => { doc.functions[0].body = [{ id: 'r', type: 'return', value: { kind: 'number', value: 21 } }] },
    doc => { doc.functions[0].body = [{ id: 'r', type: 'return', value: { kind: 'number', value: -1 } }] },
    doc => { doc.functions[0].body = [{ id: 'r', type: 'return', value: { kind: 'number', value: .5 } }] },
    doc => { doc.functions[0].body = [{ id: 'nested', type: 'repeat', countCall: { fn: 'star' }, body: [] }] },
    doc => { doc.functions[0].body = [{ id: 'nested', type: 'call', fn: 'star' }] },
    doc => { Object.assign(doc.main[0], { countCall: { fn: 'missing' } }) },
    doc => { Object.assign(doc.main[0], { countCall: { fn: 'star', arg: { kind: 'A' } } }) },
    doc => { Object.assign(doc.main[0], { countVariable: 'A' }) },
    doc => { Object.assign(doc.main[0], { countCall: { fn: 'star', extra: true } }) },
  ]
  expect(validDocument(solution())).toBe(true)
  for (const mutate of mutations) {
    const invalid = solution(); mutate(invalid)
    expect(validDocument(invalid)).toBe(false)
    const raw = JSON.stringify({ version: 2, stages: { 'u8-1': { completed: true, bestStars: 3, lastProgram: invalid }, 'u8-2': { completed: false, bestStars: 0, lastProgram: solution(1) }, 'u7-1': { completed: true, bestStars: 2, lastProgram: solution() } } })
    const store = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(store.getDocument(unit8Stages[0])).toEqual({ main: [], functions: [] })
    expect(store.getProgress().stages['u8-1']).toMatchObject({ completed: true, bestStars: 3 })
    expect(store.getDocument(unit8Stages[1])).toEqual(solution(1))
    expect(store.getDocument(unit7Stages[0])).toEqual({ main: [], functions: [] })
  }
  const doc = solution(1)
  const repeat = doc.main[0] as Extract<Block, { type: 'repeat' }>
  for (const arg of [undefined, { kind: 'number', value: 21 }, { kind: 'number', value: -1 }, { kind: 'number', value: .5 }, { kind: 'param' }, { kind: 'A', extra: 1 }]) {
    Object.assign(repeat.countCall!, { arg })
    expect(validDocument(doc)).toBe(false)
  }
})
it('opens unit 8 after unit 7, preserves undo and clears input use including value calls', () => {
  const store = new ProgressRepository()
  for (const stage of allStages.filter(stage => !stage.returns)) store.completeStage(stage.id, 3, { main: stage.solution, functions: stage.solutionFunctions ?? [] })
  const index = allStages.indexOf(unit8Stages[0])
  expect(isUnlocked(store.getProgress(), index)).toBe(true)
  expect(isUnlocked(store.getProgress(), index + 1)).toBe(false)
  expect(continueStageIndex(store.getProgress())).toBe(index)
  const game = new GameController(unit8Stages[0], store)
  game.edit(solution())
  game.editor.chooseFunction('star')
  game.editor.select('return')
  game.editor.setReturnValue({ kind: 'A' })
  expect(game.getSnapshot().doc.functions[0].body[0]).toMatchObject({ value: { kind: 'A' } })
  game.undo()
  expect(game.getSnapshot().doc).toEqual(solution())
  const doc = solution(1)
  doc.functions[0].body.push({ id: 'param-return', type: 'return', value: { kind: 'param' } })
  const cleaned = new FunctionProgram(doc).setParameter('star', false).toDocument()
  expect(validDocument(cleaned)).toBe(true)
  expect((cleaned.main[0] as Extract<Block, { type: 'repeat' }>).countCall?.arg).toBeUndefined()
  expect(cleaned.functions[0].body.at(-1)).toMatchObject({ value: { kind: 'number', value: 0 } })
  expect(isLastStage(index + 2)).toBe(true)
  game.dispose()
})

// Success and collision are absorbing: the real interpreter stops there as well.
// Exhausting this finite product graph covers every common F/L/R string, with no length bound.
for (const [index, expected] of [35, 35, 59].entries()) it(`exhausts all common motion strings for u8-${index + 1}: ${expected} states and no shared success`, () => {
  const maps = unit8Stages[index].variants!
  type State = [number, number, number] | 'goal' | 'collision'
  const start = maps.map(grid => {
    const y = grid.findIndex(row => row.includes('S'))
    return [grid[y].indexOf('S'), y, 1] as State
  })
  const move = (grid: string[], state: State, command: number): State => {
    if (typeof state === 'string') return state
    const [x, y, dir] = state
    if (command) return [x, y, (dir + (command === 1 ? 1 : 3)) % 4]
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir]
    const cell = grid[y + dy]?.[x + dx]
    return !cell || cell === '#' ? 'collision' : cell === 'G' ? 'goal' : [x + dx, y + dy, dir]
  }
  const queue = [start], seen = new Set([JSON.stringify(start)])
  for (let cursor = 0; cursor < queue.length; cursor++) {
    expect(queue[cursor]).not.toEqual(['goal', 'goal'])
    for (const command of [0, 1, 2]) {
      const next = maps.map((grid, i) => move(grid, queue[cursor][i], command))
      const key = JSON.stringify(next)
      if (!seen.has(key)) { seen.add(key); queue.push(next) }
    }
  }
  expect(seen.size).toBe(expected)
})
it('return-free palette programs emit a map-independent motion stream', () => {
  // A starts at 1 on both maps; only return may read the map. With no if/while,
  // all assignments, inputs, numeric/A/◆ repeats, and statement calls are deterministic.
  // A value call without return fails before its repeat body; it cannot supply map input.
  // Use open, unreachable-goal boards to observe the entire stream without early collision/goal truncation.
  const grids = [Array.from({ length: 61 }, (_, y) => '.'.repeat(61).split('').map((_, x) => x === 30 && y === 30 ? 'S' : x === 0 && y === 0 ? 'G' : '.').join('')), Array.from({ length: 63 }, (_, y) => '.'.repeat(63).split('').map((_, x) => x === 30 && y === 30 ? 'S' : x === 62 && y === 62 ? 'G' : '.').join(''))]
  for (let seed = 0; seed < 64; seed++) {
    const body: Block[] = [{ id: 'r', type: 'repeat', countParam: true, body: [{ id: 'f', type: 'forward' }, { id: 't', type: seed % 2 ? 'turnLeft' : 'turnRight' }] }]
    const doc: ProgramDocument = { main: [{ id: 'set', type: 'set', variable: 'A', value: seed % 5 }, { id: 'c', type: 'call', fn: 'star', arg: seed % 2 ? { kind: 'A' } : { kind: 'number', value: seed % 5 } }, { id: 'a', type: 'repeat', countVariable: 'A', body: [{ id: 't2', type: 'turnLeft' }] }, ...(seed % 3 ? [] : [{ id: 'v', type: 'repeat' as const, countCall: { fn: 'star', arg: { kind: 'A' as const } }, body: [] }])], functions: [{ id: 'star', icon: 'star', param: true, body }] }
    const streams = grids.map(grid => run({ ...unit8Stages[0], grid }, doc).frames.map(frame => [frame.activeBlockId, frame.event, frame.dir, frame.variables]))
    expect(streams[0]).toEqual(streams[1])
  }
})

it('counts stationary sensor cells including goals and boundaries; distinguishes A from copied ◆ return', () => {
  const doc = solution()
  doc.main = [{ id: 'c', type: 'call', fn: 'star' }]
  for (const [grid, expected] of [[['SG.'], 2], [['S#G'], 0], [['S' + '.'.repeat(21) + 'G'], 20]] as const) {
    const execution = run({ ...unit8Stages[0], grid: [...grid] }, doc)
    expect(execution.frames.at(-1)).toMatchObject({ pos: { x: 0, y: 0 }, sensorAhead: expected, returned: { value: expected } })
  }
  doc.main = [{ id: 'c', type: 'call', fn: 'star', arg: { kind: 'A' } }]
  doc.functions[0].param = true
  for (const [kind, value] of [['param', 1], ['A', 3]] as const) {
    doc.functions[0].body = [{ id: 's', type: 'set', variable: 'A', value: 3 }, { id: 'r', type: 'return', value: { kind } }]
    expect(run(unit8Stages[0], doc).frames.at(-1)).toMatchObject({ variables: { A: 3 }, call: { arg: 1 }, returned: { value } })
  }
})

// T63 GPT 검토 권장: 증명의 전제(팔레트에 센서 블록 없음, 맵마다 같은 A, 출발 방향)를 실제 스테이지에서 고정하고,
// return·앞 칸 수 센서도 실행 예산을 쓰는지 경계에서 확인한다(Claude 추가).
it('pins the proof premises on the real unit 8 stages', () => {
  for (const stage of unit8Stages) {
    expect(stage.palette).not.toContain('if')
    expect(stage.palette).not.toContain('while')
    expect(stage.startDir).toBe('E')
    expect(new Set(stage.variantVariables!.map(v => v.A)).size).toBe(1)
    expect(stage.variants!.length).toBe(2)
  }
})
it('charges return and the cells-ahead sensor against the step budget', () => {
  const stage = unit8Stages[0]
  const nest = (body: Block[]): Block[] => [{ id: 'a', type: 'repeat', count: 10, body: [{ id: 'b', type: 'repeat', count: 10, body: [{ id: 'c', type: 'repeat', count: 10, body }] }] }]
  for (const value of [{ kind: 'number' as const, value: 0 }, { kind: 'ahead' as const }]) {
    const doc: ProgramDocument = { main: nest([{ id: 'call', type: 'call', fn: 'star' }]), functions: [{ id: 'star', icon: 'star', body: [{ id: 'r', type: 'return', value }] }] }
    // 1000 calls × (call + return) > 1000 steps: stops at the budget instead of finishing the loops
    const execution = run(stage, doc)
    expect(execution.result).toBe('stepLimit')
    expect(execution.frames.filter(frame => frame.returned).length).toBeLessThan(1000)
  }
})
