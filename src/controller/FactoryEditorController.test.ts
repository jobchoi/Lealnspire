import { describe, expect, it } from 'vitest'
import { FactoryEditorController } from './FactoryEditorController'
import { factoryUnits } from '../model/factory/unlocks'
import type { Block, RunInput } from '../model/factory/types'

const progress = { stages: Object.fromEntries(factoryUnits.flat().map(s => [s.id, { completed: true, bestStars: 0, lastProgram: [] }])) }
const input = (): RunInput => ({ start: { belt: [], piles: { leaf: [], moon: [], sun: [] } }, program: { main: [], functions: [] }, orders: [], target: 0, signals: [] })
const set = (id: string): Block => ({ id, type: 'set', variable: 'A', value: 0 })
const atom = { kind: 'atom', atom: { kind: 'heldEmpty' } } as const

describe('factory editor', () => {
  it('counts nested bodies, both branches and functions at 30/31, including duplication', () => {
    const v = input()
    v.program = {
      main: [{ id: 'if', type: 'if', condition: atom, body: [{ id: 'w', type: 'while', condition: atom, body: [set('inner')] }], else: Array.from({ length: 10 }, (_, i) => set(`else${i}`)) }],
      functions: [{ id: 'f', icon: 'star', body: [{ id: 'r', type: 'repeat', count: 2, body: Array.from({ length: 15 }, (_, i) => set(`fn${i}`)) }] }],
    }
    const e = new FactoryEditorController(v, progress)
    expect(e.total).toBe(29)
    expect(e.duplicate('inner', { kind: 'function', id: 'f' })).toBe(true)
    expect(e.total).toBe(30)
    const before = e.doc
    expect(e.add(set('31'), { kind: 'else', id: 'if' })).toBe(false)
    expect(e.add(set('31'), { kind: 'function', id: 'f' })).toBe(false)
    expect(e.add(set('31'))).toBe(false)
    expect(e.duplicate('inner')).toBe(false)
    expect(e.duplicate('if')).toBe(false)
    expect(e.doc).toEqual(before)
    expect(e.undo()).toBe(true)
    expect(e.doc).toEqual(v.program)
    expect(e.duplicate('if')).toBe(false)
  })
  it('adds to each container, moves across branches and functions, and rejects invalid contexts atomically', () => {
    const e = new FactoryEditorController(input(), progress)
    const f = e.createFunction(true)!
    expect(e.add({ id: 'if', type: 'if', condition: atom, body: [] })).toBe(true)
    expect(e.add({ id: 'w', type: 'while', condition: atom, body: [] }, { kind: 'body', id: 'if' })).toBe(true)
    expect(e.add({ id: 'each', type: 'forEach', body: [] }, { kind: 'else', id: 'if' })).toBe(true)
    expect(e.add({ id: 'r', type: 'repeat', count: 2, body: [] }, { kind: 'body', id: 'w' })).toBe(true)
    expect(e.add(set('s'), { kind: 'body', id: 'r' })).toBe(true)
    expect(e.move('s', { kind: 'function', id: f }, 0)).toBe(true)
    expect(e.add({ id: 'ret', type: 'return', value: { kind: 'param' } }, { kind: 'function', id: f })).toBe(true)
    expect(e.add({ id: 'call', type: 'call', fn: f, arg: { kind: 'number', value: 2 } })).toBe(true)
    expect(e.add({ id: 'stop', type: 'breakForEach' }, { kind: 'body', id: 'each' })).toBe(true)
    expect(e.add({ id: 'on', type: 'on', signal: '○', body: [] })).toBe(true)
    expect(e.add(set('signal-set'), { kind: 'body', id: 'on' })).toBe(true)
    const before = e.doc
    expect(e.move('if', { kind: 'body', id: 'w' }, 0)).toBe(false)
    expect(e.move('stop', { kind: 'main' }, 0)).toBe(false)
    expect(e.move('ret', { kind: 'main' }, 0)).toBe(false)
    expect(e.add({ id: 'recursive', type: 'call', fn: f, arg: { kind: 'A' } }, { kind: 'function', id: f })).toBe(false)
    expect(e.removeFunction(f)).toBe(false)
    expect(e.doc).toEqual(before)
    expect(e.replace('call', { id: 'call', type: 'call', fn: f, arg: { kind: 'A' } })).toBe(true)
    expect(e.createFunction()).toBeDefined()
    expect(e.createFunction()).toBeUndefined()
    expect(e.editFunction(f, { id: f, icon: 'star', body: [] })).toBe(false)
    expect(e.editFunction(f, { id: f, icon: 'star', param: true, body: [{ id: 'new-return', type: 'return', value: { kind: 'beltCount' } }] })).toBe(true)
    expect(e.remove('call')).toBe(true)
    expect(e.removeFunction(f)).toBe(true)
    expect(e.undo()).toBe(true)
    expect(e.doc.functions.some(fn => fn.id === f)).toBe(true)
  })
  it('duplicates entire subtrees with fresh ids and independent ownership', () => {
    const e = new FactoryEditorController(input(), progress)
    const block: Block = { id: 'if', type: 'if', condition: atom, body: [set('yes')], else: [set('no')] }
    expect(e.add(block)).toBe(true)
    expect(e.duplicate('if')).toBe(true)
    block.body.push(set('external'))
    const [a, b] = e.doc.main
    expect(a.id).not.toBe(b.id)
    expect(e.total).toBe(6)
    expect(e.replace('yes', { ...set('yes'), type: 'set', value: 3, variable: 'A' })).toBe(true)
    expect(e.total).toBe(6)
    expect(e.remove('missing')).toBe(false)
  })
  it('edits start state without unit completion and enforces belt/pile/total limits and undo', () => {
    const e = new FactoryEditorController()
    for (let i = 0; i < 12; i++) expect(e.addBox('belt', i % 2 ? '○' : '◆')).toBe(true)
    expect(e.addBox('belt', '△')).toBe(false)
    for (let i = 0; i < 6; i++) expect(e.addBox('leaf', '△')).toBe(true)
    expect(e.addBox('leaf', '◆')).toBe(false)
    expect(e.addBox('moon', '◆')).toBe(false)
    expect(e.removeBox('belt', 0)).toBe(true)
    expect(e.addBox('moon', '◆')).toBe(true)
    expect(e.moveBox('belt', 0, 10)).toBe(true)
    expect(e.getSnapshot().input.start.belt.at(-1)?.shape).toBe('○')
    expect(e.undo()).toBe(true)
    expect(e.getSnapshot().input.start.belt[0].shape).toBe('○')
    expect(e.removeBox('sun', 0)).toBe(false)
    expect(e.moveBox('belt', -1, 0)).toBe(false)
    expect(e.addBox('sun', 'bad' as '◆')).toBe(false)
    const piles = new FactoryEditorController()
    for (let i = 0; i < 6; i++) expect(piles.addBox('sun', '◆')).toBe(true)
    expect(piles.addBox('sun', '◆')).toBe(false)
  })
  it('locks edits and undo, publishes subscriptions and isolates caller-owned inputs', () => {
    const v = input(), e = new FactoryEditorController(v, progress)
    let notifications = 0
    const unsubscribe = e.subscribe(() => notifications++)
    expect(e.add(set('s'))).toBe(true)
    v.program.main.push(set('external'))
    expect(e.total).toBe(1)
    e.setLocked(true)
    expect(e.undo()).toBe(false)
    expect(e.addBox('belt', '◆')).toBe(false)
    expect(e.loadDocument({ main: [], functions: [] })).toBe(false)
    e.setLocked(false)
    expect(e.undo()).toBe(true)
    expect(e.total).toBe(0)
    expect(notifications).toBe(4)
    unsubscribe()
    expect(e.undo()).toBe(false)
  })
  it('validates orders, target and signals and undoes input edits', () => {
    const e = new FactoryEditorController(input(), progress)
    expect(e.setOrders([0, 10, 2])).toBe(true)
    expect(e.setOrders(Array(6).fill(1))).toBe(false)
    expect(e.setOrders([-1])).toBe(false)
    expect(e.setTarget(10)).toBe(true)
    expect(e.setTarget(11)).toBe(false)
    expect(e.setSignals(Array(20).fill('○'))).toBe(true)
    expect(e.setSignals(Array(21).fill('○'))).toBe(false)
    expect(e.undo()).toBe(true)
    expect(e.getSnapshot().input.signals).toEqual([])
    expect(e.run().allowed).toBe(true)
  })
})
