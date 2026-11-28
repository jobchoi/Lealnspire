import { validInput } from './program'
import type { Atom, Block, Condition, Context, ErrorCode, Frame, RunInput, RunResult, RuntimeError, State, Value, ValueCall } from './types'

export const COMPUTATION_LIMIT = 1000
export const LOOP_ENTRY_LIMIT = 1000
const HALT = Symbol('factory halt')
type Flow = { kind: 'return'; value: number } | { kind: 'break' } | undefined

export function run(input: RunInput): RunResult { return runWithLimits(input) }

/** All work is synchronous and isolated. Playback/stop/unlocks belong to later controllers. */
export function runWithLimits(input: RunInput, limits: { computation?: number; loopEntries?: number } = {}): RunResult {
  // Optional tighter budgets support isolated hosts/tests; production ceilings cannot be raised.
  const computationLimit = limits.computation ?? COMPUTATION_LIMIT
  const loopEntryLimit = limits.loopEntries ?? LOOP_ENTRY_LIMIT
  if (!Number.isInteger(computationLimit) || computationLimit < 0 || computationLimit > COMPUTATION_LIMIT || !Number.isInteger(loopEntryLimit) || loopEntryLimit < 0 || loopEntryLimit > LOOP_ENTRY_LIMIT) throw new Error('Invalid factory limits')
  if (!validInput(input)) throw new Error('Invalid factory input')
  const source = structuredClone(input)
  const state: State = { ...source.start, held: null, A: 0 }
  const context: Context = { loops: [], lists: [] }
  const frames: Frame[] = []
  let cost = 0, loopEntries = 0
  let error: RuntimeError | undefined
  const snapshot = (event: Frame['event'], blockId: string | null, value?: number | boolean) => {
    frames.push(structuredClone({ state, activeBlockId: blockId, context, cost, event, ...(value !== undefined ? { value } : {}), ...(error ? { error } : {}) }))
  }
  function fail(code: ErrorCode, blockId: string, params: RuntimeError['params'] = {}): never {
    error = structuredClone({ code, blockId, params, context })
    throw HALT
  }
  // Reserve before reading or mutating, then emit at most one frame per charged work item.
  function work(id: string, event: Frame['event'] = 'operation', action: () => number | boolean | void = () => {}): number | boolean | void {
    if (cost >= computationLimit) fail('stepLimit', id)
    cost++
    try {
      const value = action()
      snapshot(event, id, value === undefined ? undefined : value)
      return value
    } catch (e) {
      if (e === HALT) snapshot(event, id)
      throw e
    }
  }
  function enter(id: string) {
    if (loopEntries >= loopEntryLimit) fail('stepLimit', id)
    work(id, 'loop', () => { loopEntries++ })
  }
  function read(v: Value, id: string): number {
    switch (v.kind) {
    case 'number': return v.value
    case 'A': return state.A
    case 'param': return context.call!.arg!
    case 'beltCount': return state.belt.length
    case 'pileCount': return state.piles[v.pile].length
    case 'listLength': return source.orders.length
    case 'current': return context.lists.at(-1)!.value
    case 'listAtA':
      if (state.A >= source.orders.length) fail('indexRange', id, { index: state.A, length: source.orders.length })
      return source.orders[state.A]
    }
  }
  function atom(a: Atom): boolean {
    switch (a.kind) {
    case 'beltEmpty': return state.belt.length === 0
    case 'beltHasBoxes': return state.belt.length > 0
    case 'heldEmpty': return state.held === null
    case 'heldHasBox': return state.held !== null
    case 'pileEmpty': return state.piles[a.pile].length === 0
    case 'pileHasBoxes': return state.piles[a.pile].length > 0
    case 'pileFull': return state.piles[a.pile].length === 6
    case 'heldShape': return state.held?.shape === a.shape
    case 'pileShape': return state.piles[a.pile].at(-1)?.shape === a.shape
    case 'matchesTarget': return context.lists.at(-1)!.value === source.target
    }
  }
  function condition(c: Condition, id: string): boolean {
    if (c.kind === 'atom') return work(id, 'check', () => atom(c.atom)) as boolean
    if (c.kind === 'not') return !condition(c.operand, id)
    const left = condition(c.left, id), right = condition(c.right, id)
    return c.kind === 'and' ? left && right : left || right
  }
  function call(c: ValueCall, id: string, needsValue: boolean): number | undefined {
    const fn = source.program.functions.find(f => f.id === c.fn)!
    const previous = context.call
    // Calls cannot nest. List context remains visible in traces, never in function values.
    context.call = { callId: id, fn: c.fn, ...(c.arg ? { arg: read(c.arg, id) } : {}) }
    work(id)
    const flow = execute(fn.body)
    if (needsValue && flow?.kind !== 'return') fail('missingReturn', id)
    context.call = previous
    return flow?.kind === 'return' ? flow.value : undefined
  }
  function execute(blocks: Block[]): Flow {
    for (const b of blocks) {
      switch (b.type) {
      case 'on': break
      case 'takeBelt': case 'takePile':
        work(b.id, 'operation', () => {
          if (state.held) fail('heldOccupied', b.id, b.type === 'takePile' ? { pile: b.pile } : { place: 'belt' })
          if (b.type === 'takeBelt') {
            if (!state.belt.length) fail('beltEmpty', b.id, { place: 'belt' })
            state.held = state.belt.shift()!
          } else {
            if (!state.piles[b.pile].length) fail('pileEmpty', b.id, { pile: b.pile })
            state.held = state.piles[b.pile].pop()!
          }
        })
        break
      case 'putPile':
        work(b.id, 'operation', () => {
          if (!state.held) fail('heldEmpty', b.id, { pile: b.pile })
          if (state.piles[b.pile].length === 6) fail('pileFull', b.id, { pile: b.pile })
          state.piles[b.pile].push(state.held)
          state.held = null
        })
        break
      case 'set': case 'change':
        work(b.id, 'operation', () => {
          const next = b.type === 'set' ? b.value : state.A + b.by
          if (next < 0 || next > 20) fail('variableRange', b.id)
          state.A = next
        })
        break
      case 'call': call(b, b.id, false); break
      case 'return': {
        work(b.id)
        const value = work(b.id, 'read', () => read(b.value, b.id)) as number
        return { kind: 'return', value }
      }
      case 'breakForEach': work(b.id); return { kind: 'break' }
      case 'if': {
        work(b.id)
        const flow = execute(condition(b.condition, b.id) ? b.body : b.else ?? [])
        if (flow) return flow
        break
      }
      case 'while': {
        let iteration = 0
        while (true) {
          context.loops.push({ blockId: b.id, iteration: ++iteration })
          work(b.id)
          if (!condition(b.condition, b.id)) { context.loops.pop(); break }
          enter(b.id)
          const flow = execute(b.body)
          context.loops.pop()
          if (flow) return flow
        }
        break
      }
      case 'repeat': {
        work(b.id)
        // Read once on entry, before any body can alter A or a source container.
        let count: number
        if (b.countCall) {
          work(b.id, 'read')
          count = call(b.countCall, b.id, true)!
        } else {
          count = work(b.id, 'read', () => read(b.countSource ?? (b.countVariable ? { kind: 'A' } : b.countParam ? { kind: 'param' } : { kind: 'number', value: b.count! }), b.id)) as number
        }
        for (let i = 1; i <= count; i++) {
          context.loops.push({ blockId: b.id, iteration: i, count })
          enter(b.id)
          const flow = execute(b.body)
          context.loops.pop()
          if (flow) return flow
        }
        break
      }
      case 'forEach': {
        // Like other loops, one control entry; each visit costs one and is a loop entry.
        work(b.id)
        const indices = source.orders.map((_, i) => i)
        if (b.direction === 'back') indices.reverse()
        for (const [visit, index] of indices.entries()) {
          context.lists.push({ blockId: b.id, index, value: source.orders[index] })
          context.loops.push({ blockId: b.id, iteration: visit + 1, count: indices.length })
          enter(b.id)
          const flow = execute(b.body)
          context.loops.pop()
          context.lists.pop()
          if (flow?.kind === 'return') return flow
          if (flow?.kind === 'break') break
        }
        break
      }
      }
    }
    return undefined
  }
  snapshot('initial', null)
  try {
    execute(source.program.main)
    for (let index = 0; index < source.signals.length; index++) {
      const signal = source.signals[index]
      const handler = source.program.main.find(b => b.type === 'on' && b.signal === signal)
      context.signal = { index, signal, ...(handler ? { handlerId: handler.id } : {}) }
      work(handler?.id ?? '', handler ? 'signal' : 'unconnected')
      if (handler?.type === 'on') execute(handler.body)
    }
    delete context.signal
  } catch (e) {
    if (e !== HALT) throw e
  }
  snapshot('end', error?.blockId ?? null)
  return structuredClone({ result: error ? error.code === 'stepLimit' ? 'stepLimit' : 'error' : 'ended', state, frames, cost, loopEntries, ...(error ? { error } : {}) })
}
