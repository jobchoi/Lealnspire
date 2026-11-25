import { expect, it } from 'vitest'
import { unit5Stages, allStages, unit4Stages } from './stages'
import { runAll } from './interpreter'
import { Program } from './program'
import { isUnlocked, ProgressRepository } from './ProgressRepository'
import { EditorController } from '../controller/EditorController'

it('unit 5 solutions pass all maps within their budgets and initial code exposes order', () => {
  for (const stage of unit5Stages) {
    expect(runAll(stage, stage.solution).results.map(r => r.result)).toEqual(stage.variants!.map(() => 'success'))
    expect(Program.countBlocks(stage.solution)).toBeLessThanOrEqual(stage.maxBlocks!)
    expect(stage.palette).toEqual(['forward', 'turnLeft', 'turnRight', 'repeat', 'set', 'change'])
  }
  expect(runAll(unit5Stages[2], unit5Stages[2].initialProgram!).result).toBe('collision')
})
it('opens unit 5 sequentially after unit 4 and edits the order with the existing move action', () => {
  const store = new ProgressRepository()
  const first = allStages.indexOf(unit5Stages[0])
  expect(isUnlocked(store.getProgress(), first)).toBe(false)
  for (const stage of allStages.slice(0, allStages.indexOf(unit4Stages[2]) + 1)) store.completeStage(stage.id, 3, stage.solution)
  expect(isUnlocked(store.getProgress(), first)).toBe(true)
  expect(isUnlocked(store.getProgress(), first + 1)).toBe(false)
  const editor = new EditorController()
  editor.configure(unit5Stages[2].initialProgram!, blocks => { editor.program = blocks }, false, 5)
  editor.select('set'); editor.move('up')
  expect(runAll(unit5Stages[2], editor.program).result).toBe('success')
  editor.select('repeat'); editor.toggleRepeatSource()
  expect(editor.program[1]).toMatchObject({ type: 'repeat', count: 3 })
  editor.toggleRepeatSource()
  expect(editor.program[1]).toMatchObject({ countVariable: 'A' })
  editor.select('set'); editor.setVariableValue(20)
  expect(editor.program[0]).toMatchObject({ value: 20 })
  editor.locked = true; editor.setVariableValue(0)
  expect(editor.program[0]).toMatchObject({ value: 20 })
})

// Exhaust the grammar through six nodes; transforms include every traversable
// robot pose and every A value, so equivalence remains valid inside repeats.
for (const [index, allowSet] of [[0, false], [1, false], [1, true]] as const) {
  it(`unit5-${index + 1}: no ${allowSet ? 'change' : 'variable'} shortcut within budget`, () => {
    const stage = unit5Stages[index], grids = stage.variants!
    const poses = grids.flatMap((grid, map) => grid.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '#' || cell === 'G' ? [] : [0, 1, 2, 3].map(dir => ({ map, x, y, dir })))))
    const values = allowSet ? 21 : 1
    const success = poses.length * values, failure = success + 1
    const identity = Array.from({ length: failure + 1 }, (_, i) => i)
    const compose = (a: number[], b: number[]) => a.map(value => b[value])
    const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    const commands = [0, 1, 2].map(type => [...poses.flatMap(pose => Array.from({ length: values }, (_, A) => {
      const [dx, dy] = offsets[pose.dir]
      const x = pose.x + (type === 0 ? dx : 0), y = pose.y + (type === 0 ? dy : 0)
      const cell = grids[pose.map][y]?.[x]
      if (!cell || cell === '#') return failure
      if (cell === 'G') return success
      const dir = type === 0 ? pose.dir : (pose.dir + (type === 1 ? 3 : 1)) % 4
      return poses.findIndex(p => p.map === pose.map && p.x === x && p.y === y && p.dir === dir) * values + A
    })), success, failure])
    if (allowSet) for (let A = 0; A <= 20; A++) commands.push([...identity.slice(0, success).map(i => Math.floor(i / values) * values + A), success, failure])
    const starts = grids.map((grid, map) => poses.findIndex(p => p.map === map && grid[p.y][p.x] === 'S' && p.dir === 1) * values + (allowSet ? stage.variantVariables![map].A : 0))
    const bySize: number[][][] = [[identity]], seen = new Set([String.fromCharCode(...identity)])
    for (let size = 1; size <= stage.maxBlocks!; size++) {
      const current: number[][] = []
      const add = (transform: number[]) => {
        if (starts.every(i => transform[i] === success)) throw new Error(`shortcut of size ${size}`)
        const key = String.fromCharCode(...transform)
        if (seen.has(key)) return
        seen.add(key); current.push(transform)
      }
      for (const command of commands) for (const tail of bySize[size - 1]) add(compose(command, tail))
      for (let bodySize = 0; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
        let repeated = identity
        const powers = [identity]
        for (let count = 1; count <= (allowSet ? 20 : 10); count++) { repeated = compose(repeated, body); powers.push(repeated) }
        for (const tail of bySize[size - bodySize - 1]) {
          for (let count = 2; count <= 10; count++) add(compose(powers[count], tail))
          if (allowSet) add(compose(identity.map((i) => i >= success ? i : powers[i % values][i]), tail))
        }
      }
      bySize.push(current)
    }
    expect(seen.size).toBeGreaterThan(100)
  }, 120000)
}
