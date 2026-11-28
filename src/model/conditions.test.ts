import { expect, it } from 'vitest'
import { failurePoint, run, runAll } from './interpreter'
import { cloneBlock, createBlock, findBlockPath } from './editor'
import { Program, addBlock, countBlocks, deleteBlock, moveBlock } from './program'
import { ProgressRepository, progressV2Key, progressV3Key } from './ProgressRepository'
import baseline from './unit1-run.fixture.json'
import { allStages, stages, unit2Stages } from './stages'
import type { Block, Stage } from './types'

const f: Block = { id: 'f', type: 'forward' }
const r: Block = { id: 'r', type: 'turnRight' }
const iff = (body: Block[] = [], id = 'if'): Block => ({ id, type: 'if', condition: 'blockedAhead', body })
const loop = (body: Block[], count = 2): Block => ({ id: 'loop', type: 'repeat', count, body })
const stage = (grid: string[], startDir: Stage['startDir'] = 'E'): Stage => ({ ...stages[0], grid, startDir })
const puzzle: Stage = { ...stage(['S..#', '##.#', '##G#']), variants: [['S..#', '##.#', '##G#'], ['S.##', '#.##', '#.##', '#G##']] }

it('checks walls, boundaries and open cells without moving or turning; empty bodies are valid', () => {
  for (const [grid, dir, result] of [[['S#G'], 'E', true], [['S.G'], 'W', true], [['S.G'], 'E', false]] as const) {
    const execution = run(stage([...grid], dir), [iff()])
    expect(execution.result).toBe('unfinished')
    expect(execution.frames).toEqual([
      { variables: { A: 0 }, pos: { x: 0, y: 0 }, dir, activeBlockId: null },
      { variables: { A: 0 }, pos: { x: 0, y: 0 }, dir, activeBlockId: 'if', event: 'check', check: { blockId: 'if', condition: 'blockedAhead', result } },
    ])
    expect(run(stage([...grid], dir), [iff([r])]).frames.map(frame => frame.event)).toEqual(result ? [undefined, 'check', 'turn'] : [undefined, 'check'])
  }
})

it('checks only once, so a later wall still causes collision', () => {
  const result = run(stage(['S.#', '#.G']), [iff([r]), f, f])
  expect(result.result).toBe('collision')
  expect(result.frames.map(frame => frame.event)).toEqual([undefined, 'check', 'move', 'bump'])
  expect(result.frames[1].check?.result).toBe(false)
})

it('preserves loop context through if/repeat/if nesting and skips false bodies', () => {
  const result = run(stage(['S#G']), [iff([loop([iff([iff([], 'inner')], 'middle')])])])
  expect(result.frames.slice(1).map(frame => frame.activeBlockId)).toEqual(['if', 'middle', 'inner', 'middle', 'inner'])
  expect(result.frames.slice(2).map(frame => frame.loops)).toEqual([1, 1, 2, 2].map(iteration => [{ blockId: 'loop', iteration, count: 2 }]))
  result.frames[2].loops![0].iteration = 99
  expect(result.frames[3].loops![0].iteration).toBe(1)
  expect(run(stage(['S.G']), [iff([loop([r]), iff([f])])]).frames).toHaveLength(2)
})

it('counts checks toward the same 1000-step limit as commands', () => {
  const checks = Array.from({ length: 1000 }, () => iff())
  expect(run(stage(['S.G']), checks).result).toBe('unfinished')
  for (const extra of [iff(), f, r]) {
    const execution = run(stage(['S.G']), [...checks, extra])
    expect(execution.result).toBe('stepLimit')
    expect(execution.frames).toHaveLength(1001)
  }
  expect(run(stage(['S#G']), [...checks.slice(1), iff([r])]).result).toBe('stepLimit')
})

it('requires every variant and reports the first failed variant and cause', () => {
  const success = runAll(puzzle, [loop([iff([r]), f], 4)])
  expect(success.results.map(result => result.result)).toEqual(['success', 'success'])
  expect(success.result).toBe('success')
  expect(success.failedVariant).toBeNull()
  expect(failurePoint(success)).toBeNull()
  const failed = runAll(puzzle, [f, f, r, f, f])
  expect(failed.results.map(result => result.result)).toEqual(['success', 'collision'])
  expect(failed.failedVariant).toBe(1)
  expect(failurePoint(failed)).toEqual({ blockId: 'f', position: { x: 1, y: 0 }, direction: 'E', variant: 1 })
  expect(runAll(puzzle, []).failedVariant).toBe(0)
  expect(runAll(stage(['S.G']), [f, f]).results).toEqual([run(stage(['S.G']), [f, f])])
})

it('has no if-free shortcut with at most four blocks and repeat nesting up to two', () => {
  // Enumerate ordered trees by exact node count, including empty repeat bodies.
  function programs(size: number, depth: number): Block[][] {
    if (size === 0) return [[]]
    const result: Block[][] = []
    for (const type of ['forward', 'turnLeft', 'turnRight'] as const)
      for (const tail of programs(size - 1, depth)) result.push([{ id: 'plain', type }, ...tail])
    if (depth < 2) for (let bodySize = 0; bodySize < size; bodySize++) {
      const tails = programs(size - 1 - bodySize, depth)
      for (const body of programs(bodySize, depth + 1)) for (let count = 2; count <= 10; count++)
        for (const tail of tails) result.push([loop(body, count), ...tail])
    }
    return result
  }
  // For exact size n: three primitive heads, or nine repeat counts times
  // every body/tail split; at depth two only primitive heads are allowed.
  // These independent counts include empty bodies and the empty program.
  const expectedBySize = [1, 12, 252, 5859, 138105]
  const testedBySize = [0, 0, 0, 0, 0]
  let tested = 0
  for (let size = 0; size <= 4; size++) for (const program of programs(size, 0)) {
    if (run(puzzle, program).result === 'success' && run({ ...puzzle, grid: puzzle.variants![1] }, program).result === 'success')
      throw new Error(`Shortcut: ${JSON.stringify(program)}`)
    tested++
    testedBySize[size]++
  }
  expect(tested).toBeGreaterThan(1000)
  // Bound deterministic work rather than wall time under parallel test load.
  expect(testedBySize).toEqual(expectedBySize)
  expect(tested).toBeLessThanOrEqual(144229)
})

it('edits and clones mixed child lists with fresh IDs and independent ownership', () => {
  const tree = [iff([loop([f]), r])]
  expect(countBlocks(tree)).toBe(4)
  expect(findBlockPath(tree, 'f')).toEqual([0, 0, 0])
  expect(findBlockPath(addBlock(tree, createBlock(tree, 'if'), [0, 0]), 'block-1')).toEqual([0, 0, 1])
  expect(findBlockPath(moveBlock(tree, [0, 1], 'up'), 'f')).toEqual([0, 1, 0])
  expect(countBlocks(deleteBlock(tree, [0, 0]))).toBe(2)
  const copy = cloneBlock(tree, tree[0])
  const ids: string[] = []
  function visit(block: Block) { ids.push(block.id); if ('body' in block) block.body.forEach(visit) }
  visit(copy)
  expect(new Set(ids).size).toBe(4)
  expect(ids.every(id => !findBlockPath(tree, id))).toBe(true)
  const owned = new Program(tree)
  const output = owned.toBlocks()
  if ('body' in output[0]) output[0].body.length = 0
  expect(owned.count()).toBe(4)
  expect(addBlock([iff(Array.from({ length: 9 }, (_, i) => ({ ...f, id: String(i) })))], r)).toHaveLength(1)
})

it('round-trips nested if in v2 and rejects invalid conditions, bodies, IDs, depth and node count', () => {
  let raw: string | null = null
  const storage = { getItem: (key: string) => key === (JSON.parse(raw || 'null')?.version === 3 ? progressV3Key : progressV2Key) ? raw : null, setItem: (key: string, value: string) => { if (key === progressV3Key) raw = value } }
  const store = new ProgressRepository(storage)
  const code = [iff([loop([{ ...f, id: 'nested' }])])]
  store.saveProgram(unit2Stages[0].id, code)
  expect(new ProgressRepository(storage).getProgram(unit2Stages[0])).toEqual(code)
  const invalid: unknown[] = [{ id: 'bad', type: 'unknown' }, { ...iff(), condition: 'unknown' }, { ...iff(), body: null }, iff([iff()]), iff(Array.from({ length: 60 }, (_, i) => ({ ...f, id: String(i) })))]
  let deep: Block = f
  for (let i = 0; i < 10; i++) deep = iff([deep], `depth-${i}`)
  invalid.push(deep)
  for (const block of invalid) {
    raw = JSON.stringify({ version: 2, stages: { [unit2Stages[0].id]: { completed: true, bestStars: 3, lastProgram: { main: [block], functions: [] } } } })
    expect(new ProgressRepository(storage).getProgress().stages[unit2Stages[0].id]).toEqual({ completed: true, bestStars: 3, lastProgram: [] })
  }
  expect(() => run(stage(['S.G']), [{ id: 'bad', type: 'unknown' } as unknown as Block])).toThrow('Unknown block')
})

it('preserves unit 1 solutions, failures and every frame against the pre-T37 engine', () => {
  expect(allStages.filter(stage => !stage.variants).map(stage => ({
    id: stage.id, solution: run(stage, stage.solution), empty: run(stage, []),
    collision: run(stage, Array.from({ length: 10 }, () => ({ id: 'baseline-f', type: 'forward' }))),
    initial: stage.initialProgram ? run(stage, stage.initialProgram) : null,
  }))).toEqual(baseline)
})

it('executes exactly one else branch, counts and edits both branches with fresh clone IDs', () => {
  const tree: Block[] = [{ id: 'choose', type: 'if', condition: 'blockedAhead', body: [{ id: 'yes', type: 'turnRight' }], else: [{ id: 'no', type: 'forward' }] }]
  const stage = { ...unit2Stages[0], grid: ['SG'], variants: undefined }
  const execution = run(stage, tree)
  expect(execution.result).toBe('success')
  expect(execution.frames.map(frame => frame.activeBlockId)).toEqual([null, 'choose', 'no'])
  expect(countBlocks(tree)).toBe(3)
  const removed = Program.setElse(tree, [0], false)
  expect(countBlocks(removed)).toBe(2)
  expect(countBlocks(tree)).toBe(3)
  const added = addBlock(tree, { id: 'tail', type: 'turnLeft' }, [0, -1])
  expect(findBlockPath(moveBlock(added, [0, -1, 1], 'up'), 'tail')).toEqual([0, -1, 0])
  expect(countBlocks(deleteBlock(added, [0, -1, 0]))).toBe(3)
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  new ProgressRepository(storage).saveProgram('u2-5', tree)
  expect(new ProgressRepository(storage).getProgress().stages['u2-5'].lastProgram).toEqual(tree)

  expect(findBlockPath(tree, 'no')).toEqual([0, -1, 0])
  const cloned = cloneBlock(tree, tree[0])
  expect(cloned.type === 'if' && cloned.else?.[0].id).not.toBe('no')
})
