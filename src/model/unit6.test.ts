import { expect, it } from 'vitest'
import { runAll } from './interpreter'
import { Program } from './program'
import { allStages } from './stages'
import type { Stage } from './types'

const puzzles = allStages.filter(stage => stage.id.startsWith('u6-'))

it('four solutions pass both maps; initial code and the earlier side rule fail as designed', () => {
  expect(puzzles).toHaveLength(4)
  for (const stage of puzzles) {
    expect(Program.countBlocks(stage.solution)).toBe(4)
    expect(runAll(stage, stage.solution).results.map(r => r.result)).toEqual(['success', 'success'])
    expect(stage.variantVariables).toBeUndefined()
    // Side branches are deliberately skipped: visiting every open cell is not a unit 6 rule.
  }
  expect(runAll(puzzles[0], puzzles[0].initialProgram!).results.map(r => r.result)).toEqual(['collision', 'collision'])
  expect(runAll(puzzles[3], puzzles[3].initialProgram!).results.map(r => r.result)).toEqual(['unfinished', 'collision'])
  expect(runAll(puzzles[2], puzzles[1].solution).results[0].result).toBe('collision')
})

// Full non-goal pose transforms make equivalence a congruence under arbitrary
// nesting and sequencing. Goal, collision and nontermination are absorbing.
// Ignoring finite execution budgets over-approximates successful programs, so
// absence here also proves absence under interpreter budgets.
function search(stage: Stage, atoms: number[], limit: number) {
  const grids = stage.variants!
  const poses = grids.flatMap((grid, map) => grid.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' || cell === 'G' ? [] : [0, 1, 2, 3].map(dir => ({ map, x, y, dir })))))
  const success = poses.length, failure = success + 1
  const identity = Array.from({ length: failure + 1 }, (_, i) => i)
  const compose = (a: number[], b: number[]) => a.map(i => b[i])
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  const commands = [0, 1, 2].map(type => [...poses.map(p => {
    const [dx, dy] = offsets[p.dir]
    const x = p.x + (type === 0 ? dx : 0), y = p.y + (type === 0 ? dy : 0)
    const cell = grids[p.map][y]?.[x]
    if (!cell || cell === '#') return failure
    if (cell === 'G') return success
    const dir = type === 0 ? p.dir : (p.dir + (type === 1 ? 3 : 1)) % 4
    return poses.findIndex(q => q.map === p.map && q.x === x && q.y === y && q.dir === dir)
  }), success, failure])
  const conditions = atoms.flatMap(relative => [false, true].map(negated => poses.map(p => {
    const [dx, dy] = offsets[(p.dir + relative) % 4]
    const cell = grids[p.map][p.y + dy]?.[p.x + dx]
    const blocked = !cell || cell === '#'
    return negated ? !blocked : blocked
  })))
  const starts = grids.map((grid, map) => poses.findIndex(p => p.map === map && grid[p.y][p.x] === 'S' && p.dir === 1))
  const bySize: number[][][] = [[identity]]
  const seen = new Set([String.fromCharCode(...identity)])
  let work = 0
  for (let size = 1; size <= limit; size++) {
    const current: number[][] = []
    const add = (t: number[]) => {
      work++
      if (work > 200000) throw new Error('proof work budget exceeded')
      expect(starts.every(i => t[i] === success)).toBe(false)
      const key = String.fromCharCode(...t)
      if (!seen.has(key)) { seen.add(key); current.push(t) }
    }
    for (const cmd of commands) for (const tail of bySize[size - 1]) add(compose(cmd, tail))
    for (let bodySize = 0; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
      let repeated = identity
      for (let count = 1; count <= 10; count++) {
        repeated = compose(repeated, body)
        if (count >= 2) for (const tail of bySize[size - 1 - bodySize]) add(compose(repeated, tail))
      }
      for (const condition of conditions) {
        const loop = identity.map(start => {
          let i = start
          const visited = new Set<number>()
          while (i < success && condition[i]) {
            if (visited.has(i)) return failure
            visited.add(i); i = body[i]
          }
          return i
        })
        for (const tail of bySize[size - 1 - bodySize]) add(compose(loop, tail))
      }
    }
    for (let yesSize = 0; yesSize < size; yesSize++) for (let noSize = 0; noSize < size - yesSize; noSize++) {
      const tailSize = size - 1 - yesSize - noSize
      for (const yes of bySize[yesSize]) for (const no of bySize[noSize]) for (const condition of conditions) {
        const choice = [...poses.map((_, i) => condition[i] ? yes[i] : no[i]), success, failure]
        for (const tail of bySize[tailSize]) add(compose(choice, tail))
      }
    }
    bySize.push(current)
  }
  return { transforms: seen.size, work }
}

for (const stage of puzzles.slice(1)) it(`${stage.id}: exhaust programs through four blocks with restricted atoms`, () => {
  const result = search(stage, stage.id === 'u6-2' ? [0] : [0, 3, 1], 4)
  expect(result).toEqual(({ 'u6-2': { transforms: 1466, work: 12936 }, 'u6-3': { transforms: 14334, work: 129582 }, 'u6-4': { transforms: 14399, work: 129735 } } as Record<string, typeof result>)[stage.id])
})

it('unlocks sequentially and isolates logic code by stage when restoring', async () => {
  const { ProgressRepository, progressV2Key, isUnlocked } = await import('./ProgressRepository')
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const store = new ProgressRepository(storage)
  const first = allStages.indexOf(puzzles[0])
  expect(isUnlocked(store.getProgress(), first)).toBe(false)
  for (const stage of allStages.filter(stage => stage.variants && !stage.id.startsWith('u6-'))) store.completeStage(stage.id, 3, stage.solution)
  for (const stage of allStages.slice(0, 8)) store.completeStage(stage.id, 3, stage.solution)
  expect(isUnlocked(store.getProgress(), first)).toBe(true)
  expect(isUnlocked(store.getProgress(), first + 1)).toBe(false)
  store.completeStage(puzzles[0].id, 3, puzzles[0].solution)
  expect(isUnlocked(store.getProgress(), first + 1)).toBe(true)
  const raw = JSON.parse(data.get(progressV2Key)!)
  raw.stages['u2-1'].lastProgram = { main: puzzles[0].solution, functions: [] }
  data.set(progressV2Key, JSON.stringify(raw))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(puzzles[0]).main).toEqual(puzzles[0].solution)
  expect(restored.getDocument(allStages.find(stage => stage.id === 'u2-1')!).main).toEqual([])
  expect(restored.getProgress().stages['u2-1'].completed).toBe(true)
})

it('creates unit 6 if and while with sensor trees and keeps earlier defaults', async () => {
  const { GameController } = await import('../controller/GameController')
  const { ProgressRepository } = await import('./ProgressRepository')
  const game = new GameController(puzzles[1], new ProgressRepository())
  game.editor.add('if'); game.editor.add('while')
  expect(game.editor.program).toMatchObject([
    { type: 'if', condition: { kind: 'atom', atom: 'blockedAhead' } },
    { type: 'while', condition: { kind: 'not', operand: { kind: 'atom', atom: 'blockedAhead' } } },
  ])
  const earlier = new GameController(allStages.find(s => s.id === 'u3-1')!, new ProgressRepository())
  earlier.editor.add('while')
  expect(earlier.editor.program.at(-1)).toMatchObject({ condition: 'clearAhead' })
  game.dispose(); earlier.dispose()
})
