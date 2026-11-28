import { describe, expect, it } from 'vitest'
import { countDocument, validCondition, validDocument, validInput } from './program'
import type { Block, Box, ProgramDocument, RunInput } from './types'

const doc = (main: Block[] = []): ProgramDocument => ({ main, functions: [] })
const input = (): RunInput => ({ start: { belt: [], piles: { leaf: [], moon: [], sun: [] } }, program: doc(), orders: [], target: 0, signals: [] })
const boxes = (n: number, prefix = 'b'): Box[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, shape: '◆' }))
const blocks = (n: number, prefix = 'b'): Block[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, type: 'takeBelt' }))

describe('factory structure, independent of unit unlocks', () => {
  it('accepts empty, 12-belt, 6-pile and 18-total boundaries; rejects each overflow', () => {
    const v = input()
    expect(validInput(v)).toBe(true)
    v.start.belt = boxes(12)
    v.start.piles.leaf = boxes(6, 'p')
    expect(validInput(v)).toBe(true)
    v.start.piles.moon = boxes(1, 'm')
    expect(validInput(v)).toBe(false)
    v.start.piles.moon = []
    v.start.belt = boxes(13)
    expect(validInput(v)).toBe(false)
    v.start.belt = []
    v.start.piles.leaf = boxes(7)
    expect(validInput(v)).toBe(false)
  })
  it('rejects unknown shapes, duplicate/empty IDs, held initial state, malformed containers', () => {
    const v = input()
    v.start.belt = boxes(1)
    for (const bad of [
      { ...v, start: { ...v.start, belt: [{ id: 'x', shape: 'square' }] } },
      { ...v, start: { ...v.start, belt: [...boxes(1), ...boxes(1)] } },
      { ...v, start: { ...v.start, belt: [{ id: '', shape: '◆' }] } },
      { ...v, start: { ...v.start, held: null } },
      { ...v, start: { belt: [], piles: {} } },
    ]) expect(validInput(bad)).toBe(false)
  })
  it('counts both branches, nested and unused function bodies, accepts 30 and rejects 31', () => {
    const v: ProgramDocument = { main: [{ id: 'if', type: 'if', condition: { kind: 'atom', atom: { kind: 'heldEmpty' } }, body: blocks(10), else: blocks(10, 'e') }], functions: [{ id: 'fn', icon: 'star', body: blocks(9, 'f') }] }
    expect(countDocument(v)).toBe(30)
    expect(validDocument(v)).toBe(true)
    v.functions[0].body.push({ id: 'extra', type: 'takeBelt' })
    expect(countDocument(v)).toBe(31)
    expect(validDocument(v)).toBe(false)
  })
  it('rejects duplicate block/function IDs, absent functions, recursive calls and bad argument combinations', () => {
    const f = { id: 'f', icon: 'star' as const, param: true as const, body: [] }
    const v: ProgramDocument = { main: [{ id: 'c', type: 'call', fn: 'f', arg: { kind: 'A' } }], functions: [f] }
    expect(validDocument(v)).toBe(true)
    for (const bad of [
      doc([...blocks(1), ...blocks(1)]),
      doc([{ id: 'c', type: 'call', fn: 'missing' }]),
      { ...v, functions: [f, f] },
      { ...v, main: [{ id: 'c', type: 'call', fn: 'f' }] },
      { ...v, functions: [{ ...f, body: v.main }] },
      doc([{ id: 'r', type: 'repeat', count: 2, countVariable: 'A', body: [] } as unknown as Block]),
      doc([{ id: 'x', type: 'takeBelt', pile: 'leaf' } as unknown as Block]),
    ]) expect(validDocument(bad)).toBe(false)
  })
  it('checks static contexts for params, returns, lists, breaks and handlers', () => {
    const invalid: unknown[] = [
      doc([{ id: 'r', type: 'return', value: { kind: 'number', value: 1 } }]),
      doc([{ id: 'b', type: 'breakForEach' }]),
      doc([{ id: 'r', type: 'repeat', countParam: true, body: [] }]),
      doc([{ id: 'r', type: 'repeat', countSource: { kind: 'current' }, body: [] }]),
      doc([{ id: 'if', type: 'if', condition: { kind: 'atom', atom: { kind: 'matchesTarget' } }, body: [] }]),
      doc([{ id: 'r', type: 'repeat', count: 2, body: [{ id: 'o', type: 'on', signal: '○', body: [] }] }]),
      doc([{ id: 'o', type: 'on', signal: '○', body: [] }, { id: 'p', type: 'on', signal: '○', body: [] }]),
      { main: [], functions: [{ id: 'f', icon: 'moon', body: [{ id: 'l', type: 'forEach', body: [] }] }] },
      { main: [], functions: [{ id: 'f', icon: 'moon', body: [{ id: 'r', type: 'return', value: { kind: 'param' } }] }] },
    ]
    for (const v of invalid) expect(validDocument(v)).toBe(false)
    expect(validDocument(doc([{ id: 'o', type: 'on', signal: '○', body: [{ id: 'l', type: 'forEach', body: [{ id: 'b', type: 'breakForEach' }] }] }]))).toBe(true)
  })
  it('bounds orders, target, signals, numeric values and shallow logic', () => {
    const v = input()
    v.signals = Array(20).fill('◇')
    v.orders = [0, 10, 0, 10, 0]
    expect(validInput(v)).toBe(true)
    for (const bad of [{ ...v, signals: Array(21).fill('◇') }, { ...v, signals: ['◆'] }, { ...v, orders: [11] }, { ...v, orders: [0.5] }, { ...v, orders: Array(6).fill(0) }, { ...v, target: -1 }]) expect(validInput(bad)).toBe(false)
    const a = { kind: 'atom', atom: { kind: 'heldEmpty' } }
    expect(validCondition({ kind: 'and', left: a, right: { kind: 'not', operand: a } })).toBe(true)
    expect(validCondition({ kind: 'not', operand: { kind: 'not', operand: a } })).toBe(false)
    for (const b of [{ id: 'r', type: 'repeat', count: 0, body: [] }, { id: 's', type: 'set', variable: 'A', value: 21 }, { id: 'c', type: 'change', variable: 'A', by: 2 }]) expect(validDocument({ main: [b], functions: [] })).toBe(false)
    const cyclic: Record<string, unknown> = { id: 'r', type: 'repeat', count: 2 }
    cyclic.body = [cyclic]
    expect(validDocument({ main: [cyclic], functions: [] })).toBe(false)
  })
})
