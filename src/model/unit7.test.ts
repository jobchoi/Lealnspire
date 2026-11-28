import { expect, it } from 'vitest'
import { allStages, unit7Stages, unit6Stages, isLastStage } from './stages'
import { run, runAll } from './interpreter'
import { FunctionProgram, validDocument } from './program'
import { ProgressRepository, progressV2Key, progressV3Key, isUnlocked } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import { AppController } from '../controller/AppController'
import baseline from './unit123456-run.fixture.json'
import type { Block, ProgramDocument } from './types'

const withoutSerial = (value: unknown) => JSON.parse(JSON.stringify(value, (key, value) => key === 'serial' ? undefined : value))
const solution = (index = 0): ProgramDocument => structuredClone({ main: unit7Stages[index].solution, functions: unit7Stages[index].solutionFunctions! })
it('retains every pre-T60 unit 1–6 solution frame except added call serial metadata', () => {
  for (const entry of baseline) {
    const stage = allStages.find(stage => stage.id === entry.id)!
    expect(withoutSerial(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] }))).toEqual(entry.execution)
  }
})
it('passes all six maps within six blocks; the supplied u7-3 code collides on map 1 and overshoots on map 2', () => {
  for (let i = 0; i < 3; i++) {
    expect(runAll(unit7Stages[i], solution(i)).results.map(result => result.result)).toEqual(['success', 'success'])
    expect(new FunctionProgram(solution(i)).count()).toBe(6)
  }
  const stage = unit7Stages[2]
  const initial = runAll(stage, { main: stage.initialProgram!, functions: stage.initialFunctions! })
  expect(initial.results.map(result => result.result)).toEqual(['collision', 'collision'])
  expect(initial.failedVariant).toBe(0)
})
it('copies A per invocation, freezes the local count, allows zero and twenty, and never assigns to the input', () => {
  const stage = { ...unit7Stages[0], grid: ['S........................G'], variants: undefined }
  const doc = solution()
  doc.main = [{ id: 'outer', type: 'repeat', count: 2, body: [{ id: 'c', type: 'call', fn: 'star', arg: { kind: 'A' } }] }]
  doc.functions[0].body = [
    { id: 'repeat', type: 'repeat', countParam: true, body: [{ id: 'change', type: 'change', variable: 'A', by: 1 }, { id: 'f', type: 'forward' }] },
  ]
  const execution = run(stage, doc, { A: 2 })
  expect(execution.frames.filter(frame => frame.event === 'move').map(frame => [frame.call?.serial, frame.call?.arg, frame.variables?.A])).toEqual([[1, 2, 3], [1, 2, 4], [2, 4, 5], [2, 4, 6], [2, 4, 7], [2, 4, 8]])
  doc.functions[0].body = [{ id: 'repeat', type: 'repeat', countParam: true, body: [{ id: 'f', type: 'forward' }] }]
  for (const value of [0, 20]) {
    doc.main = [{ id: 'c', type: 'call', fn: 'star', arg: { kind: 'number', value } }]
    const execution = run(stage, doc, { A: 4 })
    expect(execution.frames.at(-1)?.pos.x).toBe(value)
    expect(execution.frames.every(frame => frame.variables?.A === 4)).toBe(true)
  }
})
it('rejects invalid parameter contexts and isolates corrupt stage code while preserving progress', () => {
  const valid = solution()
  const mutations: ((doc: ProgramDocument) => void)[] = [
    doc => { delete (doc.main[0] as Extract<Block, { type: 'call' }>).arg },
    doc => { (doc.main[0] as Extract<Block, { type: 'call' }>).arg = { kind: 'number', value: 21 } },
    doc => { (doc.main[0] as Extract<Block, { type: 'call' }>).arg = { kind: 'number', value: -1 } },
    doc => { (doc.main[0] as Extract<Block, { type: 'call' }>).arg = { kind: 'number', value: 0.5 } },
    doc => { doc.main.push({ id: 'illegal', type: 'repeat', countParam: true, body: [] }) },
    doc => { doc.main = []; delete doc.functions[0].param },
    doc => { doc.functions[0].body.push({ id: 'nested-call', type: 'call', fn: 'star', arg: { kind: 'A' } }) },
    doc => { (doc.main[0] as Extract<Block, { type: 'call' }>).fn = 'unknown' },
    doc => { (doc.functions[0].body[0] as Extract<Block, { type: 'repeat' }>).countVariable = 'A' },
    doc => { Object.assign((doc.main[0] as Extract<Block, { type: 'call' }>).arg!, { extra: 1 }) },
  ]
  expect(validDocument(valid)).toBe(true)
  for (const mutate of mutations) {
    const invalid = structuredClone(valid); mutate(invalid)
    expect(validDocument(invalid)).toBe(false)
    const raw = JSON.stringify({ version: 2, stages: { 'u7-1': { completed: true, bestStars: 3, lastProgram: invalid }, 'u7-2': { completed: false, bestStars: 0, lastProgram: valid } } })
    const store = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(store.getDocument(unit7Stages[0])).toEqual({ main: [], functions: [] })
    expect(store.getProgress().stages['u7-1']).toMatchObject({ completed: true, bestStars: 3 })
    expect(store.getDocument(unit7Stages[1])).toEqual(valid)
  }
  const noInput = new FunctionProgram(valid).setParameter('star', false).toDocument()
  ;(noInput.main[0] as Extract<Block, { type: 'call' }>).arg = { kind: 'A' }
  expect(validDocument(noInput)).toBe(false)
  for (const stage of allStages.filter(stage => !stage.params)) {
    const raw = JSON.stringify({ version: 2, stages: { [stage.id]: { completed: true, bestStars: 2, lastProgram: valid } } })
    const store = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(store.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(store.getProgress().stages[stage.id].bestStars).toBe(2)
  }
  let saved = ''
  const storage = { getItem: (key: string) => key === (JSON.parse(saved || 'null')?.version === 3 ? progressV3Key : progressV2Key) ? saved || null : null, setItem: (key: string, value: string) => { if (key === progressV3Key) saved = value } }
  new ProgressRepository(storage).saveProgram('u7-1', valid)
  expect(new ProgressRepository(storage).getDocument(unit7Stages[0])).toEqual(valid)
  expect(JSON.parse(saved).version).toBe(3)
})
it('cleans only the selected input and its nested call arguments, supports undo and source cycling', () => {
  const doc = solution()
  doc.functions.push({ id: 'moon', icon: 'moon', param: true, body: [{ id: 'moon-repeat', type: 'repeat', countParam: true, body: [] }] })
  doc.main = [{ id: 'outer', type: 'repeat', count: 2, body: [doc.main[0]] }, { id: 'moon-call', type: 'call', fn: 'moon', arg: { kind: 'A' } }]
  const disabled = new FunctionProgram(doc).setParameter('star', false).toDocument()
  expect(disabled.functions[0]).not.toHaveProperty('param')
  expect(disabled.functions[0].body[0]).toMatchObject({ count: 3 })
  expect(disabled.functions[0].body[0]).not.toHaveProperty('countParam')
  expect((disabled.main[0] as Extract<Block, { type: 'repeat' }>).body[0]).not.toHaveProperty('arg')
  expect(disabled.functions[1]).toEqual(doc.functions[1])
  expect(disabled.main[1]).toEqual(doc.main[1])
  expect(doc.functions[0].param).toBe(true)
  const game = new GameController(unit7Stages[0], new ProgressRepository())
  game.edit(solution())
  game.editor.toggleParameter('star')
  expect(game.getSnapshot().doc.functions[0].param).toBeUndefined()
  game.editor.undo()
  expect(game.getSnapshot().doc).toEqual(solution())
  game.editor.chooseFunction('star'); game.editor.select('repeat')
  const beforeSource = structuredClone(game.getSnapshot().doc)
  game.editor.toggleRepeatSource(); expect(game.editor.selectedBlock).toMatchObject({ count: 3 })
  game.editor.undo()
  expect(game.getSnapshot().doc).toEqual(beforeSource)
  game.editor.chooseFunction('star'); game.editor.select('repeat')
  game.editor.toggleRepeatSource()
  game.editor.toggleRepeatSource(); expect(game.editor.selectedBlock).toMatchObject({ countVariable: 'A' })
  game.editor.toggleRepeatSource(); expect(game.editor.selectedBlock).toMatchObject({ countParam: true })
  game.editor.chooseFunction(); game.editor.select('call-0')
  const beforeArgument = structuredClone(game.getSnapshot().doc)
  game.editor.setCallArgument({ kind: 'number', value: 20 })
  expect(game.getSnapshot().doc.main[0]).toMatchObject({ arg: { kind: 'number', value: 20 } })
  game.editor.undo()
  expect(game.getSnapshot().doc).toEqual(beforeArgument)
  game.editor.chooseFunction(); game.editor.select('call-0'); game.editor.setCallArgument({ kind: 'A' })
  game.editor.undo()
  expect(game.getSnapshot().doc).toEqual(beforeArgument)
  game.editor.toggleParameter('star'); game.editor.toggleParameter('star')
  expect(game.getSnapshot().doc.main[0]).toMatchObject({ arg: { kind: 'number', value: 2 } })
  game.dispose()
})
it('unlocks after unit 6, continues sequentially, saves three stars and returns to the list after unit 7', () => {
  const store = new ProgressRepository(), app = new AppController(store)
  const index = allStages.indexOf(unit7Stages[0])
  for (const stage of allStages.slice(0, allStages.indexOf(unit6Stages.at(-1)!))) store.completeStage(stage.id, 3, stage.solution)
  expect(isUnlocked(store.getProgress(), index)).toBe(false)
  store.completeStage(unit6Stages.at(-1)!.id, 3, unit6Stages.at(-1)!.solution)
  expect(app.continueIndex).toBe(index)
  expect(isUnlocked(store.getProgress(), index)).toBe(true)
  expect(isUnlocked(store.getProgress(), index + 1)).toBe(false)
  for (let i = 0; i < 3; i++) {
    app.openStage(index + i); app.game!.edit(solution(i))
    for (let steps = 0; steps < 200 && !app.game!.finished; steps++) app.game!.step()
    expect(app.game!.finished).toBe(true)
    expect(store.getProgress().stages[unit7Stages[i].id]).toMatchObject({ completed: true, bestStars: 3 })
    app.next()
  }
  expect(isLastStage(index + 2)).toBe(true)
  expect(app.getSnapshot()).toEqual({ page: 'list' })
  expect(allStages[app.continueIndex!].id).toBe('u8-1')
})

// Each map's A is immutable in this grammar. State includes its map-specific A
// (2 or 4) and every reachable pose; success/collision are absorbing. Repeats
// freeze that A and composition includes empty bodies and arbitrary nesting.
// Definitions are enumerated independently from call-containing main programs.
// Unused definitions can be dropped. A single syntactic call (even in a repeat)
// can be inlined at a lower cost. Thus one used body needs <=4 nodes when main
// has >=2 call nodes; two used bodies together need <=4 nodes because main has
// at least two call nodes. Empty bodies and both star/moon body combinations
// are included. Zero/one-node bodies could be inlined but are retained here.
for (const stage of unit7Stages) it(`${stage.id}: exhausts parameter-free documents through six nodes`, () => {
  const grids = stage.variants!
  const states = grids.flatMap((grid, map) => grid.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' || cell === 'G' ? [] : [0, 1, 2, 3].map(dir => ({ map, x, y, dir, A: stage.variantVariables![map].A })))))
  const success = states.length, failure = success + 1
  type Transform = number[]
  const identity = Array.from({ length: failure + 1 }, (_, i) => i)
  const poseIndex = new Map(states.map((p, i) => [`${p.map},${p.x},${p.y},${p.dir},${p.A}`, i]))
  const starts = grids.map((grid, map) => states.findIndex(p => p.map === map && grid[p.y][p.x] === 'S' && p.dir === 1))
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  const primitives = [0, 1, 2].map(type => [...states.map(p => {
    const [dx, dy] = offsets[p.dir]
    const x = p.x + (type === 0 ? dx : 0), y = p.y + (type === 0 ? dy : 0)
    const cell = grids[p.map][y]?.[x]
    return !cell || cell === '#' ? failure : cell === 'G' ? success : poseIndex.get(`${p.map},${x},${y},${type === 0 ? p.dir : (p.dir + (type === 1 ? 3 : 1)) % 4},${p.A}`)!
  }), success, failure])
  let work = 0, definitions = 0, pairs = 0, candidates = 0
  const compose = (a: Transform, b: Transform) => {
    if (++work > 1_000_000) throw new Error('Proof work budget exceeded')
    return a.map(value => b[value])
  }
  function enumerate(limit: number, commands: Transform[]) {
    const bySize: Transform[][] = [[identity]], seen = new Set([String.fromCharCode(...identity)])
    for (let size = 1; size <= limit; size++) {
      const current: Transform[] = []
      const add = (transform: Transform) => {
        candidates++
        if (starts.every(i => transform[i] === success)) throw new Error(`${stage.id} shortcut size ${size}`)
        const key = String.fromCharCode(...transform)
        if (!seen.has(key)) { seen.add(key); current.push(transform) }
      }
      for (const command of commands) for (const tail of bySize[size - 1]) add(compose(command, tail))
      for (let bodySize = 0; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
        const powers = [identity]
        for (let count = 1; count <= 10; count++) powers.push(compose(powers[count - 1], body))
        const variable = identity.map(i => i >= success ? i : powers[states[i].A][i])
        for (const tail of bySize[size - bodySize - 1]) {
          for (let count = 2; count <= 10; count++) add(compose(powers[count], tail))
          add(compose(variable, tail))
        }
      }
      bySize.push(current)
    }
    return bySize
  }
  const plain = enumerate(6, primitives)
  for (let size = 2; size <= 4; size++) for (const body of plain[size]) { definitions++; enumerate(6 - size, [...primitives, body]) }
  for (let left = 0; left <= 4; left++) for (let right = 0; right <= 4 - left; right++) {
    for (const star of plain[left]) for (const moon of plain[right]) {
      pairs++; enumerate(6 - left - right, [...primitives, star, moon])
    }
  }
  console.info(`${stage.id}: states=${states.length}, plain=${plain.map(a => a.length)}, definitions=${definitions}, pairs=${pairs}, candidates=${candidates}, work=${work}, solutions=0`)
  expect(work).toBeLessThan(1_000_000)
  expect(definitions).toBeGreaterThan(0)
}, 120000)


it('T66: disabling input cleans nested diamond repeats and else calls, restoring retained numbers', () => {
  const doc: ProgramDocument = {
    main: [{ id: 'branch', type: 'if', condition: 'blockedAhead', body: [], else: [{ id: 'c', type: 'call', fn: 'star', arg: { kind: 'A' } }] }],
    functions: [{ id: 'star', icon: 'star', param: true, body: [{ id: 'outer', type: 'repeat', count: 7, countParam: true, body: [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [{ id: 'inner', type: 'repeat', countParam: true, body: [] }], else: [{ id: 'else-repeat', type: 'repeat', count: 9, countParam: true, body: [] }] }] }] }],
  }
  const expected = structuredClone(doc)
  delete expected.functions[0].param
  const outer = expected.functions[0].body[0] as Extract<Block, { type: 'repeat' }>
  delete outer.countParam
  const branch = outer.body[0] as Extract<Block, { type: 'if' }>
  for (const block of [...branch.body, ...branch.else!]) if (block.type === 'repeat') { delete block.countParam; block.count ??= 3 }
  const main = expected.main[0] as Extract<Block, { type: 'if' }>
  if (main.else![0].type === 'call') delete main.else![0].arg
  expect(new FunctionProgram(doc).setParameter('star', false).toDocument()).toEqual(expected)
  expect(doc.functions[0].param).toBe(true)
})

it('T66: non-params stages independently reject input, argument and diamond fields', () => {
  const plain: ProgramDocument = { main: [{ id: 'c', type: 'call', fn: 'star' }], functions: [{ id: 'star', icon: 'star', body: [] }] }
  const cases = [
    { main: [], functions: [{ id: 'star', icon: 'star', param: true, body: [] }] },
    { ...plain, main: [{ ...plain.main[0], arg: { kind: 'A' } }] },
    { main: [{ id: 'r', type: 'repeat', count: 3, countParam: true, body: [] }], functions: [] },
  ]
  for (const stage of allStages.filter(stage => !stage.params)) for (const lastProgram of cases) {
    const raw = JSON.stringify({ version: 2, stages: { [stage.id]: { completed: true, bestStars: 2, lastProgram } } })
    const store = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(store.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(store.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 2 })
  }
})

it('T66: branch checks belong to the current invocation of a repeated call block', () => {
  const stage = { ...unit7Stages[0], variants: undefined, grid: ['S...G'] }
  const game = new GameController(stage, new ProgressRepository())
  game.edit({ main: [{ id: 'repeat-call', type: 'repeat', count: 2, body: [{ id: 'c', type: 'call', fn: 'star', arg: { kind: 'number', value: 2 } }] }], functions: [{ id: 'star', icon: 'star', param: true, body: [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [], else: [{ id: 'f', type: 'forward' }] }] }] })
  const observed: number[] = []
  const checks: number[] = []
  for (let step = 0; step < 50 && !game.finished; step++) {
    game.step()
    const frame = game.frame
    if (frame?.check) {
      checks.push(frame.call!.serial)
      expect(game.branchChecks).toEqual([frame.check])
    }
    if (frame?.event === 'move') {
      observed.push(frame.call!.serial)
      expect(game.branchChecks).toEqual([expect.objectContaining({ blockId: 'if', result: false })])
    }
    if (!frame?.call) expect(game.branchChecks).toEqual([])
  }
  expect(checks).toEqual([1, 2])
  expect(observed).toEqual([1, 2])
  game.dispose()
})
