import { programDocument } from './types'
import { validCondition, validDocument } from './program'
import { cellKey, parseGrid } from './grid'
import type { Block, Condition, ConditionAtom, Dir, Frame, ProgramInput, RunResult, RunAllResult, EventSignal, EventState, Stage, ValueCall, ReturnTrace } from './types'

const directions: Dir[] = ['N', 'E', 'S', 'W']
const offsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const

/** One external publication per completion boundary. Queue guard also bounds future producers. */
export function supplySignal(state: EventState, signal: EventSignal): boolean {
  if (state.cursor >= 128 || state.queue.length >= 64) return false
  state.cursor++
  if (signal === '◇') state.doors.a = true
  if (signal === '○') state.doors.b = true
  state.queue.push(signal)
  return true
}

export class Interpreter {
  static run(stage: Stage, program: ProgramInput, initialVariables = stage.variantVariables?.[0] ?? { A: 0 }): RunResult {
    const doc = programDocument(program)
    if ((!Array.isArray(program) || stage.events || stage.lists) && !validDocument(doc, stage.search ? ['forward', 'forEach', 'if', 'breakForEach'] : undefined, true, true, true, true, stage.events === true, !!stage.lists, !!stage.search)) throw new Error('Invalid program doc')
    if (stage.lists && (stage.lists.length !== (stage.variants?.length ?? 1) || stage.lists.some(list => !Array.isArray(list) || list.length < 1 || list.length > 5 || list.some(value => !Number.isInteger(value) || value < 0 || value > 10)))) throw new Error('Invalid stage lists')
    if (stage.search && (!stage.lists || !Number.isInteger(stage.search.target) || stage.search.target < 0 || stage.search.target > 10 || !Number.isInteger(stage.search.maxComparisons) || stage.search.maxComparisons < 0 || doc.functions.length)) throw new Error('Invalid search stage')
    const search: NonNullable<Frame['search']> = { count: 0, checked: [] }
    const list = stage.lists?.[0]
    let current: NonNullable<Frame['list']>['current']
    let read: NonNullable<Frame['list']>['read']
    const listTrace = () => list ? { ...(stage.search ? { search: structuredClone(search) } : {}), list: { ...(current ? { current: { ...current } } : {}), ...(read ? { read: { ...read } } : {}) } } : {}
    const eventState: EventState = { cursor: 0, queue: [], doors: { a: false, b: false }, phase: 'idle' }
    const signals = stage.signals?.[0] ?? []
    if (signals.some(signal => !['◇', '○', '△'].includes(signal))) throw new Error('Unknown signal')
    let a = initialVariables.A
    if (!Number.isInteger(a) || a < 0 || a > 20) throw new Error('Invalid initial variable value')
    let serial = 0
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
    function blockedAhead(relative = 0): boolean {
      const [dx, dy] = offsets[directions[(directions.indexOf(dir) + relative) % 4]]
      const next = { x: pos.x + dx, y: pos.y + dy }
      return next.x < 0 || next.y < 0 || next.x >= grid.width || next.y >= grid.height || grid.walls.has(cellKey(next)) || !!grid.doors.get(cellKey(next)) && !eventState.doors[grid.doors.get(cellKey(next))!]
    }
    function check(condition: 'blockedAhead' | 'clearAhead' | Condition, blockId: string): NonNullable<Frame['check']> {
      if (typeof condition === 'string') return { blockId, condition, result: condition === 'blockedAhead' ? blockedAhead() : !blockedAhead() }
      if (condition.kind === 'atom' && condition.atom === 'matchesTarget') {
        if (!stage.search || !current) throw new Error('Invalid search comparison')
        const match = current.value === stage.search.target
        search.count++
        if (!search.checked.includes(current.index)) search.checked.push(current.index)
        search.comparison = { index: current.index, value: current.value, match }
        if (match) search.foundIndex = current.index
        return { blockId, condition: structuredClone(condition), result: match }
      }
      if (!validCondition(condition)) throw new Error('Unknown condition')
      const atoms: NonNullable<NonNullable<Frame['check']>['atoms']> = []
      function evaluate(node: Condition, path: string[], negated = false): boolean {
        if (node.kind === 'not') return evaluate(node.operand, [...path, 'operand'], true)
        if (node.kind === 'atom') {
          if (node.atom === 'matchesTarget') throw new Error('Invalid search comparison')
          const value = node.atom === 'blockedLeft' ? blockedAhead(3) : node.atom === 'blockedRight' ? blockedAhead(1) : node.atom === 'blockedAhead' ? blockedAhead() : !blockedAhead()
          const result = negated ? !value : value
          atoms.push({ atom: node.atom as ConditionAtom, value, path, result })
          return result
        }
        const left = evaluate(node.left, [...path, 'left'])
        const right = evaluate(node.right, [...path, 'right'])
        return node.kind === 'and' ? left && right : left || right
      }
      return { blockId, condition: structuredClone(condition), result: evaluate(condition, []), atoms }
    }
    type Signal = { kind: 'continue' } | { kind: 'return'; value: number } | { kind: 'stop' } | { kind: 'breakForEach' }
    const continuing: Signal = { kind: 'continue' }
    const stop: Signal = { kind: 'stop' }
    let valueRepeatId: string | undefined
    function ahead(): number {
      const [dx, dy] = offsets[dir]
      let count = 0
      while (count < 20) {
        const next = { x: pos.x + dx * (count + 1), y: pos.y + dy * (count + 1) }
        if (next.x < 0 || next.y < 0 || next.x >= grid.width || next.y >= grid.height || grid.walls.has(cellKey(next)) || !!grid.doors.get(cellKey(next)) && !eventState.doors[grid.doors.get(cellKey(next))!]) break
        count++
      }
      return count
    }
    function invoke(value: ValueCall, id: string, loops: NonNullable<Frame['loops']>, repeatId?: string): Signal {
      const definition = doc.functions.find(fn => fn.id === value.fn)
      if (call || !definition) throw new Error('Invalid function call')
      if (stage.returns) {
        if (steps === 1000) { result = 'stepLimit'; return stop }
        steps++
      }
      call = { callId: id, fn: value.fn, serial: ++serial, ...(definition.param ? { arg: value.arg?.kind === 'A' ? a : value.arg?.value } : {}) }
      valueRepeatId = repeatId
      if (stage.returns) frames.push({ ...listTrace(), variables: { A: a }, call: { ...call }, pos: { ...pos }, dir, activeBlockId: id, ...(loops.length ? { loops: structuredClone(loops) } : {}) })
      const signal = execute(definition.body, loops)
      call = undefined
      valueRepeatId = undefined
      return signal
    }
    function execute(blocks: Block[], loops: NonNullable<Frame['loops']> = []): Signal {
      for (const block of blocks) {
        switch (block.type) {
        case 'breakForEach': {
          if (!stage.search || !current) throw new Error('Invalid traversal break')
          if (steps === 1000) { result = 'stepLimit'; return stop }
          steps++
          frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, loops: structuredClone(loops) })
          return { kind: 'breakForEach' }
        }
        case 'forEach': {
          if (!list) throw new Error('Lists disabled')
          const outer = current
          for (let visit = 0; visit < list.length; visit++) {
            const index = block.direction === 'back' ? list.length - 1 - visit : visit
            if (steps === 1000 || repeatEntries === 1000) { result = 'stepLimit'; return stop }
            steps++; repeatEntries++
            current = { blockId: block.id, index, value: list[index] }
            read = undefined
            const eachLoops = [...loops, { blockId: block.id, iteration: visit + 1, count: list.length }]
            frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, loops: eachLoops })
            const signal = execute(block.body, eachLoops)
            if (signal.kind === 'breakForEach') {
              search.stopped = { blockId: block.id, remaining: Array.from({ length: list.length - visit - 1 }, (_, n) => block.direction === 'back' ? index - n - 1 : index + n + 1) }
              break
            }
            if (signal.kind !== 'continue') return signal
          }
          current = outer
          read = undefined
          frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: structuredClone(loops) } : {}) })
          break
        }
        case 'on':
          if (!stage.events) throw new Error('Events disabled')
          break
        case 'set':
        case 'change': {
          if (steps === 1000) { result = 'stepLimit'; return stop }
          steps++
          if (block.variable !== 'A' || block.type === 'change' && block.by !== 1 && block.by !== -1) throw new Error('Invalid variable block')
          const from = a
          const to = block.type === 'set' ? block.value : a + block.by
          const valid = Number.isInteger(to) && to >= 0 && to <= 20
          if (valid) a = to
          frames.push({ ...listTrace(), variables: { A: a }, variableChange: { variable: 'A', from, to }, ...(call ? { call: { ...call } } : {}), pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}) })
          if (!valid) { result = 'variableRange'; return stop }
          break
        }
        case 'return': {
          if (!call) throw new Error('Return outside function')
          const cost = block.value.kind === 'ahead' ? 2 : 1
          if (steps + cost > 1000) { result = 'stepLimit'; return stop }
          steps += cost
          const value = block.value.kind === 'number' ? block.value.value : block.value.kind === 'A' ? a : block.value.kind === 'param' ? call.arg! : ahead()
          const ids = (items: Block[]): string[] => items.flatMap(item => [item.id, ...('body' in item ? ids(item.body) : []), ...(item.type === 'if' ? ids(item.else ?? []) : [])])
          // The remaining execution path is skipped, including enclosing loop iterations.
          const definition = doc.functions.find(fn => fn.id === call!.fn)!
          const all = ids(definition.body)
          const returned: ReturnTrace = { ...call, blockId: block.id, value, ...(valueRepeatId ? { repeatId: valueRepeatId } : {}), skippedIds: all.slice(all.indexOf(block.id) + 1) }
          frames.push({ ...listTrace(), variables: { A: a }, call: { ...call }, returned, ...(block.value.kind === 'ahead' ? { sensorAhead: value } : {}), pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: structuredClone(loops) } : {}) })
          return { kind: 'return', value }
        }
        case 'call': {
          const signal = invoke(block, block.id, loops)
          if (signal.kind === 'stop') return signal
          break
        }
        case 'repeat': {
          let listCount: number | undefined
          if (block.countSource) {
            if (!list || block.countSource === 'current' && !current) throw new Error('Invalid list source')
            if (steps === 1000) { result = 'stepLimit'; return stop }
            steps++
            listCount = block.countSource === 'current' ? current!.value : block.countSource === 'listLength' ? list.length : list[a]
            read = { blockId: block.id, source: block.countSource, length: list.length, ...(block.countSource === 'listAtA' ? { index: a } : {}), ...(listCount === undefined ? { error: true } : { value: listCount }) }
            frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: structuredClone(loops) } : {}) })
            if (listCount === undefined) { result = 'indexRange'; return stop }
          }
          let returnedCount: number | undefined
          if (block.countCall) {
            const signal = invoke(block.countCall, block.id, loops, block.id)
            if (signal.kind === 'stop') return signal
            if (signal.kind !== 'return') {
              result = 'missingReturn'
              frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: structuredClone(loops) } : {}) })
              return stop
            }
            returnedCount = signal.value
          }
          const count = block.countSource ? listCount! : block.countCall ? returnedCount! : block.countParam ? (call?.arg ?? NaN) : block.countVariable === 'A' ? a : (block.count ?? NaN)
          if (block.countVariable !== undefined && block.countVariable !== 'A') throw new Error('Unknown variable')
          if (!Number.isInteger(count) || count < 0 || count > 20 || !block.countSource && !block.countCall && !block.countVariable && !block.countParam && (count < 2 || count > 10)) throw new Error('Invalid repeat count')
          for (let i = 0; i < count; i++) {
            // Bound interpreter work even when the body produces no frames.
            if (repeatEntries === 1000) { result = 'stepLimit'; return stop }
            repeatEntries++
            const signal = execute(block.body, [...loops, { blockId: block.id, iteration: i + 1, count }])
            if (signal.kind !== 'continue') return signal
          }
          break
        }
        case 'while': {
          let iteration = 1
          for (;;) {
            if (steps === 1000) { result = 'stepLimit'; whileLimitBlockId = block.id; whileLimitCall = call ? { ...call } : undefined; return stop }
            steps++
            const checked = check(block.condition, block.id)
            const currentLoops = [...loops, { blockId: block.id, iteration }]
            frames.push({ ...listTrace(), ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, loops: currentLoops, event: 'check', check: checked })
            if (!checked.result) break
            const signal = execute(block.body, currentLoops)
            if (signal.kind !== 'continue') {
              if (result === 'stepLimit' && !whileLimitBlockId) { whileLimitBlockId = block.id; whileLimitCall = call ? { ...call } : undefined }
              return signal
            }
            iteration++
          }
          break
        }
        case 'if': {
          if (steps === 1000) { result = 'stepLimit'; return stop }
          steps++
          const checked = check(block.condition, block.id)
          frames.push({ ...listTrace(), ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'check', check: checked })
          const signal = execute(checked.result ? block.body : block.else ?? [], loops)
          if (signal.kind !== 'continue') return signal
          break
        }
        case 'forward': {
          if (steps === 1000) { result = 'stepLimit'; return stop }
          steps++
          const [dx, dy] = offsets[dir]
          const next = { x: pos.x + dx, y: pos.y + dy }
          if (blockedAhead()) {
            frames.push({ ...listTrace(), ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'bump' }); result = 'collision'; return stop
          }
          pos = next
          const goal = cellKey(pos) === cellKey(grid.goal)
          frames.push({ ...listTrace(), ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: goal ? 'goal' : 'move' })
          if (goal) { result = stage.search ? search.foundIndex === undefined ? 'unfinished' : search.count > stage.search.maxComparisons ? 'comparisonLimit' : 'success' : 'success'; return stop }
          break
        }
        case 'turnLeft':
        case 'turnRight': {
          if (steps === 1000) { result = 'stepLimit'; return stop }
          steps++
          dir = directions[(directions.indexOf(dir) + (block.type === 'turnRight' ? 1 : 3)) % 4]
          frames.push({ ...listTrace(), ...(call ? { call: { ...call } } : {}), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: block.id, ...(loops.length ? { loops: loops.map(loop => ({ ...loop })) } : {}), event: 'turn' })
          break
        }
        default: {
          const unknown: never = block
          throw new Error(`Unknown block: ${JSON.stringify(unknown)}`)
        }
        }
      }
      return continuing
    }
    const main = execute(doc.main)
    function eventFrame(phase: EventState['phase'], id: string | null, signal?: EventSignal): boolean {
      if (steps >= 1000) { result = 'stepLimit'; return false }
      steps++
      eventState.phase = phase
      eventState.signal = signal
      frames.push({ ...listTrace(), variables: { A: a }, pos: { ...pos }, dir, activeBlockId: id, events: structuredClone(eventState) })
      return true
    }
    if (stage.events && main.kind === 'continue') {
      while (eventState.cursor < signals.length || eventState.queue.length) {
        if (eventState.cursor < signals.length) {
          const signal = signals[eventState.cursor] as EventSignal
          if (!supplySignal(eventState, signal)) { result = 'stepLimit'; break }
          if (!eventFrame('arrival', null, signal)) break
        }
        const signal = eventState.queue.shift()!
        const handler = doc.main.find(block => block.type === 'on' && block.signal === signal)
        if (!handler || handler.type !== 'on') {
          if (!eventFrame('unconnected', null, signal)) break
          continue
        }
        eventState.handler = { onId: handler.id, signal, serial: ++serial }
        if (!eventFrame('start', handler.id, signal)) break
        eventState.phase = 'running'
        const first = frames.length
        const outcome = execute(handler.body)
        for (let i = first; i < frames.length; i++) frames[i].events = structuredClone(eventState)
        if (outcome.kind === 'stop') break
        delete eventState.handler
        if (!eventFrame('end', handler.id, signal)) break
      }
    }
    if (stage.events) {
      // Main frames precede all device changes; preserve that initial state.
      for (const frame of frames) if (!frame.events) frame.events = { cursor: 0, queue: [], doors: { a: false, b: false }, phase: 'idle' }
    }
    return { frames, result, ...(whileLimitCall ? { whileLimitCall } : {}), ...(whileLimitBlockId ? { whileLimitBlockId } : {}) }
  }
}
export const run = Interpreter.run

export function runAll(stage: Stage, program: ProgramInput): RunAllResult {
  if (stage.lists && stage.lists.length !== (stage.variants?.length ?? 1)) throw new Error('Invalid stage lists')
  const results = (stage.variants ?? [stage.grid]).map((grid, index) => run({ ...stage, grid, ...(stage.lists ? { variants: undefined, lists: [stage.lists[index]] } : {}), signals: stage.signals ? [stage.signals[index] ?? []] : undefined }, program, stage.variantVariables?.[index] ?? { A: 0 }))
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
  if (execution.result === 'comparisonLimit') {
    const frame = execution.frames.at(-1)!
    const each = execution.frames.slice().reverse().find(f => f.event === 'check' && f.list?.current)?.list?.current?.blockId
    return each ? { blockId: each, position: { ...frame.pos }, direction: frame.dir } : null
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
