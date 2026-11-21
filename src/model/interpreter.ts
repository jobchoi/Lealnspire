import { cellKey, parseGrid } from './grid'
import type { Block, Dir, Frame, Program, RunResult, Stage } from './types'

const directions: Dir[] = ['N', 'E', 'S', 'W']
const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const

export class Interpreter {
  static run(stage: Stage, program: Program): RunResult {
    const grid = parseGrid(stage.grid)
    let pos = { ...grid.start }
    let dir = stage.startDir
    const frames: RunResult['frames'] = [{ pos: { ...pos }, dir, activeBlockId: null }]
    let steps = 0
    let repeatEntries = 0
    let result: RunResult['result'] = 'unfinished'
    function execute(blocks: Block[], loops: NonNullable<Frame['loops']> = []): boolean {
      for (const block of blocks) {
        if (block.type === 'repeat') {
          if (!Number.isInteger(block.count) || block.count < 2 || block.count > 10) throw new Error('Invalid repeat count')
          for (let i = 0; i < block.count; i++) {
            // Bound interpreter work even when the body produces no frames.
            if (repeatEntries === 1000) { result = 'stepLimit'; return true }
            repeatEntries++
            if (execute(block.body, [...loops, { blockId: block.id, iteration: i + 1, count: block.count }])) return true
          }
          continue
        }
        if (steps === 1000) { result = 'stepLimit'; return true }
        steps++
        if (block.type === 'forward') {
          const [dx, dy] = offsets[dir]
          const next = { x: pos.x + dx, y: pos.y + dy }
          if (next.x < 0 || next.y < 0 || next.x >= grid.width || next.y >= grid.height || grid.walls.has(cellKey(next))) {
            frames.push({ pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'bump' }); result = 'collision'; return true
          }
          pos = next
          const goal = cellKey(pos) === cellKey(grid.goal)
          frames.push({ pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: goal ? 'goal' : 'move' })
          if (goal) { result = 'success'; return true }
        } else {
          dir = directions[(directions.indexOf(dir) + (block.type === 'turnRight' ? 1 : 3)) % 4]
          frames.push({ pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'turn' })
        }
      }
      return false
    }
    execute(program)
    return { frames, result }
  }
}
export const run = Interpreter.run

/** Collision frames retain the position and direction before the blocked move. */
export function failurePoint(execution: RunResult) {
  if (execution.result === 'success' || execution.result === 'stepLimit') return null
  const frame = execution.result === 'collision'
    ? execution.frames.slice().reverse().find(frame => frame.event === 'bump')
    : execution.frames.slice().reverse().find(frame => frame.activeBlockId !== null)
  return frame?.activeBlockId ? { blockId: frame.activeBlockId, position: { ...frame.pos }, direction: frame.dir } : null
}
