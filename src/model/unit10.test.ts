import { expect, it } from 'vitest'
import { allStages, unit10Stages, unit11Stages } from './stages'
import { run, runAll, failurePoint } from './interpreter'
import { countBlocks, validDocument } from './program'
import baseline from './unit123456789-run.fixture.json'
import type { Block } from './types'
import { ProgressRepository, progressV2Key, progressV4Key, isUnlocked } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import { continueStageIndex } from '../controller/flow'

it('preserves all 38 unit 1–9 solutions including every frame', () => {
  expect(baseline).toHaveLength(38)
  for (const entry of baseline) {
    const stage = allStages.find(stage => stage.id === entry.id)!
    expect(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] })).toEqual(entry.execution)
  }
})
it('solves 6/6 maps, fixes both initial collisions and locks proof assumptions', () => {
  for (const stage of unit10Stages) {
    expect(runAll(stage, stage.solution).results.map(r => r.result)).toEqual(['success', 'success'])
    expect(countBlocks(stage.solution)).toBe(stage.maxBlocks)
    expect(stage.variantVariables).toEqual([{ A: 0 }, { A: 0 }])
    expect(stage.palette).toEqual(['forward', 'turnLeft', 'turnRight', 'repeat', 'set', 'change', 'forEach'])
  }
  expect(runAll(unit10Stages[1], unit10Stages[1].initialProgram!).results.map(r => r.result)).toEqual(['collision', 'collision'])
  // Counterexample: A=2/4 supplies map information. repeat A [F], L, F
  // solves u10-2 and u10-3 without lists. The proof requires identical A=0.
  const bypass: Block[] = [{ id: 'r', type: 'repeat', countVariable: 'A', body: [{ id: 'f', type: 'forward' }] }, { id: 'l', type: 'turnLeft' }, { id: 'g', type: 'forward' }]
  for (const stage of unit10Stages.slice(1)) expect(runAll({ ...stage, variantVariables: [{ A: 2 }, { A: 4 }] }, bypass).result).toBe('success')
})
// Without lists, equal initial A and the sensor/call-free palette produce the
// same motion string (including all assignments, empty/nested repeats). BFS
// covers a superset of that grammar regardless of code or execution budgets.
for (const [index, expected] of [59, 35, 35].entries()) it(`exhausts all common motion strings for u10-${index + 1}: ${expected} states and no shared success`, () => {
  const maps = unit10Stages[index].variants!
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

it('reports indexRange at length, preserves cause, and rejects malformed lists/sources', () => {
  const stage = { ...unit10Stages[1], variants: undefined, lists: [[2, 1]] }
  const repeat: Block = { id: 'r', type: 'repeat', countSource: 'listAtA', body: [] }
  const execution = run(stage, [repeat], { A: 2 })
  expect(execution.result).toBe('indexRange')
  expect(execution.frames.at(-1)?.list?.read).toEqual({ blockId: 'r', source: 'listAtA', index: 2, length: 2, error: true })
  expect(failurePoint(execution)?.blockId).toBe('r')
  expect(run(stage, [repeat], { A: 1 }).result).toBe('unfinished')
  for (const lists of [[], [[]], [[11]], [[-1]], [[1.5]], [[1,2,3,4,5,6]]]) expect(() => run({ ...stage, lists }, [])).toThrow()
  expect(() => runAll({ ...unit10Stages[0], lists: [[1]] }, [])).toThrow()
  expect(validDocument({ main: [{ ...repeat, count: 2 }], functions: [] })).toBe(false)
  expect(validDocument({ main: [{ ...repeat, countSource: 'current' }], functions: [] })).toBe(false)
})
it('restores nested current scope, freezes source values, and bounds empty visits/evaluations', () => {
  const stage = { ...unit10Stages[0], variants: undefined, lists: [[0, 2]], grid: ['S#G'] }
  const program: Block[] = [{ id: 'outer', type: 'forEach', body: [{ id: 'inner', type: 'forEach', body: [] }, { id: 'r', type: 'repeat', countSource: 'current', body: [{ id: 'turn', type: 'turnLeft' }] }] }]
  const execution = run(stage, program)
  expect(execution.frames.filter(f => f.list?.read?.blockId === 'r' && f.activeBlockId === 'r').map(f => f.list?.read?.value)).toEqual([0, 2])
  expect(execution.frames.at(-1)?.list).toEqual({})
  const freeze: Block[] = [{ id: 'r', type: 'repeat', countSource: 'listAtA', body: [{ id: 's', type: 'set', variable: 'A', value: 1 }] }]
  const fixed = run({ ...stage, lists: [[3, 0]] }, freeze)
  expect(fixed.frames.filter(f => f.activeBlockId === 's')).toHaveLength(3)
  let deep: Block = { id: 'each', type: 'forEach', body: [] }
  for (let n = 0; n < 4; n++) deep = { id: `r${n}`, type: 'repeat', count: 10, body: [deep] }
  expect(run(stage, [deep]).result).toBe('stepLimit')
  const turns: Block = { id: 'r', type: 'repeat', count: 10, body: [{ id: 'r2', type: 'repeat', count: 10, body: [{ id: 'r3', type: 'repeat', count: 10, body: [{ id: 't', type: 'turnLeft' }] }] }] }
  expect(run(stage, [turns, { id: 'read', type: 'repeat', countSource: 'listLength', body: [] }]).result).toBe('stepLimit')
})

it('isolates invalid list code, preserves awards/other stages and restores v2 list documents', () => {
  let raw = ''
  const storage = { getItem: (key: string) => key === (JSON.parse(raw || 'null')?.version === 4 ? progressV4Key : progressV2Key) ? raw || null : null, setItem: (key: string, value: string) => { if (key === progressV4Key) raw = value } }
  const good = { main: unit10Stages[0].solution, functions: [] }
  const repeat = { id: 'r', type: 'repeat', countSource: 'listAtA', body: [] }
  const invalid = [
    { main: [{ ...repeat, countSource: 'current' }], functions: [] },
    ...['count', 'countVariable', 'countParam', 'countCall'].map(key => ({ main: [{ ...repeat, [key]: key === 'count' ? 2 : key === 'countVariable' ? 'A' : key === 'countParam' ? true : { fn: 'f' } }], functions: [] })),
    { main: [{ ...repeat, countSource: 'unknown' }], functions: [] },
    { main: [{ ...repeat, type: 'forward' }], functions: [] },
    { main: [{ id: 'e', type: 'forEach', body: [{ ...repeat, id: 'e' }] }], functions: [] },
  ]
  for (const bad of invalid) {
    raw = JSON.stringify({ version: 2, stages: { 'u10-1': { completed: true, bestStars: 3, lastProgram: bad }, 'u10-2': { completed: false, bestStars: 1, lastProgram: good } } })
    const repo = new ProgressRepository(storage)
    expect(repo.getDocument(unit10Stages[0])).toEqual({ main: [], functions: [] })
    expect(repo.getProgress().stages['u10-1']).toMatchObject({ completed: true, bestStars: 3 })
    expect(repo.getDocument(unit10Stages[1])).toEqual(good)
  }
  for (const stage of allStages.filter(s => !s.lists)) {
    raw = JSON.stringify({ version: 2, stages: { [stage.id]: { completed: true, bestStars: 2, lastProgram: { main: [repeat], functions: [] } } } })
    const repo = new ProgressRepository(storage)
    expect(repo.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(repo.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 2 })
  }
  const repo = new ProgressRepository(storage)
  repo.saveProgram('u10-1', good)
  expect(JSON.parse(raw).version).toBe(4)
  expect(new ProgressRepository(storage).getDocument(unit10Stages[0])).toEqual(good)
})
it('opens after unit9, edits list sources in lexical scope with undo, and saves after both maps', () => {
  const repo = new ProgressRepository()
  for (const stage of allStages.slice(0, allStages.indexOf(unit10Stages[0]) - 1)) repo.completeStage(stage.id, 3, [])
  expect(isUnlocked(repo.getProgress(), allStages.indexOf(unit10Stages[0]))).toBe(false)
  repo.completeStage('u9-3', 3, [])
  for (const stage of unit10Stages) {
    expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(stage))
    expect(isUnlocked(repo.getProgress(), allStages.indexOf(stage))).toBe(true)
    const game = new GameController(stage, repo)
    if (stage.id === 'u10-1') {
      game.editor.add('forEach'); game.editor.select('block-1'); game.editor.toggleTarget(); game.editor.add('repeat')
      game.editor.select('block-2'); game.editor.toggleRepeatSource(); game.editor.toggleRepeatSource()
      expect(game.editor.selectedBlock).toMatchObject({ countSource: 'current' })
      game.undo()
      expect(game.editor.selectedBlock).toMatchObject({ countVariable: 'A' })
    } else if (stage.initialProgram) {
      game.editor.select('set'); game.editor.setVariableValue(0)
      expect(game.getSnapshot().program).toEqual(stage.solution)
      game.undo(); expect(game.getSnapshot().program).toEqual(stage.initialProgram)
    } else {
      game.editor.add('repeat'); game.editor.select('block-1')
      const sources: (string | undefined)[] = []
      for (let i = 0; i < 4; i++) { game.editor.toggleRepeatSource(); const block = game.editor.selectedBlock; sources.push(block?.type === 'repeat' ? block.countSource ?? block.countVariable : undefined) }
      expect(sources).toEqual(['A', 'listAtA', 'listLength', undefined])
    }
    game.edit(stage.solution); game.step()
    expect(repo.getProgress().stages[stage.id]?.completed).not.toBe(true)
    while (!game.finished) game.step()
    expect(game.result).toBe('success')
    expect(repo.getProgress().stages[stage.id].bestStars).toBe(0)
    game.reset(); expect(game.frame?.list).toBeUndefined()
    game.selectVariant(1); expect(game.frame?.list).toBeUndefined()
    game.dispose()
  }
  expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(unit11Stages[0]))
})
it('charges exactly one step for each visit and source read, including zero-count bodies', () => {
  const stage = { ...unit10Stages[0], variants: undefined, lists: [[0]], grid: ['S#G'] }
  const body: Block[] = [{ id: 'read', type: 'repeat', countSource: 'current', body: [] }, ...Array.from({ length: 8 }, (_, i): Block => ({ id: `t${i}`, type: 'turnLeft' }))]
  const prefix: Block[] = [{ id: 'r1', type: 'repeat', count: 10, body: [{ id: 'r2', type: 'repeat', count: 10, body: [{ id: 'each', type: 'forEach', body }] }] }]
  const exact = run(stage, prefix)
  expect(exact.result).toBe('unfinished') // 100 visits + 100 reads + 800 turns = 1000
  expect(exact.frames.filter(f => f.activeBlockId === 'read')).toHaveLength(100)
  expect(exact.frames.filter(f => f.event === 'turn')).toHaveLength(800)
  for (const extra of [{ id: 'lastEach', type: 'forEach', body: [] }, { id: 'lastRead', type: 'repeat', countSource: 'listLength', body: [] }] as Block[]) {
    const limited = run(stage, [...prefix, extra])
    expect(limited.result).toBe('stepLimit')
    expect(limited.frames).toEqual(exact.frames)
  }
  // Repeat-entry guard alone still stops empty numeric nesting before visits.
  const empty: Block = { id: 'n1', type: 'repeat', count: 10, body: [{ id: 'n2', type: 'repeat', count: 10, body: [{ id: 'n3', type: 'repeat', count: 10, body: [] }] }] }
  expect(run(stage, [empty]).result).toBe('stepLimit')
})
it('enforces current lexical scope, body structure, depth and shared node budget', () => {
  const current: Block = { id: 'read', type: 'repeat', countSource: 'current', body: [] }
  const doc = (main: Block[]) => ({ main, functions: [] })
  expect(validDocument(doc([{ id: 'each', type: 'forEach', body: [current] }, { ...current, id: 'outside' }]))).toBe(false)
  expect(validDocument({ main: [], functions: [{ id: 'fn', icon: 'star', body: [{ ...current, countSource: 'listLength' }] }] })).toBe(false)
  expect(validDocument(doc([{ id: 'each', type: 'forEach', body: null } as unknown as Block]))).toBe(false)
  let nested: Block = { id: 'base', type: 'forEach', body: [] }
  for (let i = 1; i < 10; i++) nested = { id: `depth${i}`, type: 'forEach', body: [nested] }
  expect(validDocument(doc([nested]))).toBe(true)
  expect(validDocument(doc([{ id: 'too-deep', type: 'forEach', body: [nested] }]))).toBe(false)
  const nodes = Array.from({ length: 60 }, (_, i): Block => ({ id: `node${i}`, type: 'forEach', body: [] }))
  expect(validDocument(doc(nodes))).toBe(true)
  expect(validDocument(doc([...nodes, { id: 'extra', type: 'forEach', body: [] }]))).toBe(false)
  expect(run({ ...unit10Stages[0], variants: undefined, lists: [[10]] }, [{ id: 'neg', type: 'change', variable: 'A', by: -1 }, { id: 'read', type: 'repeat', countSource: 'listAtA', body: [] }]).result).toBe('variableRange')
  const before = structuredClone(unit10Stages)
  for (const stage of unit10Stages) runAll(stage, stage.solution)
  expect(unit10Stages).toEqual(before)
})

// T69 GPT 검토 권장(Claude 추가): 안쪽 순회 몸체에서도 ▣는 가장 안쪽 원소, 증명 전제의 출발 방향 고정
it('uses the innermost current value inside a nested for each body', () => {
  const stage = { ...unit10Stages[0], variants: undefined, lists: [[2, 3]], grid: ['S#G'] }
  const program: Block[] = [{ id: 'outer', type: 'forEach', body: [{ id: 'inner', type: 'forEach', body: [{ id: 'r', type: 'repeat', countSource: 'current', body: [{ id: 'turn', type: 'turnLeft' }] }] }] }]
  const reads = run(stage, program).frames.filter(f => f.list?.read?.blockId === 'r' && f.activeBlockId === 'r').map(f => f.list?.read?.value)
  // 바깥 2회 × 안쪽 [2, 3] → 안쪽 원소가 차례로 읽힘
  expect(reads).toEqual([2, 3, 2, 3])
})
it('pins the start direction assumed by the proof', () => {
  for (const stage of unit10Stages) expect(stage.startDir).toBe('E')
})
