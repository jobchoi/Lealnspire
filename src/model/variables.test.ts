import { expect, it } from 'vitest'
import { run, runAll, failurePoint } from './interpreter'
import { Program, validDocument, FunctionProgram } from './program'
import { createBlock, cloneBlock } from './editor'
import { ProgressRepository, progressV2Key } from './ProgressRepository'
import { stages, unit4Stages } from './stages'
import unit4Baseline from './unit4-run.fixture.json'
import type { Block, Stage } from './types'

const stage: Stage = { ...stages[0], grid: ['S........................G'], startDir: 'E' }
const set = (value: number): Block => ({ id: 'set', type: 'set', variable: 'A', value })
const change: Block = { id: 'change', type: 'change', variable: 'A', by: 1 }
const forward: Block = { id: 'f', type: 'forward' }
const repeat = (body: Block[]): Block => ({ id: 'repeat', type: 'repeat', countVariable: 'A', body })

it('starts at zero and snapshots each frame after a stationary set/change', () => {
  const result = run(stage, [set(2), change, forward])
  expect(result.frames.map(frame => frame.variables)).toEqual([{ A: 0 }, { A: 2 }, { A: 3 }, { A: 3 }])
  expect(result.frames[1].variableChange).toEqual({ variable: 'A', from: 0, to: 2 })
  expect(result.frames[2].variableChange).toEqual({ variable: 'A', from: 2, to: 3 })
  expect(result.frames.slice(0, 3).map(frame => frame.pos)).toEqual(Array(3).fill({ x: 0, y: 0 }))
  expect(run(stage, []).frames[0].variables).toEqual({ A: 0 })
  result.frames[1].variables!.A = 19
  expect(result.frames[0].variables).toEqual({ A: 0 })
  expect(result.frames[2].variables).toEqual({ A: 3 })
  expect(run(stage, [set(2), { ...change, by: -1 }]).frames.at(-1)?.variableChange).toEqual({ variable: 'A', from: 2, to: 1 })
})
it('freezes repeat A on entry, permits zero iterations and includes loop context', () => {
  expect(run(stage, [repeat([forward])]).frames).toHaveLength(1)
  const result = run(stage, [set(2), repeat([change, forward])])
  expect(result.frames.at(-1)).toMatchObject({ variables: { A: 4 }, pos: { x: 2, y: 0 }, loops: [{ blockId: 'repeat', iteration: 2, count: 2 }] })
  expect(run(stage, [set(20), repeat([forward])]).frames.at(-1)?.pos.x).toBe(20)
})
it('stops on range errors, preserves the last valid value and attributes the cause', () => {
  for (const program of [[set(20), change, forward], [{ ...change, by: -1 } as Block, forward], [set(21), forward], [set(-1)], [set(0.5)]]) {
    const result = run(stage, program)
    expect(result.result).toBe('variableRange')
    expect(failurePoint(result)?.blockId).toBe(program[0].type === 'change' ? 'change' : program.length === 3 ? 'change' : 'set')
    expect(result.frames.at(-1)?.variables?.A).toBe(program.length === 3 ? 20 : 0)
  }
})
it('shares one A between function and main, preserves failure call context, resets variants', () => {
  const document = { main: [set(2), { id: 'call', type: 'call' as const, fn: 'fn' }, repeat([forward])], functions: [{ id: 'fn', icon: 'star' as const, body: [change] }] }
  const results = runAll({ ...stage, variants: [stage.grid, stage.grid] }, document).results
  for (const result of results) {
    expect(result.frames[0].variables).toEqual({ A: 0 })
    expect(result.frames.at(-1)?.pos.x).toBe(3)
    expect(result.frames[2]).toMatchObject({ call: { callId: 'call', fn: 'fn' }, variables: { A: 3 } })
  }
  document.main[0] = set(20)
  expect(failurePoint(run(stage, document))).toMatchObject({ blockId: 'change', call: { callId: 'call', fn: 'fn' } })
})
it('counts set/change toward the 1000 step cap', () => {
  const result = run(stage, [{ id: 'outer', type: 'repeat', count: 10, body: [{ id: 'middle', type: 'repeat', count: 10, body: [{ id: 'inner', type: 'repeat', count: 10, body: [set(0), { ...set(0), id: 'set2' }] }] }] }, change])
  expect(result.result).toBe('stepLimit')
  expect(result.frames).toHaveLength(1001)
  expect(result.frames.at(-1)?.variables).toEqual({ A: 0 })
})
it('validates v2 variable blocks, count-less repeats, palettes and immutable nested edits', () => {
  const main = [set(2), repeat([change, forward])]
  expect(validDocument({ main, functions: [] })).toBe(true)
  expect(Program.countBlocks(main)).toBe(4)
  for (const block of [{ ...set(2), value: '2' }, { ...repeat([]), countVariable: null }, { id: 'numeric', type: 'repeat', body: [] }, set(-1), set(21), set(1.2), { ...set(2), variable: 'B' }, { ...change, by: 2 }, { ...change, variable: 'B' }, { ...repeat([]), countVariable: 'B' }, { ...repeat([]), count: 1 }]) expect(validDocument({ main: [block], functions: [] })).toBe(false)
  expect(validDocument({ main, functions: [] }, ['forward', 'repeat'])).toBe(false)
  expect(createBlock([], 'set')).toEqual({ ...set(0), id: 'block-1' })
  expect(createBlock([], 'change')).toEqual({ ...change, id: 'block-1' })
  expect(cloneBlock(main, main[1]).id).not.toBe('repeat')
  const edited = Program.setVariableValue(main, [0], 20)
  expect(edited[0]).toEqual(set(20)); expect(main[0]).toEqual(set(2))
  expect(Program.toggleChange(main, [1, 0])[1]).toMatchObject({ body: [{ ...change, by: -1 }, forward] })
  expect(Program.setRepeatSource(main, [1], 'number')[1]).toEqual({ id: 'repeat', type: 'repeat', count: 3, body: [change, forward] })
  expect(Program.setRepeatSource(Program.setRepeatSource(main, [1], 'number'), [1], 'A')[1]).toMatchObject({ countVariable: 'A' })
  for (const value of [-1, 21, 0.5]) expect(() => Program.setVariableValue(main, [0], value)).toThrow()
  expect(new FunctionProgram({ main, functions: [] }).count()).toBe(4)
  const nested: Block[] = [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [], else: [set(2)] }]
  expect(Program.setVariableValue(nested, [0, -1, 0], 0)[0]).toMatchObject({ else: [set(0)] })
  expect(nested[0]).toMatchObject({ else: [set(2)] })
  expect(Program.toggleChange(Program.toggleChange([change], [0]), [0])).toEqual([change])
  for (const edit of [() => Program.setVariableValue([forward], [0], 1), () => Program.toggleChange([set(0)], [0]), () => Program.setRepeatSource([change], [0], 'A')]) expect(edit).toThrow()
})
it('roundtrips code only in v2, isolates corrupt variables while retaining completion', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const doc = { main: [set(2), repeat([change])], functions: [] }
  const repo = new ProgressRepository(storage)
  repo.completeStage(stage.id, 3, doc)
  run(stage, doc)
  expect(new ProgressRepository(storage).getDocument(stage)).toEqual(doc)
  const saved = JSON.parse(data.get(progressV2Key)!)
  expect(saved.version).toBe(2)
  expect(data.get(progressV2Key)).not.toContain('variables')
  saved.stages[stage.id].lastProgram.main[0].variable = 'B'
  data.set(progressV2Key, JSON.stringify(saved))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(stage)).toEqual({ main: [], functions: [] })
  expect(restored.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
})
it('unit 4 solutions retain their pre-variable frames with zero A added', () => {
  for (const puzzle of unit4Stages) {
    const result = runAll(puzzle, { main: puzzle.solution, functions: puzzle.solutionFunctions ?? [] })
    expect(result).toEqual(unit4Baseline[puzzle.id as keyof typeof unit4Baseline])
  }
})

const discardedMaps = [2, 4].map(length => Array.from({ length: 7 }, (_, y) =>
  Array.from({ length: 7 }, (_, x) => y === 0 ? x === 0 ? 'S' : x <= length ? '.' : '#' : x === length ? '.' : y === length && x === length + 1 ? 'G' : '#').join('')))
const discardedPuzzle: Stage = { ...stage, grid: discardedMaps[0], variants: discardedMaps }
it('retains the counterexample that discarded the old while puzzle: the five-block variable-free shortcut in the actual capped interpreter', () => {
  const shortcut: Block[] = [{ id: 'outer', type: 'repeat', count: 9, body: [
    { id: 'w', type: 'while', condition: 'clearAhead', body: [forward, { id: 'l', type: 'turnLeft' }] },
    { id: 'r', type: 'turnRight' },
  ] }]
  expect(Program.countBlocks(shortcut)).toBe(5)
  expect(runAll(discardedPuzzle, shortcut).results.map(result => result.result)).toEqual(['success', 'success'])
})
it('counts distance in while, then reuses it in repeat A for L=2 and L=4', () => {
  const program: Block[] = [set(0), { id: 'while', type: 'while', condition: 'clearAhead', body: [forward, change] }, { id: 'r', type: 'turnRight' }, repeat([{ ...forward, id: 'down' }]), { id: 'l', type: 'turnLeft' }, { ...forward, id: 'end' }]
  expect(Program.countBlocks(program)).toBe(9)
  expect(runAll(discardedPuzzle, program).results.map(result => result.result)).toEqual(['success', 'success'])
})
// Same start and local geometry; the corridor continues beyond either turn.
const maps = [2, 4].map(distance => [
  Array.from({ length: 8 }, (_, x) => x === distance ? 'G' : '#').join(''),
  'S......#',
  '########',
])
const puzzle: Stage = {
  ...stage, grid: maps[0], variants: maps, variantVariables: [{ A: 2 }, { A: 4 }],
  maxBlocks: 6, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'set', 'change'],
}
it('uses the map-provided A to turn at different goals with the same program', () => {
  const solution: Block[] = [repeat([forward]), { id: 'l', type: 'turnLeft' }, { ...forward, id: 'end' }]
  expect(Program.countBlocks(solution)).toBe(4) // repeat and its body each count as a block.
  expect(runAll(puzzle, solution).results.map(result => result.result)).toEqual(['success', 'success'])
  expect(runAll(puzzle, solution).results.map(result => result.frames[0].variables)).toEqual([{ A: 2 }, { A: 4 }])
  expect(run(puzzle, solution).result).toBe('success')
  const original = structuredClone(puzzle.variantVariables)
  const changed = runAll(puzzle, [change]).results
  expect(changed.map(result => result.frames.at(-1)?.variables)).toEqual([{ A: 3 }, { A: 5 }])
  expect(puzzle.variantVariables).toEqual(original)
  expect(runAll(puzzle, solution).result).toBe('success')
  expect(runAll({ ...puzzle, variantVariables: [{ A: 2 }] }, []).results.map(result => result.frames[0].variables)).toEqual([{ A: 2 }, { A: 0 }])
  for (const A of [-1, 21, 0.5]) expect(() => run({ ...stage, variantVariables: [{ A }] }, [])).toThrow('Invalid initial variable value')
})
it('exhausts sensor-free numeric-repeat transformations through six blocks without a joint solution', () => {
  const states: Array<{ map: number; x: number; y: number; dir: Stage['startDir'] }> = []
  maps.forEach((grid, map) => grid.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell !== '#' && cell !== 'G') for (const dir of ['N', 'E', 'S', 'W'] as const) states.push({ map, x, y, dir })
  })))
  const success = states.length, failure = success + 1
  const identity = Array.from({ length: failure + 1 }, (_, i) => i)
  const compose = (a: number[], b: number[]) => a.map(value => b[value])
  const directions = ['N', 'E', 'S', 'W'] as const
  const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
  const blocked = states.map(state => {
    const [dx, dy] = offsets[state.dir]
    const cell = maps[state.map][state.y + dy]?.[state.x + dx]
    return cell === undefined || cell === '#'
  })
  const commands = (['forward', 'turnLeft', 'turnRight'] as const).map(type => [
    ...states.map((state, i) => {
      if (type === 'forward' && blocked[i]) return failure
      const [dx, dy] = offsets[state.dir]
      const x = state.x + (type === 'forward' ? dx : 0), y = state.y + (type === 'forward' ? dy : 0)
      if (maps[state.map][y][x] === 'G') return success
      const dir = type === 'forward' ? state.dir : directions[(directions.indexOf(state.dir) + (type === 'turnRight' ? 1 : 3)) % 4]
      return states.findIndex(next => next.map === state.map && next.x === x && next.y === y && next.dir === dir)
    }), success, failure,
  ])
  const starts = maps.map((_, map) => states.findIndex(state => state.map === map && state.x === 0 && state.y === 1 && state.dir === 'E'))
  // Transformations are compared at every state, so replacing a body or tail
  // by its cheapest equivalent is valid even inside nested numeric repeats.
  // Goals and collisions absorb subsequent commands, as in the interpreter.
  const bySize: number[][][] = [[identity]]
  const seen = new Set([identity.join(',')])
  for (let size = 1; size <= puzzle.maxBlocks!; size++) {
    const current: number[][] = []
    const add = (transform: number[]) => {
      const key = transform.join(',')
      if (seen.has(key)) return
      expect(starts.every(index => transform[index] === success)).toBe(false)
      seen.add(key); current.push(transform)
    }
    for (const command of commands) for (const tail of bySize[size - 1]) add(compose(command, tail))
    for (let bodySize = 0; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
      let repeated = body
      for (let count = 2; count <= 10; count++) {
        repeated = compose(repeated, body)
        for (const tail of bySize[size - bodySize - 1]) add(compose(repeated, tail))
      }
    }
    bySize.push(current)
  }
  expect(bySize).toHaveLength(7)
  expect(bySize.every(list => list.length > 0)).toBe(true)
  expect(seen.size).toBeGreaterThan(100)
}, 120000)
