import { describe, expect, it } from 'vitest'
import { parseGrid } from './grid'
import { failurePoint, run } from './interpreter'
import { addBlock, countBlocks, deleteBlock, moveBlock, setRepeatCount } from './program'
import type { Block, Stage } from './types'

const stage = (grid: string[], startDir: Stage['startDir'] = 'E'): Stage => ({ id: 'test', world: 'sketchbook', title: '', goal: '', hints: { keys: ['', ''], focus: [{ primary: { kind: 'map', area: 'path' } }, { primary: { kind: 'workspace' } }] }, grid, startDir, starBlocks: 1, solution: [] })
const forward: Block = { id: 'f', type: 'forward' }
const left: Block = { id: 'l', type: 'turnLeft' }
const right: Block = { id: 'r', type: 'turnRight' }
const repeat = (body: Block[], count = 2): Block => ({ id: 'loop', type: 'repeat', count, body })

describe('grid', () => {
  it('parses dimensions, start, goal and walls', () => {
    const grid = parseGrid(['S#.', '..G'])
    expect([grid.width, grid.height, grid.start, grid.goal, grid.walls.has('1,0')]).toEqual([3, 2, { x: 0, y: 0 }, { x: 2, y: 1 }, true])
  })
  it('rejects missing, duplicate, malformed and unknown cells', () => {
    for (const rows of [[], [''], ['S.'], ['.G'], ['SG', '.'], ['SSG'], ['SGG'], ['S?G']]) expect(() => parseGrid(rows)).toThrow()
  })
})
describe('run', () => {
  it('moves straight and stops immediately at the goal', () => {
    const result = run(stage(['S.G']), [forward, forward, forward])
    expect(result.result).toBe('success'); expect(result.frames).toHaveLength(3); expect(result.frames[2]).toEqual({ variables: { A: 0 }, pos: { x: 2, y: 0 }, dir: 'E', activeBlockId: 'f', event: 'goal' })
  })
  it('reports wall and boundary collisions without moving', () => {
    for (const grid of [['S#G'], ['S.G']]) {
      const result = run(stage(grid, grid[0] === 'S#G' ? 'E' : 'W'), [forward])
      expect(result.result).toBe('collision'); expect(result.frames[1]).toMatchObject({ pos: { x: 0, y: 0 }, event: 'bump' })
    }
  })
  it('turns relative to the robot through all four directions', () => {
    expect(run(stage(['S.G'], 'N'), [right, right, right, right, left]).frames.map(f => f.dir)).toEqual(['N', 'E', 'S', 'W', 'N', 'W'])
  })
  it('executes repeats and nested repeats', () => {
    expect(run(stage(['S..G']), [repeat([forward], 3)]).result).toBe('success')
    expect(run(stage(['S...G']), [repeat([repeat([forward])])]).result).toBe('success')
  })
  it('bounds ten nested empty repeats within 100ms without adding frames', () => {
    let program: Block[] = []
    for (let depth = 0; depth < 10; depth++) program = [repeat(program, 10)]
    const started = performance.now()
    const result = run(stage(['S.G']), program)
    expect(performance.now() - started).toBeLessThan(100)
    expect(result.result).toBe('stepLimit')
    expect(result.frames).toHaveLength(1)
    expect(run(stage(['S.G']), [repeat([], 10)]).result).toBe('unfinished')
  })
  it('enforces the repeat entry limit only when another entry is needed', () => {
    const thousandEntries = Array.from({ length: 100 }, () => repeat([], 10))
    expect(run(stage(['S.G']), thousandEntries).result).toBe('unfinished')
    expect(run(stage(['S.G']), [...thousandEntries, repeat([])]).result).toBe('stepLimit')
    expect(run(stage(['S.G']), [...thousandEntries, forward, forward]).result).toBe('success')
  })
  it('reports unfinished and enforces the step limit only when another step is needed', () => {
    expect(run(stage(['S.G']), [forward]).result).toBe('unfinished')
    const thousand = Array.from({ length: 1000 }, () => right)
    expect(run(stage(['S.G']), thousand).result).toBe('unfinished')
    const result = run(stage(['S.G']), [...thousand, right])
    expect(result.result).toBe('stepLimit'); expect(result.frames).toHaveLength(1001)
  })
})
describe('program editing', () => {
  it('adds at root and inside repeats without mutating the input', () => {
    const initial = [repeat([])]
    const result = addBlock(addBlock(initial, forward), left, [0])
    expect(result).toEqual([repeat([left]), forward]); expect(initial).toEqual([repeat([])]); expect(countBlocks(result)).toBe(3)
  })
  it('deletes and moves blocks at nested paths and respects boundaries', () => {
    const initial = [repeat([forward, left, right])]
    expect(moveBlock(initial, [0, 1], 'up')).toEqual([repeat([left, forward, right])])
    expect(moveBlock(initial, [0, 1], 'down')).toEqual([repeat([forward, right, left])])
    expect(moveBlock(initial, [0, 0], 'up')).toEqual(initial)
    expect(deleteBlock(initial, [0, 1])).toEqual([repeat([forward, right])])
    expect(() => deleteBlock(initial, [2])).toThrow()
  })
  it('changes repeat counts only within integer bounds', () => {
    const initial = [repeat([repeat([])])]
    expect(setRepeatCount(initial, [0, 0], 10)).toEqual([repeat([repeat([], 10)])])
    for (const count of [1, 11, 2.5]) expect(() => setRepeatCount(initial, [0], count)).toThrow()
    expect(() => setRepeatCount([forward], [0], 2)).toThrow()
  })
})

describe('failure point', () => {
  it('uses the blocked inner command and position before collision, including boundaries', () => {
    for (const [grid, dir] of [[['S#G'], 'E'], [['S.G'], 'W']] as const) {
      const execution = run(stage([...grid], dir), [repeat([repeat([forward])])])
      expect(failurePoint(execution)).toEqual({ blockId: 'f', position: { x: 0, y: 0 }, direction: dir })
    }
  })
  it('uses the final executed command and stopped position for unfinished runs', () => {
    const execution = run(stage(['S..G']), [forward, right, repeat([])])
    const point = failurePoint(execution)
    expect(point).toEqual({ blockId: 'r', position: { x: 1, y: 0 }, direction: 'S' })
    point!.position.x = 99
    expect(execution.frames.at(-1)!.pos.x).toBe(1)
  })
  it('has no cause for success, empty programs, empty repeats or either safety limit', () => {
    let empty: Block[] = []
    for (let i = 0; i < 10; i++) empty = [repeat(empty, 10)]
    for (const program of [[], [repeat([])], empty, Array.from({ length: 1001 }, () => right), [forward, forward]]) {
      expect(failurePoint(run(stage(['S.G']), program))).toBeNull()
    }
  })
})


describe('loop frame context', () => {
  it('records each iteration and clears context after the repeat', () => {
    const frames = run(stage(['S......G']), [repeat([forward], 3), right]).frames
    expect(frames.map(frame => frame.loops)).toEqual([undefined,
      [{ blockId: 'loop', iteration: 1, count: 3 }],
      [{ blockId: 'loop', iteration: 2, count: 3 }],
      [{ blockId: 'loop', iteration: 3, count: 3 }], undefined])
  })
  it('records outer to inner context for 2[F 3[L]] without changing earlier frames', () => {
    const inner: Block = { id: 'inner', type: 'repeat', count: 3, body: [left] }
    const frames = run(stage(['S....G', '......']), [repeat([forward, inner])]).frames.slice(1)
    expect(frames.map(frame => frame.loops)).toEqual([1, 2].flatMap(iteration => {
      const outer = { blockId: 'loop', iteration, count: 2 }
      return [[outer], ...[1, 2, 3].map(i => [outer, { blockId: 'inner', iteration: i, count: 3 }])]
    }))
    frames[1].loops![0].iteration = 99
    expect(frames[0].loops![0].iteration).toBe(1)
  })
  it('keeps the interrupted iteration on a collision frame', () => {
    const execution = run(stage(['S.#G']), [repeat([forward], 3)])
    expect(execution.result).toBe('collision')
    expect(execution.frames.at(-1)).toMatchObject({ event: 'bump', loops: [{ blockId: 'loop', iteration: 2, count: 3 }] })
  })
  it('keeps the last executed context at either safety limit without extra frames', () => {
    const execution = run(stage(['S.G']), [repeat(Array.from({ length: 501 }, () => right))])
    expect(execution.result).toBe('stepLimit')
    expect(execution.frames).toHaveLength(1001)
    expect(execution.frames.at(-1)?.loops).toEqual([{ blockId: 'loop', iteration: 2, count: 2 }])
    const entries = run(stage(['S.G']), [repeat([right]), ...Array.from({ length: 100 }, () => repeat([], 10))])
    expect(entries.result).toBe('stepLimit')
    expect(entries.frames).toHaveLength(3)
    expect(entries.frames.at(-1)?.loops).toEqual([{ blockId: 'loop', iteration: 2, count: 2 }])
  })
})
