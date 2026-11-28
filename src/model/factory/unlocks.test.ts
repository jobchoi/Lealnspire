import { describe, expect, it } from 'vitest'
import { completedFactoryUnits, factoryAccess, factoryPalette, factoryUnits, readFactoryDocument, runFactory, type FactoryProgress } from './unlocks'
import { FactoryEditorController } from '../../controller/FactoryEditorController'
import type { Block, ProgramDocument, RunInput } from './types'

export function progressFor(...units: number[]): FactoryProgress {
  return { stages: Object.fromEntries(units.flatMap(u => factoryUnits[u - 1].map(s => [s.id, { completed: true, bestStars: 0, lastProgram: [] }]))) }
}
const input = (program: ProgramDocument): RunInput => ({ start: { belt: [], piles: { leaf: [], moon: [], sun: [] } }, program, orders: [], target: 0, signals: [] })
const doc = (main: Block[]): ProgramDocument => ({ main, functions: [] })
const atom = { kind: 'atom', atom: { kind: 'heldEmpty' } } as const
const samples: ProgramDocument[] = [
  doc([{ id: 'b', type: 'repeat', count: 2, body: [] }]),
  doc([{ id: 'b', type: 'if', condition: atom, body: [], else: [] }]),
  doc([{ id: 'b', type: 'while', condition: { kind: 'atom', atom: { kind: 'beltHasBoxes' } }, body: [] }]),
  { main: [{ id: 'b', type: 'call', fn: 'f' }], functions: [{ id: 'f', icon: 'star', body: [] }] },
  doc([{ id: 'b', type: 'repeat', countSource: { kind: 'beltCount' }, body: [] }]),
  doc([{ id: 'b', type: 'if', condition: { kind: 'not', operand: atom }, body: [] }]),
  { main: [{ id: 'b', type: 'call', fn: 'f', arg: { kind: 'number', value: 2 } }], functions: [{ id: 'f', icon: 'star', param: true, body: [{ id: 'r', type: 'repeat', countParam: true, body: [] }] }] },
  { main: [{ id: 'b', type: 'repeat', countCall: { fn: 'f' }, body: [] }], functions: [{ id: 'f', icon: 'star', body: [{ id: 'r', type: 'return', value: { kind: 'number', value: 2 } }] }] },
  doc([{ id: 'b', type: 'on', signal: '○', body: [] }]),
  doc([{ id: 'b', type: 'forEach', direction: 'front', body: [{ id: 'r', type: 'repeat', countSource: { kind: 'current' }, body: [] }] }]),
  doc([{ id: 'b', type: 'forEach', direction: 'back', body: [{ id: 'i', type: 'if', condition: { kind: 'atom', atom: { kind: 'matchesTarget' } }, body: [{ id: 'stop', type: 'breakForEach' }] }] }]),
]

describe('factory unit policy', () => {
  it('requires every regular puzzle, excludes bonuses, and never infers prior units', () => {
    for (let u = 1; u <= 12; u++) {
      const p = progressFor(u)
      expect(completedFactoryUnits(p)).toEqual([u])
      delete p.stages[factoryUnits[u - 1][0].id]
      expect(completedFactoryUnits(p)).toEqual([])
    }
    expect(factoryUnits.flat().some(s => s.id.startsWith('b'))).toBe(false)
    expect(factoryAccess(samples[0], progressFor(12)).requiredUnits).toEqual([1])
  })
  it('matches palette, edit, loaded doc and execution before/after all 12 unit endings', () => {
    for (let u = 1; u <= 12; u++) {
      const program = samples[Math.min(u, 11) - 1]
      const prior = Array.from({ length: u - 1 }, (_, i) => i + 1)
      const before = progressFor(...prior)
      // Leave just the final regular puzzle unfinished.
      Object.assign(before.stages, progressFor(u).stages)
      delete before.stages[factoryUnits[u - 1].at(-1)!.id]
      const after = progressFor(...prior, u)
      for (const [p, allowed] of [[before, u === 12], [after, true]] as const) {
        expect(factoryAccess(program, p).allowed).toBe(allowed)
        expect(factoryPalette([{ program }], p)).toHaveLength(allowed ? 1 : 0)
        expect(readFactoryDocument(program, p)).toEqual({ program, ...factoryAccess(program, p) })
        expect(runFactory(input(program), p).allowed).toBe(allowed)
        const editor = new FactoryEditorController(input(doc([])), p)
        expect(editor.editDocument(program)).toBe(allowed)
        const functionsEditor = new FactoryEditorController(input(doc([])), p)
        if (program.functions.length) {
          const f = functionsEditor.createFunction(!!program.functions[0].param)
          if (allowed) expect(f).toBeDefined()
          else if (u === 4 || u === 7) expect(f).toBeUndefined()
        } else expect(functionsEditor.add(program.main[0])).toBe(allowed)
      }
    }
  })
  it('preserves locked code after deleting progression and refuses execution and locked edits', () => {
    const program = samples[10], editor = new FactoryEditorController(input(program), progressFor(...Array.from({ length: 12 }, (_, i) => i + 1)))
    editor.setProgress({ stages: {} })
    expect(editor.doc).toEqual(program)
    expect(editor.getSnapshot().requiredUnits).toEqual([1, 2, 10, 11])
    expect(editor.run()).toEqual({ allowed: false, requiredUnits: [1, 2, 10, 11] })
    expect(editor.add({ id: 'new', type: 'takeBelt' })).toBe(false)
    expect(editor.loadDocument(program)).toBe(true)
    expect(editor.doc).toEqual(program)
    expect(readFactoryDocument({ main: 'bad' }, { stages: {} })).toBeUndefined()
  })
  it('checks nested values, both logical operands, input lists and signals using the same policy', () => {
    const p = progressFor(1, 2, 3, 4, 8)
    const program: ProgramDocument = { main: [{ id: 'r', type: 'repeat', countCall: { fn: 'f', arg: { kind: 'A' } }, body: [] }], functions: [{ id: 'f', icon: 'star', param: true, body: [{ id: 'ret', type: 'return', value: { kind: 'pileCount', pile: 'leaf' } }] }] }
    expect(factoryAccess(program, p).requiredUnits).toEqual([5, 7])
    const v = input(doc([])); v.orders = [1]; v.signals = ['○']; v.target = 2
    expect(runFactory(v, p)).toEqual({ allowed: false, requiredUnits: [9, 10, 11] })
    const editor = new FactoryEditorController(input(doc([])), p)
    expect(editor.setOrders([1])).toBe(false)
    expect(editor.setSignals(['○'])).toBe(false)
    expect(editor.setTarget(2)).toBe(false)
  })
})
