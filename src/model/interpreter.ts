import { programDocument } from './types'
import { validDocument } from './program'
import { cellKey, parseGrid } from './grid'
import type { Block, Dir, Frame, ProgramInput, RunResult, RunAllResult, Stage, Sensor, Logic } from './types'

const directions: Dir[] = ['N', 'E', 'S', 'W']
const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const

export class Interpreter {
  static run(stage: Stage, program: ProgramInput, initialVariables = stage.variantVariables?.[0] ?? { A: 0 }): RunResult {
    const doc = programDocument(program)
    if (!Array.isArray(program) && !validDocument(doc)) throw new Error('Invalid program doc')
    let a = initialVariables.A
    if (!Number.isInteger(a) || a < 0 || a > 20) throw new Error('Invalid initial variable value')
    let call: Frame['call']
    const grid = parseGrid(stage.grid)
    let pos = { ...grid.start }
    let dir = stage.startDir
    const frames: RunResult['frames'] = [{ variables: { A: a }, pos: { ...pos }, dir, activeBlockId: null }]
    let whileLimitCall: Frame['call']
    let whileLimitBlockId: string | undefined
    let steps = 0
    let repeatEntries = 0
    let result: RunResult['result'] = 'unfinished'
    function blockedAhead(sensor: Sensor = 'blockedAhead'): boolean {
      const sensedDir = directions[(directions.indexOf(dir) + (sensor === 'blockedLeft' ? 3 : sensor === 'blockedRight' ? 1 : 0)) % 4]
      const [dx, dy] = offsets[sensedDir]
      const next = { x: pos.x + dx, y: pos.y + dy }
      return next.x < 0 || next.y < 0 || next.x >= grid.width || next.y >= grid.height || grid.walls.has(cellKey(next))
    }
    function checkLogic(logic: Logic): { result: boolean; logic: NonNullable<Frame['check']>['logic'] } {
      const terms = logic.terms.map(term => {
        const sensed = blockedAhead(term.sensor)
        return { sensor: term.sensor, not: term.not === true, sensed, value: term.not ? !sensed : sensed }
      })
      const op = 'op' in logic ? logic.op : undefined
      return { result: op === 'and' ? terms.every(term => term.value) : op === 'or' ? terms.some(term => term.value) : terms[0].value,
        logic: { terms, ...(op ? { op } : {}) } }
    }
    function execute(blocks: Block[], loops: NonNullable<Frame['loops']> = []): boolean {
      for (const block of blocks) {
        switch (block.type) {
        case 'set':
        case 'change': {
          if (steps === 1000) { result = 'stepLimit'; return true }
          steps++
          if (block.variable !== 'A' || block.type === 'change' && block.by !== 1 && block.by !== -1) throw new Error('Invalid variable block')
          const from = a
          const to = block.type === 'set' ? block.value : a + block.by
          const valid = Number.isInteger(to) && to >= 0 && to <= 20
          if (valid) a = to
          frames.push({ variables: { A: a }, variableChange: { variable: 'A', from, to }, ...(call ? { call: { ...call } } : {}), pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}) })
          if (!valid) { result = 'variableRange'; return true }
          break
        }
        case 'call': {
          const definition = doc.functions.find(fn => fn.id === block.fn)!
          call = { callId: block.id, fn: block.fn }
          const stopped = execute(definition.body, loops)
          call = undefined
          if (stopped) return true
          break
        }
        case 'repeat': {
          const count = block.countVariable === 'A' ? a : (block.count ?? NaN)
          if (block.countVariable !== undefined && block.countVariable !== 'A') throw new Error('Unknown variable')
          if (!Number.isInteger(count) || count < 0 || count > 20 || !block.countVariable && (count < 2 || count > 10)) throw new Error('Invalid repeat count')
          for (let i = 0; i < count; i++) {
            // Bound interpreter work even when the body produces no frames.
            if (repeatEntries === 1000) { result = 'stepLimit'; return true }
            repeatEntries++
            if (execute(block.body, [...loops, { blockId: block.id, iteration: i + 1, count }])) return true
          }
          break
        }
        case 'while': {
          if (block.condition !== 'clearAhead') throw new Error('Unknown condition')
          let iteration = 1
          for (;;) {
            if (steps === 1000) { result = 'stepLimit'; whileLimitBlockId = block.id; whileLimitCall = call ? { ...call } : undefined; return true }
            steps++
            const evaluation = block.logic ? checkLogic(block.logic) : undefined
            const checked = evaluation ? evaluation.result : !blockedAhead()
            const currentLoops = [...loops, { blockId: block.id, iteration }]
            frames.push({ ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, loops: currentLoops, event: 'check', check: { blockId: block.id, condition: block.condition, result: checked, ...(evaluation ? { logic: evaluation.logic } : {}) } })
            if (!checked) break
            if (execute(block.body, currentLoops)) {
              if (result === 'stepLimit' && !whileLimitBlockId) { whileLimitBlockId = block.id; whileLimitCall = call ? { ...call } : undefined }
              return true
            }
            iteration++
          }
          break
        }
        case 'if': {
          if (steps === 1000) { result = 'stepLimit'; return true }
          steps++
          if (block.condition !== 'blockedAhead') throw new Error('Unknown condition')
          const evaluation = block.logic ? checkLogic(block.logic) : undefined
          const checked = evaluation ? evaluation.result : blockedAhead()
          frames.push({ ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'check', check: { blockId: block.id, condition: block.condition, result: checked, ...(evaluation ? { logic: evaluation.logic } : {}) } })
          if (execute(checked ? block.body : block.else ?? [], loops)) return true
          break
        }
        case 'forward': {
          if (steps === 1000) { result = 'stepLimit'; return true }
          steps++
          const [dx, dy] = offsets[dir]
          const next = { x: pos.x + dx, y: pos.y + dy }
          if (blockedAhead()) {
            frames.push({ ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'bump' }); result = 'collision'; return true
          }
          pos = next
          const goal = cellKey(pos) === cellKey(grid.goal)
          frames.push({ ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: goal ? 'goal' : 'move' })
          if (goal) { result = 'success'; return true }
          break
        }
        case 'turnLeft':
        case 'turnRight': {
          if (steps === 1000) { result = 'stepLimit'; return true }
          steps++
          dir = directions[(directions.indexOf(dir) + (block.type === 'turnRight' ? 1 : 3)) % 4]
          frames.push({ ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'turn' })
          break
        }
        default: {
          const unknown: never = block
          throw new Error(`Unknown block: ${JSON.stringify(unknown)}`)
        }
        }
      }
      return false
    }
    execute(doc.main)
    return { frames, result, ...(whileLimitCall ? { whileLimitCall } : {}), ...(whileLimitBlockId ? { whileLimitBlockId } : {}) }
  }
}
export const run = Interpreter.run

export function runAll(stage: Stage, program: ProgramInput): RunAllResult {
  const results = (stage.variants ?? [stage.grid]).map((grid, index) => run({ ...stage, grid }, program, stage.variantVariables?.[index] ?? { A: 0 }))
  const index = results.findIndex(execution => execution.result !== 'success')
  return { results, result: index < 0 ? 'success' : results[index].result, failedVariant: index < 0 ? null : index }
}

/** Collision frames retain the position and direction before the blocked move. */
export function failurePoint(execution: RunResult | RunAllResult): { blockId: string; position: Frame['pos']; direction: Dir; variant?: number; call?: Frame['call'] } | null {
  if ('results' in execution) {
    if (execution.failedVariant === null) return null
    const point = failurePoint(execution.results[execution.failedVariant])
    return point ? { ...point, variant: execution.failedVariant } : null
  }
  if (execution.result === 'stepLimit' && execution.whileLimitBlockId) {
    const frame = execution.frames[execution.frames.length - 1]
    return { blockId: execution.whileLimitBlockId, position: { ...frame.pos }, direction: frame.dir, ...(execution.whileLimitCall ? { call: { ...execution.whileLimitCall } } : {}) }
  }
  if (execution.result === 'success' || execution.result === 'stepLimit') return null
  const frame = execution.result === 'collision'
    ? execution.frames.slice().reverse().find(frame => frame.event === 'bump')
    : execution.frames.slice().reverse().find(frame => frame.activeBlockId !== null)
  return frame?.activeBlockId ? { blockId: frame.activeBlockId, position: { ...frame.pos }, direction: frame.dir, ...(frame.call ? { call: { ...frame.call } } : {}) } : null
}
