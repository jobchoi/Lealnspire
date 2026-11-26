import { expect, it } from 'vitest'
import { allStages, stages, bonusStages, unit12Stages, isLastStage } from './stages'
import { runAll } from './interpreter'
import { FunctionProgram } from './program'
import { ProgressRepository, progressV2Key, isUnlocked } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import { continueStageIndex, courseCompleted } from '../controller/flow'
import type { Block, Program } from './types'
import baseline from './unit1234567891011-run.fixture.json'

it('preserves all unit 1–11 solution results and frames', () => {
  expect(baseline).toHaveLength(44)
  expect(baseline.reduce((n, s) => n + s.execution.results.length, 0)).toBe(75)
  for (const entry of baseline) {
    const stage = allStages.find(s => s.id === entry.id)!
    expect(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] })).toEqual(entry.execution)
  }
})
it('solves all six maps and the six accepted alternatives within the limits', () => {
  const alternatives: Program[] = [
    [{ id: 'r', type: 'repeat', count: 3, body: [{ id: 'w', type: 'while', condition: 'clearAhead', body: [{ id: 'f', type: 'forward' }] }, { id: 'right', type: 'turnRight' }] }],
    unit12Stages[1].solution,
    [{ id: 'each', type: 'forEach', body: [{ id: 'f', type: 'forward' }] }, { id: 'l', type: 'turnLeft' }, { id: 'g', type: 'forward' }],
  ]
  const palettes = [
    ['forward', 'turnLeft', 'turnRight', 'repeat', 'if', 'while'],
    ['forward', 'turnLeft', 'turnRight', 'repeat', 'call'],
    ['forward', 'turnLeft', 'turnRight', 'repeat', 'forEach', 'if'],
  ]
  for (const [i, stage] of unit12Stages.entries()) {
    expect(stage.palette).toEqual(palettes[i]); expect(stage.startDir).toBe('E')
    expect(stage.variantVariables).toEqual(i === 1 ? [{ A: 3 }, { A: 5 }] : [{ A: 0 }, { A: 0 }])
    expect(!!stage.params).toBe(i === 1); expect(!!stage.lists).toBe(i === 2)
    for (const main of [stage.solution, alternatives[i]]) {
      const doc = { main, functions: stage.solutionFunctions ?? [] }
      expect(runAll(stage, doc).results.map(r => r.result)).toEqual(['success', 'success'])
      expect(new FunctionProgram(doc).count()).toBe(stage.maxBlocks)
    }
  }
})
it('round trips all new policies in v2 and isolates corrupt code without losing awards', () => {
  let raw = ''
  const storage = { getItem: (key: string) => key === progressV2Key ? raw || null : null, setItem: (_key: string, value: string) => { raw = value } }
  const repo = new ProgressRepository(storage)
  for (const stage of unit12Stages) repo.completeStage(stage.id, 3, { main: stage.solution, functions: stage.solutionFunctions ?? [] })
  const restored = new ProgressRepository(storage)
  for (const stage of unit12Stages) expect(restored.getDocument(stage)).toEqual({ main: stage.solution, functions: stage.solutionFunctions ?? [] })
  expect(JSON.parse(raw).version).toBe(2)
  for (const stage of unit12Stages) {
    const bad = JSON.parse(raw); bad.stages[stage.id].lastProgram.main.push({ id: 'bad', type: 'repeat', countParam: true, body: [] })
    const broken = new ProgressRepository({ ...storage, getItem: key => key === progressV2Key ? JSON.stringify(bad) : null })
    expect(broken.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(broken.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
    for (const other of unit12Stages.filter(s => s !== stage)) expect(broken.getDocument(other)).toEqual(restored.getDocument(other))
  }
})
it('opens sequentially after unit11 and requires every regular puzzle, excluding bonuses', () => {
  const repo = new ProgressRepository()
  for (const stage of allStages.filter(s => !unit12Stages.includes(s) && !bonusStages.includes(s) && s.id !== 'u11-3')) repo.completeStage(stage.id, 3, [])
  expect(isUnlocked(repo.getProgress(), allStages.indexOf(unit12Stages[0]))).toBe(false)
  repo.completeStage('u11-3', 3, [])
  for (const stage of unit12Stages) {
    expect(courseCompleted(repo.getProgress())).toBe(false)
    expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(stage))
    expect(isUnlocked(repo.getProgress(), allStages.indexOf(stage))).toBe(true)
    repo.completeStage(stage.id, 3, [])
  }
  expect(courseCompleted(repo.getProgress())).toBe(true)
  expect(continueStageIndex(repo.getProgress())).toBeUndefined()
  expect(isLastStage(allStages.indexOf(unit12Stages[2]))).toBe(true)
  for (const stage of allStages.filter(s => stages.includes(s) || s.variants)) {
    const missing = repo.getProgress(); delete missing.stages[stage.id]
    expect(courseCompleted(missing)).toBe(false)
  }
})

for (const stage of [unit12Stages[1]]) it(`${stage.id}: exhausts parameter-free documents through six nodes`, () => {
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
  expect([states.length, definitions, pairs, candidates, work]).toEqual([80, 193, 907, 547757, 745367])
}, 120000)


for (const [index, expected] of [63].entries()) it(`exhausts all common motion strings for u12-${index + 1}: ${expected} states and no shared success`, () => {
  const maps = unit12Stages[index].variants!
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

// Exhaust every ordered forest <=4 without list sources, including if/else,
// empty/nested repeat and repeat A (A is fixed at zero on both maps).
function listFree(size: number): Program[] {
  if (!size) return [[]]
  const result: Program[] = []
  for (let cost = 1; cost <= size; cost++) {
    const heads: Block[] = cost === 1 ? ['forward', 'turnLeft', 'turnRight'].map(type => ({ id: '', type } as Block)) : []
    for (const body of listFree(cost - 1)) {
      for (let count = 2; count <= 10; count++) heads.push({ id: '', type: 'repeat', count, body })
      heads.push({ id: '', type: 'repeat', countVariable: 'A', body })
    }
    for (let left = 0; left < cost; left++) for (const body of listFree(left)) for (const alternative of listFree(cost - 1 - left)) heads.push({ id: '', type: 'if', condition: 'blockedAhead', body, ...(alternative.length ? { else: alternative } : {}) })
    for (const head of heads) for (const tail of listFree(size - cost)) result.push([head, ...tail])
  }
  return result
}
it('exhausts list-free if/else and repeat trees through four nodes', () => {
  let work = 0, wins = 0
  for (let size = 0; size <= 4; size++) for (const tree of listFree(size)) {
    if (++work > 1_000_000) throw new Error('Proof work budget exceeded')
    let id = 0
    const identify = (blocks: Program): Program => blocks.map(b => ({ ...b, id: `n${++id}`, ...('body' in b ? { body: identify(b.body) } : {}), ...(b.type === 'if' && b.else ? { else: identify(b.else) } : {}) }))
    if (runAll(unit12Stages[2], identify(tree)).result === 'success') wins++
  }
  console.info(`u12-3: candidates=${work}, solutions=${wins}`)
  expect(wins).toBe(0)
  expect(work).toBe(459943)
}, 120000)

it('saves only after both synthesis maps finish and clears the course award when progress is removed', () => {
  const repo = new ProgressRepository()
  for (const stage of allStages.filter(s => !unit12Stages.includes(s) && !bonusStages.includes(s))) repo.completeStage(stage.id, 3, [])
  for (const stage of unit12Stages) {
    const game = new GameController(stage, repo)
    game.edit({ main: stage.solution, functions: stage.solutionFunctions ?? [] })
    game.step()
    expect(repo.getProgress().stages[stage.id]?.completed).not.toBe(true)
    for (let n = 0; n < 500 && !game.finished; n++) game.step()
    expect(game.finished).toBe(true)
    expect(game.result).toBe('success')
    expect(repo.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
    game.dispose()
  }
  expect(courseCompleted(repo.getProgress())).toBe(true)
  repo.clear()
  expect(courseCompleted(repo.getProgress())).toBe(false)
})
