import { expect, it } from 'vitest'
import { runAll } from './interpreter'
import { Program } from './program'
import { stages } from './stages'
import type { Block, Logic, Stage } from './types'

// Rejected candidates, deliberately not registered as stages.
export const sideDraft = [['##G###', '##.###', 'S.....'], ['####G#', '####.#', 'S.....']]
export const trimmedDraft = [['##G', '##.', 'S..'], ['####G', '####.', 'S....']]
const f: Block = { id: 'f', type: 'forward' }
const left: Block = { id: 'l', type: 'turnLeft' }
const walk: Block = { id: 'walk', type: 'while', condition: 'clearAhead', body: [{ ...f, id: 'end' }] }
const solution = (logic: Logic): Block[] => [{ id: 'sense', type: 'while', condition: 'clearAhead', logic, body: [f] }, left, walk]
const puzzle = (maps: string[][]): Stage => ({ ...stages[0], logic: true, startDir: 'E', grid: maps[0], variants: maps })
const unvisited = (maps: string[][], program: Block[]) => runAll(puzzle(maps), program).results.map((result, map) => {
  const visited = new Set(result.frames.map(frame => `${frame.pos.x},${frame.pos.y}`))
  return maps[map].flatMap((row, y) => [...row].flatMap((cell, x) => cell !== '#' && !visited.has(`${x},${y}`) ? [`${x},${y}`] : []))
})

it('rejects the proposed side-sensor maps because their solutions skip traversable tails', () => {
  const program = solution({ terms: [{ sensor: 'blockedLeft' }] })
  expect(Program.countBlocks(program)).toBe(5)
  expect(runAll(puzzle(sideDraft), program).results.map(result => result.result)).toEqual(['success', 'success'])
  expect(unvisited(sideDraft, program)).toEqual([['3,2', '4,2', '5,2'], ['5,2']])
})
it('rejects trimming the tails: a five-block ahead-only shortcut solves both maps', () => {
  const shortcut: Block[] = [{ ...walk, id: 'first', body: [f] }, left, walk]
  expect(Program.countBlocks(shortcut)).toBe(5)
  expect(runAll(puzzle(trimmedDraft), shortcut).results.map(result => result.result)).toEqual(['success', 'success'])
  expect(unvisited(trimmedDraft, shortcut)).toEqual([[], []])
  for (const op of ['and', 'or'] as const) {
    const candidate = solution({ terms: [{ sensor: 'blockedAhead', not: true }, { sensor: 'blockedRight', ...(op === 'or' ? { not: true } : {}) }], op })
    expect(Program.countBlocks(candidate)).toBe(5)
    expect(runAll(puzzle(trimmedDraft), candidate).results.map(result => result.result)).toEqual(['success', 'success'])
    expect(unvisited(trimmedDraft, candidate)).toEqual([[], []])
  }
})

// Semantic DP over ALL nonterminal poses, not merely the starting poses.
// Grammar: F/L/R, sequence, repeat 2..10, if with optional else, while;
// every one-term sensor and its negation. Infinite loops map to failure.
// Ignoring the global step budget overapproximates successes: absence of a
// shortcut is sound, but a discovered shortcut must also run in Interpreter.
function exhaust(maps: string[][], budget: number, sides: boolean) {
  const poses = maps.flatMap((grid, map) => grid.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' || cell === 'G' ? [] : [0, 1, 2, 3].map(dir => ({ map, x, y, dir })))))
  const success = poses.length, failure = success + 1
  const identity = Array.from({ length: failure + 1 }, (_, i) => i)
  const index = new Map(poses.map((p, i) => [`${p.map},${p.x},${p.y},${p.dir}`, i]))
  const starts = poses.flatMap((p, i) => maps[p.map][p.y][p.x] === 'S' && p.dir === 1 ? [i] : [])
  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  const blocked = (i: number, relative: number) => {
    const p = poses[i], [dx, dy] = offsets[(p.dir + relative) % 4]
    const cell = maps[p.map][p.y + dy]?.[p.x + dx]
    return !cell || cell === '#'
  }
  const conditions = (sides ? [0, 3, 1] : [0]).flatMap(relative => [false, true].map(not => poses.map((_, i) => blocked(i, relative) !== not)))
  const commands = [0, 1, 2].map(type => [...poses.map((p, i) => {
    if (type === 0 && blocked(i, 0)) return failure
    const [dx, dy] = offsets[p.dir]
    const x = p.x + (type === 0 ? dx : 0), y = p.y + (type === 0 ? dy : 0)
    return maps[p.map][y][x] === 'G' ? success : index.get(`${p.map},${x},${y},${type === 0 ? p.dir : (p.dir + (type === 1 ? 3 : 1)) % 4}`)!
  }), success, failure])
  let work = 0
  const compose = (a: number[], b: number[]) => a.map(i => b[i])
  const seen = new Set([String.fromCharCode(...identity)])
  const bySize = [[identity]]
  let shortcut = false
  let witness: Block[] | undefined
  const programs = new Map<string, Block[]>([[String.fromCharCode(...identity), []]])
  const code = (transform: number[]) => programs.get(String.fromCharCode(...transform))!
  const term = (condition: number): Logic => ({ terms: [{ sensor: (['blockedAhead', 'blockedLeft', 'blockedRight'] as const)[Math.floor(condition / 2)], ...(condition % 2 ? { not: true } : {}) }] })
  for (let size = 1; size <= budget; size++) {
    const current: number[][] = []
    const add = (transform: number[], program: () => Block[]) => {
      if (++work > 200000) throw new Error('exhaustion work budget exceeded')
      if (starts.every(i => transform[i] === success)) { shortcut = true; witness ??= program() }
      const key = String.fromCharCode(...transform)
      if (!seen.has(key)) { seen.add(key); current.push(transform); programs.set(key, program()) }
    }
    for (const [commandIndex, command] of commands.entries()) for (const tail of bySize[size - 1]) add(compose(command, tail), () => [{ id: '', type: (['forward', 'turnLeft', 'turnRight'] as const)[commandIndex] }, ...code(tail)])
    for (let bodySize = 0; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
      const heads: { transform: number[]; block: Block }[] = []
      let power = identity
      for (let count = 1; count <= 10; count++) { power = compose(power, body); if (count >= 2) heads.push({ transform: power, block: { id: '', type: 'repeat', count, body: code(body) } }) }
      for (const [conditionIndex, condition] of conditions.entries()) {
        heads.push({ transform: [...poses.map((_, start) => {
          let state = start
          const visited = new Set<number>()
          while (state < success && condition[state]) {
            if (visited.has(state)) return failure
            visited.add(state); state = body[state]
          }
          return state
        }), success, failure], block: { id: '', type: 'while', condition: 'clearAhead', logic: term(conditionIndex), body: code(body) } })
        for (let elseSize = 0; elseSize < size - bodySize; elseSize++) for (const alternative of bySize[elseSize]) {
          const branch = [...poses.map((_, i) => condition[i] ? body[i] : alternative[i]), success, failure]
          for (const tail of bySize[size - bodySize - elseSize - 1]) add(compose(branch, tail), () => [{ id: '', type: 'if', condition: 'blockedAhead', logic: term(conditionIndex), body: code(body), else: code(alternative) }, ...code(tail)])
        }
      }
      for (const head of heads) for (const tail of bySize[size - bodySize - 1]) add(compose(head.transform, tail), () => [head.block, ...code(tail)])
    }
    bySize.push(current)
  }
  return { poses: poses.length, transforms: seen.size, work, shortcut, witness }
}
it('exhausts rejected drafts and confirms discovered shortcuts in the capped interpreter', () => {
  const ahead = exhaust(sideDraft, 5, false)
  const single = exhaust(trimmedDraft, 4, true)
  expect(ahead).toMatchObject({ poses: 56, transforms: 10053, work: 104493, shortcut: true })
  expect(single).toMatchObject({ poses: 40, transforms: 9637, work: 117615, shortcut: true })
  for (const [maps, result, limit] of [[sideDraft, ahead, 5], [trimmedDraft, single, 4]] as const) {
    let serial = 0
    const identify = (blocks: Block[]): Block[] => blocks.map(block => ({ ...block, id: `proof-${++serial}`,
      ...('body' in block ? { body: identify(block.body) } : {}),
      ...(block.type === 'if' && block.else ? { else: identify(block.else) } : {}) }))
    const witness = identify(result.witness!)
    expect(Program.countBlocks(witness)).toBeLessThanOrEqual(limit)
    expect(runAll(puzzle(maps), witness).results.map(run => run.result)).toEqual(['success', 'success'])
  }
})
