import { expect, it } from 'vitest'
import { runAll } from './interpreter'
import { Program } from './program'
import { allStages } from './stages'
import type { Stage } from './types'

const puzzles = allStages.filter(stage => stage.id.startsWith('u6-'))

it('solutions reach every goal and the original u6-3 code fails as specified', () => {
  for (const stage of puzzles) {
    expect(Program.countBlocks(stage.solution)).toBe(4)
    expect(runAll(stage, stage.solution).results.map(r => r.result)).toEqual(['success', 'success', 'success'])
  }
  expect(runAll(puzzles[2], puzzles[2].initialProgram!).results.map(r => r.result)).toEqual(['success', 'unfinished', 'collision'])
})

// Every traversable non-goal pose, direction and relevant A value is represented.
// Goal and collision are absorbing. Transform equivalence is therefore a
// congruence for sequencing and for either branch of every atomic if.
function search(stage: Stage, limit: number) {
  const grids = stage.variants!
  const poses = grids.flatMap((grid, map) => grid.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' || cell === 'G' ? [] : [0, 1, 2, 3].flatMap(dir => [0, 1].map(A => ({ map, x, y, dir, A }))))))
  const success = poses.length, failure = success + 1
  const identity = Array.from({ length: failure + 1 }, (_, i) => i)
  const compose = (a: number[], b: number[]) => a.map(i => b[i])
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  const open = (p: typeof poses[number]) => { const [dx, dy] = offsets[p.dir]; const c = grids[p.map][p.y + dy]?.[p.x + dx]; return !!c && c !== '#' }
  const commands = ['F', 'L', 'R'].map((name, type) => ({ name, t: [...poses.map(p => {
    const [dx, dy] = offsets[p.dir]
    const x = p.x + (type === 0 ? dx : 0), y = p.y + (type === 0 ? dy : 0)
    const cell = grids[p.map][y]?.[x]
    if (!cell || cell === '#') return failure
    if (cell === 'G') return success
    const dir = type === 0 ? p.dir : (p.dir + (type === 1 ? 3 : 1)) % 4
    return poses.findIndex(q => q.map === p.map && q.x === x && q.y === y && q.dir === dir && q.A === p.A)
  }), success, failure] }))
  const starts = grids.map((grid, map) => poses.findIndex(p => p.map === map && grid[p.y][p.x] === 'S' && p.dir === 1 && p.A === stage.variantVariables![map].A))
  type Entry = { t: number[]; name: string }
  const bySize: Entry[][] = [[{ t: identity, name: '' }]]
  const seen = new Set([String.fromCharCode(...identity)])
  const found: (string | null)[] = Array(limit + 1).fill(null)
  for (let size = 1; size <= limit; size++) {
    const current: Entry[] = []
    const add = (t: number[], name: string) => {
      if (!found[size] && starts.every(i => t[i] === success)) found[size] = name
      const key = String.fromCharCode(...t)
      if (!seen.has(key)) { seen.add(key); current.push({ t, name }) }
    }
    for (const cmd of commands) for (const tail of bySize[size - 1]) add(compose(cmd.t, tail.t), `${cmd.name} ${tail.name}`)
    for (let yesSize = 0; yesSize < size; yesSize++) for (let noSize = 0; noSize < size - yesSize; noSize++) {
      const tailSize = size - 1 - yesSize - noSize
      for (const yes of bySize[yesSize]) for (const no of bySize[noSize]) for (const condition of ['clearAhead', 'blockedAhead', 'aIsZero'] as const) {
        const choice = [...poses.map((p, i) => (condition === 'aIsZero' ? p.A === 0 : condition === 'clearAhead' ? open(p) : !open(p)) ? yes.t[i] : no.t[i]), success, failure]
        for (const tail of bySize[tailSize]) add(compose(choice, tail.t), `if ${condition} [${yes.name}] else [${no.name}] ${tail.name}`)
      }
    }
    bySize.push(current)
  }
  return { found, counts: bySize.map(entries => entries.length) }
}

for (const stage of puzzles) it(`${stage.id}: exhaust atomic programs through six blocks`, () => {
  const result = search(stage, 6)
  expect(result.found[5]).not.toBeNull()
  expect(result.found[6]).not.toBeNull()
  expect(result.found.slice(1, 5)).toEqual([null, null, null, null])
}, 120000)

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
