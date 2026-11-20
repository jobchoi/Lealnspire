import { describe, expect, it } from 'vitest'
import { parseGrid } from './grid'
import { run } from './interpreter'
import { addBlock, countBlocks, deleteBlock, moveBlock, setRepeatCount } from './program'
import type { Block, Stage } from './types'

const stage = (grid: string[], startDir: Stage['startDir'] = 'E'): Stage => ({ id: 'test', title: '', goal: '', hint: '', grid, startDir, starBlocks: 1, solution: [] })
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
    expect(result.result).toBe('success'); expect(result.frames).toHaveLength(3); expect(result.frames[2]).toEqual({ pos: { x: 2, y: 0 }, dir: 'E', activeBlockId: 'f', event: 'goal' })
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
