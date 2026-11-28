import { describe, expect, it } from 'vitest'
import { run } from './interpreter'
import { countDocument } from './program'
import type { Atom, Block, Box, Condition, Pile, RunInput, Shape, State } from './types'

const atom = (atom: Atom): Condition => ({ kind: 'atom', atom })
const not = (operand: Condition): Condition => ({ kind: 'not', operand })
const take: Block = { id: 'take', type: 'takeBelt' }
const put = (pile: Pile, id = `put-${pile}`): Block => ({ id, type: 'putPile', pile })
const box = (id: string, shape: Shape = '◆'): Box => ({ id, shape })
const input = (main: Block[] = [], shapes: Shape[] = []): RunInput => ({ start: { belt: shapes.map((s, i) => box(`b${i}`, s)), piles: { leaf: [], moon: [], sun: [] } }, program: { main, functions: [] }, orders: [], target: 0, signals: [] })
const layout = (s: State) => ({ belt: s.belt, piles: s.piles, held: s.held })
const all = (s: State) => [...s.belt, ...Object.values(s.piles).flat(), ...(s.held ? [s.held] : [])].sort((a, b) => a.id.localeCompare(b.id))
const pileShapes = (s: State, p: Pile) => s.piles[p].map(b => b.shape)
const repeat = (id: string, count: number, body: Block[]): Block => ({ id, type: 'repeat', count, body })

describe('factory execution contract', () => {
  it('ends empty or with boxes remaining, resets A and starts from an independent copy', () => {
    const empty = run(input())
    expect(empty.result).toBe('ended')
    expect(empty.cost).toBe(0)
    expect(empty.frames.map(f => f.event)).toEqual(['initial', 'end'])
    const v = input([take], ['◆', '○'])
    const result = run(v)
    expect(result.result).toBe('ended')
    expect(result.state.held?.id).toBe('b0')
    expect(result.state.belt.map(b => b.id)).toEqual(['b1'])
    expect(result.state.A).toBe(0)
    expect(run(v)).toEqual(result)
    expect(v.start.belt).toHaveLength(2)
    expect(() => run({ ...v, signals: Array(21).fill('○') })).toThrow('Invalid factory input')
  })
  it('implements FIFO, stack LIFO and the three representative 3/5/6-block programs', () => {
    const a = input([repeat('r', 3, [take, put('leaf')])], ['◆', '○', '△'])
    const b = input([{ id: 'w', type: 'while', condition: atom({ kind: 'beltHasBoxes' }), body: [take, { id: 'if', type: 'if', condition: atom({ kind: 'heldShape', shape: '◆' }), body: [put('moon')], else: [put('sun')] }] }], ['◆', '○', '◆', '△'])
    const c = input([
      { id: 'w1', type: 'while', condition: { kind: 'and', left: atom({ kind: 'beltHasBoxes' }), right: not(atom({ kind: 'pileFull', pile: 'leaf' })) }, body: [take, put('leaf')] },
      { id: 'w2', type: 'while', condition: { kind: 'and', left: atom({ kind: 'pileHasBoxes', pile: 'leaf' }), right: not(atom({ kind: 'pileFull', pile: 'moon' })) }, body: [{ id: 'from-leaf', type: 'takePile', pile: 'leaf' }, put('moon')] },
    ], ['◆', '○', '△'])
    expect([a, b, c].map(v => countDocument(v.program))).toEqual([3, 5, 6])
    const [ra, rb, rc] = [a, b, c].map(run)
    expect([ra.result, rb.result, rc.result]).toEqual(['ended', 'ended', 'ended'])
    expect(pileShapes(ra.state, 'leaf')).toEqual(['◆', '○', '△'])
    expect(pileShapes(rb.state, 'moon')).toEqual(['◆', '◆'])
    expect(pileShapes(rb.state, 'sun')).toEqual(['○', '△'])
    expect(pileShapes(rc.state, 'moon')).toEqual(['△', '○', '◆'])
    c.program.main.push({ id: 'from-moon', type: 'takePile', pile: 'moon' })
    expect(run(c).state.held?.shape).toBe('◆')
  })
  it('keeps operation errors atomic and follows competing-error priority', () => {
    const cases: [RunInput, string][] = [
      [input([take]), 'beltEmpty'],
      [input([{ id: 'p', type: 'takePile', pile: 'leaf' }]), 'pileEmpty'],
      [input([put('moon')]), 'heldEmpty'],
      [input([take, { id: 'again', type: 'takeBelt' }], ['◆']), 'heldOccupied'],
      [input([take, { id: 'again', type: 'takePile', pile: 'leaf' }], ['◆']), 'heldOccupied'],
    ]
    const full = input([take, put('moon')], ['○'])
    full.start.piles.moon = Array.from({ length: 6 }, (_, i) => box(`m${i}`))
    cases.push([full, 'pileFull'])
    const emptyHeldFull = structuredClone(full)
    emptyHeldFull.program.main = [put('moon')]
    cases.push([emptyHeldFull, 'heldEmpty'])
    for (const [v, code] of cases) {
      const r = run(v)
      expect(r.result).toBe('error')
      expect(r.error?.code).toBe(code)
      expect(r.frames.at(-1)?.state).toEqual(r.frames.at(-3)?.state)
      expect(r.error?.blockId).toBe(v.program.main.at(-1)?.id)
    }
  })
  it('exhaustively conserves boxes and verifies FIFO/LIFO, read purity, atomicity in small states', () => {
    // All words over two shapes of length 0..2, at each of the four locations, total <= 4.
    const words: Shape[][] = [[], ['◆'], ['○'], ['◆', '◆'], ['◆', '○'], ['○', '◆'], ['○', '○']]
    let visited = 0
    for (const belt of words) for (const leaf of words) for (const moon of words) for (const sun of words) {
      if (belt.length + leaf.length + moon.length + sun.length > 4) continue
      const v = input([], belt)
      for (const [p, shapes] of [['leaf', leaf], ['moon', moon], ['sun', sun]] as const) v.start.piles[p] = shapes.map((s, i) => box(`${p}${i}`, s))
      const initial: State = { ...v.start, held: null, A: 0 }
      const reads: Block[] = [
        { id: 'if', type: 'if', condition: { kind: 'and', left: atom({ kind: 'pileShape', pile: 'leaf', shape: '◆' }), right: atom({ kind: 'beltEmpty' }) }, body: [], else: [] },
        { id: 'read', type: 'repeat', countSource: { kind: 'pileCount', pile: 'moon' }, body: [] },
        { id: 'belt-read', type: 'repeat', countSource: { kind: 'beltCount' }, body: [] },
      ]
      v.program.main = reads
      for (const f of run(v).frames) expect(layout(f.state)).toEqual(layout(initial))
      const operations: Block[][] = [[take, put('sun')], ...(['leaf', 'moon', 'sun'] as Pile[]).map(p => [{ id: 'pick', type: 'takePile', pile: p } as Block, put('leaf')])]
      for (const main of operations) {
        v.program.main = [main[0], ...reads, { id: 'held-read', type: 'if', condition: atom({ kind: 'heldShape', shape: '◆' }), body: [] }, main[1]]
        const r = run(v)
        for (const [i, f] of r.frames.entries()) {
          expect(all(f.state)).toEqual(all(initial))
          if (f.event === 'check' || f.event === 'read') expect(layout(f.state)).toEqual(layout(r.frames[i - 1].state))
        }
        if (r.error) expect(r.frames.at(-1)?.state).toEqual(r.frames.at(-3)?.state)
        else {
          const picked = main[0].type === 'takeBelt' ? initial.belt[0] : initial.piles[(main[0] as { pile: Pile }).pile].at(-1)
          expect(r.frames[1].state.held).toEqual(picked)
          const dest = (main[1] as { pile: Pile }).pile
          expect(r.state.piles[dest].at(-1)).toEqual(picked)
        }
      }
      visited++
    }
    // Coefficients through degree 4 of (1 + 2x + 4x²)^4: 1+8+40+128+304.
    expect(visited).toBe(481)
  })
  it('reads numeric repeats once, accepts zero dynamic counts and charges empty bodies', () => {
    const v = input([{ id: 's', type: 'set', variable: 'A', value: 3 }, { id: 'r', type: 'repeat', countVariable: 'A', body: [{ id: 'd', type: 'change', variable: 'A', by: -1 }] }])
    expect(run(v).state.A).toBe(0)
    expect(run(v).loopEntries).toBe(3)
    const zero = run(input([{ id: 'r', type: 'repeat', countVariable: 'A', body: [take] }]))
    expect(zero.result).toBe('ended')
    expect(zero.cost).toBe(2)
    expect(run(input([repeat('r', 10, [])])).cost).toBe(12)
    const changingSource = input([{ id: 'r', type: 'repeat', countSource: { kind: 'beltCount' }, body: [take, put('leaf')] }], ['◆', '○', '△'])
    expect(run(changingSource).loopEntries).toBe(3)
  })
  it('stops infinite/empty nested loops and honors the exact 1000-cost boundary before mutation', () => {
    // repeat(10)[repeat(10)[8 sets]] costs 932; two nested empty loops add 67; one set is exactly 1000.
    const sets: Block[] = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, type: 'set', variable: 'A', value: 0 }))
    const prefix: Block[] = [repeat('outer', 10, [repeat('inner', 10, sets)]), repeat('padding', 5, [repeat('padding-inner', 10, [])]), { id: 'last', type: 'set', variable: 'A', value: 1 }]
    const exact = run(input(prefix))
    expect(exact.cost).toBe(1000)
    expect(exact.result).toBe('ended')
    expect(exact.state.A).toBe(1)
    const over = run(input([...prefix, { id: 'over', type: 'set', variable: 'A', value: 2 }]))
    expect(over.result).toBe('stepLimit')
    expect(over.state.A).toBe(1)
    expect(over.error?.blockId).toBe('over')
    expect(over.frames).toHaveLength(1002)
    for (const main of [[{ id: 'w', type: 'while', condition: atom({ kind: 'heldEmpty' }), body: [] } as Block], [repeat('a', 10, [repeat('b', 10, [repeat('c', 10, [])])])]]) {
      const r = run(input(main))
      expect(r.result).toBe('stepLimit')
      expect(r.cost).toBe(1000)
      expect(r.loopEntries).toBeLessThanOrEqual(1000)
      expect(r.frames.length).toBeLessThanOrEqual(1002)
      expect(r.error?.context.loops.length).toBeGreaterThan(0)
    }
  })
  it('evaluates both logical operands, with false shape checks on empty places', () => {
    for (const kind of ['and', 'or'] as const) {
      const r = run(input([{ id: 'if', type: 'if', condition: { kind, left: atom({ kind: kind === 'and' ? 'heldHasBox' : 'heldEmpty' }), right: atom({ kind: 'pileShape', pile: 'leaf', shape: '◆' }) }, body: [] }]))
      expect(r.cost).toBe(3)
      expect(r.frames.filter(f => f.event === 'check').map(f => f.value)).toEqual([kind === 'or', false])
    }
    expect(run(input([{ id: 'i', type: 'if', condition: atom({ kind: 'heldShape', shape: '◆' }), body: [take] }])).result).toBe('ended')
  })
  it('supports parameters, early returns, value calls and ordinary calls without returns', () => {
    const v = input([{ id: 's', type: 'set', variable: 'A', value: 3 }, { id: 'r', type: 'repeat', countCall: { fn: 'f', arg: { kind: 'A' } }, body: [take, put('leaf')] }], ['◆', '○', '△'])
    v.program.functions = [{ id: 'f', icon: 'star', param: true, body: [{ id: 'ret', type: 'return', value: { kind: 'param' } }, { id: 'skipped', type: 'change', variable: 'A', by: 1 }] }]
    const r = run(v)
    expect(r.result).toBe('ended')
    expect(r.state.piles.leaf).toHaveLength(3)
    expect(r.state.A).toBe(3)
    expect(r.frames.some(f => f.activeBlockId === 'skipped')).toBe(false)
    expect(r.frames.find(f => f.activeBlockId === 'ret')?.context.call).toEqual({ callId: 'r', fn: 'f', arg: 3 })
    v.program.functions[0].body = []
    expect(run(v).error).toMatchObject({ code: 'missingReturn', blockId: 'r', context: { call: { fn: 'f' } } })
    v.program.main = [{ id: 'c', type: 'call', fn: 'f', arg: { kind: 'number', value: 2 } }]
    expect(run(v).result).toBe('ended')
    v.program.functions[0].body = [{ id: 'rp', type: 'repeat', countParam: true, body: [{ id: 'inc', type: 'change', variable: 'A', by: 1 }] }]
    expect(run(v).state.A).toBe(2)
    for (const value of [{ kind: 'number', value: 2 }, { kind: 'A' }, { kind: 'beltCount' }, { kind: 'pileCount', pile: 'leaf' }] as const) {
      v.program.functions[0].body = [{ id: 'ret', type: 'return', value }]
      expect(run(v).result).toBe('ended')
    }
  })
  it('bounds A atomically and reports list indices and lengths', () => {
    for (const [value, by] of [[0, -1], [20, 1]] as const) {
      const r = run(input([{ id: 's', type: 'set', variable: 'A', value }, { id: 'c', type: 'change', variable: 'A', by }]))
      expect(r.error?.code).toBe('variableRange')
      expect(r.state.A).toBe(value)
    }
    const v = input([{ id: 's', type: 'set', variable: 'A', value: 3 }, { id: 'r', type: 'repeat', countSource: { kind: 'listAtA' }, body: [] }])
    v.orders = [1, 2, 3]
    expect(run(v).error).toMatchObject({ code: 'indexRange', blockId: 'r', params: { index: 3, length: 3 } })
    v.program.main = [{ id: 'r', type: 'repeat', countSource: { kind: 'listAtA' }, body: [] }]
    v.orders = []
    expect(run(v).error?.params).toEqual({ index: 0, length: 0 })
  })
  it('handles empty lists, both directions, current/length reads, target and nearest-loop break', () => {
    const v = input([{ id: 'outer', type: 'forEach', direction: 'back', body: [{ id: 'inner', type: 'forEach', body: [{ id: 'r', type: 'repeat', count: 2, body: [{ id: 'stop', type: 'breakForEach' }] }] }, { id: 'inc', type: 'change', variable: 'A', by: 1 }] }])
    expect(run(v).state.A).toBe(0)
    v.orders = [0, 1, 2]
    const r = run(v)
    expect(r.state.A).toBe(3)
    expect(r.frames.filter(f => f.activeBlockId === 'inc').map(f => f.context.lists[0].index)).toEqual([2, 1, 0])
    expect(r.frames.filter(f => f.activeBlockId === 'stop')).toHaveLength(3)
    v.program.main = [{ id: 'each', type: 'forEach', body: [{ id: 'if', type: 'if', condition: atom({ kind: 'matchesTarget' }), body: [{ id: 'stop', type: 'breakForEach' }] }, { id: 'r', type: 'repeat', countSource: { kind: 'current' }, body: [{ id: 'inc', type: 'change', variable: 'A', by: 1 }] }] }, { id: 'len', type: 'repeat', countSource: { kind: 'listLength' }, body: [] }]
    v.target = 2
    expect(run(v).state.A).toBe(1)
  })
  it('runs main before signals, delivers unconnected signals, and retains handler error context', () => {
    const v = input([{ id: 'handler', type: 'on', signal: '○', body: [{ id: 'inc', type: 'change', variable: 'A', by: 1 }] }, { id: 's', type: 'set', variable: 'A', value: 2 }])
    v.signals = ['○', '◇', '○']
    const r = run(v)
    expect(r.state.A).toBe(4)
    expect(r.frames.filter(f => f.event === 'signal' || f.event === 'unconnected').map(f => [f.event, f.state.A, f.context.signal?.index])).toEqual([['signal', 2, 0], ['unconnected', 3, 1], ['signal', 3, 2]])
    v.signals = Array(20).fill('◇')
    expect(run(v).cost).toBe(21)
    v.signals = ['○']
    v.program.main = [{ id: 'handler', type: 'on', signal: '○', body: [{ id: 'each', type: 'forEach', body: [{ id: 'call', type: 'call', fn: 'f' }] }] }]
    v.orders = [1]
    v.program.functions = [{ id: 'f', icon: 'moon', body: [repeat('repeat', 2, [put('leaf')])] }]
    expect(run(v).error).toMatchObject({ code: 'heldEmpty', blockId: 'put-leaf', params: { pile: 'leaf' }, context: { signal: { index: 0, signal: '○', handlerId: 'handler' }, call: { callId: 'call', fn: 'f' }, lists: [{ blockId: 'each', index: 0, value: 1 }], loops: [{ blockId: 'each' }, { blockId: 'repeat', iteration: 1 }] } })
  })
  it('returns immediately through nested loops/branches, and reads counts in functions', () => {
    const v = input([{ id: 'r', type: 'repeat', countCall: { fn: 'f' }, body: [take, put('leaf')] }], ['◆', '○'])
    v.program.functions = [{ id: 'f', icon: 'star', body: [{ id: 'w', type: 'while', condition: atom({ kind: 'heldEmpty' }), body: [{ id: 'if', type: 'if', condition: atom({ kind: 'beltHasBoxes' }), body: [{ id: 'ret', type: 'return', value: { kind: 'beltCount' } }] }, { id: 'unreachable', type: 'change', variable: 'A', by: -1 }] }] }]
    const r = run(v)
    expect(r.result).toBe('ended')
    expect(r.state.piles.leaf).toHaveLength(2)
    expect(r.frames.some(f => f.activeBlockId === 'unreachable')).toBe(false)
    expect(r.frames.at(-1)?.context).toEqual({ call: undefined, loops: [], lists: [] })
    const list = input([{ id: 'each', type: 'forEach', body: [{ id: 'r', type: 'repeat', countSource: { kind: 'current' }, body: [{ id: 'inc', type: 'change', variable: 'A', by: 1 }] }] }, { id: 'len', type: 'repeat', countSource: { kind: 'listLength' }, body: [] }, { id: 'at', type: 'repeat', countSource: { kind: 'listAtA' }, body: [] }])
    list.orders = [0, 0, 2]
    const lr = run(list)
    expect(lr.result).toBe('ended')
    expect(lr.state.A).toBe(2)
    expect(lr.loopEntries).toBe(3 + 2 + 3 + 2)
  })
  it('does not alias inputs, adjacent/past frames, final state or error contexts', () => {
    const v = input([take, put('leaf')], ['◆', '○'])
    const r = run(v), copy = structuredClone(r)
    v.start.belt[0].shape = '△'
    expect(r).toEqual(copy)
    r.frames[0].state.belt[0].shape = '○'
    expect(r.frames[1]).toEqual(copy.frames[1])
    r.frames[2].state.piles.leaf[0].shape = '△'
    expect(r.frames.at(-1)).toEqual(copy.frames.at(-1))
    expect(r.state).toEqual(copy.state)
    r.state.piles.leaf.push(box('new'))
    expect(r.frames.at(-1)).toEqual(copy.frames.at(-1))
    const bad = run(input([{ id: 'w', type: 'while', condition: atom({ kind: 'heldEmpty' }), body: [put('leaf')] }]))
    bad.error!.context.loops[0].iteration = 99
    expect(bad.frames.at(-1)?.error?.context.loops[0].iteration).toBe(1)
  })
})
