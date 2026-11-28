import { Observable } from './Observable'
import { countDocument, validInput } from '../model/factory/program'
import { completedFactoryUnits, factoryAccess, readFactoryDocument, runFactory, type FactoryProgress } from '../model/factory/unlocks'
import type { Block, FunctionDef, Pile, ProgramDocument, RunInput, Shape } from '../model/factory/types'

export type FactoryTarget = { kind: 'main' } | { kind: 'function'; id: string } | { kind: 'body' | 'else'; id: string }
type EditorState = { input: RunInput; canUndo: boolean; requiredUnits: number[]; locked: boolean }
const emptyInput = (): RunInput => ({ start: { belt: [], piles: { leaf: [], moon: [], sun: [] } }, program: { main: [], functions: [] }, orders: [], target: 0, signals: [] })
function lists(doc: ProgramDocument): Block[][] {
  const result: Block[][] = []
  const visit = (list: Block[]) => { result.push(list); for (const b of list) { if ('body' in b) visit(b.body); if (b.type === 'if' && b.else) visit(b.else) } }
  visit(doc.main)
  for (const f of doc.functions) visit(f.body)
  return result
}
function destination(doc: ProgramDocument, target: FactoryTarget): Block[] | undefined {
  if (target.kind === 'main') return doc.main
  if (target.kind === 'function') return doc.functions.find(f => f.id === target.id)?.body
  const b = lists(doc).flat().find(b => b.id === target.id)
  if (target.kind === 'else') return b?.type === 'if' ? (b.else ??= []) : undefined
  return b && 'body' in b ? b.body : undefined
}

/** Provisional headless editor. Every accepted mutation is atomic and undoable. */
export class FactoryEditorController extends Observable<EditorState> {
  private input: RunInput
  private progress: FactoryProgress
  private previous: RunInput[] = []
  private serial = 0
  constructor(input: RunInput = emptyInput(), progress: FactoryProgress = { stages: {} }) {
    if (!validInput(input)) throw new Error('Invalid factory input')
    super({ input: structuredClone(input), canUndo: false, requiredUnits: [], locked: false })
    this.input = structuredClone(input)
    this.progress = structuredClone(progress)
    this.publish()
  }
  get units() { return completedFactoryUnits(this.progress) }
  nextBlockId() { return this.id('factory-block', lists(this.input.program).flat().map(b => b.id)) }
  canAdd(block: Block, target: FactoryTarget = { kind: 'main' }): boolean {
    const next = structuredClone(this.input)
    const list = destination(next.program, target)
    if (!list) return false
    list.push(structuredClone(block))
    return validInput(next) && factoryAccess(next.program, this.progress, next).allowed
  }
  canReplace(block: Block): boolean {
    const next = structuredClone(this.input)
    const list = lists(next.program).find(l => l.some(b => b.id === block.id))
    if (!list) return false
    list[list.findIndex(b => b.id === block.id)] = structuredClone(block)
    return validInput(next) && factoryAccess(next.program, this.progress, next).allowed
  }
  get doc() { return structuredClone(this.input.program) }
  get total() { return countDocument(this.input.program) }
  private publish() { this.update({ input: structuredClone(this.input), canUndo: !this.state.locked && this.previous.length > 0, requiredUnits: factoryAccess(this.input.program, this.progress, this.input).requiredUnits, locked: this.state.locked }) }
  setLocked(locked: boolean) { this.state = { ...this.state, locked }; this.publish() }
  setProgress(progress: FactoryProgress) { this.progress = structuredClone(progress); this.publish() }
  private id(prefix: string, used: string[]) { let id: string; do { id = `${prefix}-${++this.serial}` } while (used.includes(id)); return id }
  private edit(change: (next: RunInput) => boolean, code = true): boolean {
    if (this.state.locked) return false
    const next = structuredClone(this.input)
    if (!change(next) || !validInput(next) || code && !factoryAccess(next.program, this.progress, next).allowed || JSON.stringify(next) === JSON.stringify(this.input)) return false
    this.previous.push(this.input)
    this.input = next
    this.publish()
    return true
  }
  /** Reads preserve valid locked documents, without writing persistence. */
  loadDocument(doc: unknown): boolean {
    if (this.state.locked) return false
    const loaded = readFactoryDocument(doc, this.progress)
    if (!loaded) return false
    this.previous.push(this.input)
    this.input = { ...structuredClone(this.input), program: loaded.program }
    this.publish()
    return true
  }
  editDocument(program: ProgramDocument): boolean {
    return this.edit(next => { next.program = structuredClone(program); return true })
  }
  add(block: Block, target: FactoryTarget = { kind: 'main' }, index?: number): boolean {
    return this.edit(next => {
      const list = destination(next.program, target)
      const at = index ?? list?.length ?? 0
      if (!list || !Number.isInteger(at) || at < 0 || at > list.length) return false
      list.splice(at, 0, structuredClone(block))
      return true
    })
  }
  remove(id: string): boolean {
    return this.edit(next => { const list = lists(next.program).find(l => l.some(b => b.id === id)); if (!list) return false; list.splice(list.findIndex(b => b.id === id), 1); return true })
  }
  replace(id: string, block: Block): boolean {
    return this.edit(next => { const list = lists(next.program).find(l => l.some(b => b.id === id)); if (!list || block.id !== id) return false; list[list.findIndex(b => b.id === id)] = structuredClone(block); return true })
  }
  move(id: string, target: FactoryTarget, index: number): boolean {
    return this.edit(next => {
      const from = lists(next.program).find(l => l.some(b => b.id === id))
      if (!from) return false
      const [block] = from.splice(from.findIndex(b => b.id === id), 1)
      // Resolve after removal: cannot move a block inside itself or its descendants.
      const to = destination(next.program, target)
      if (!to || !Number.isInteger(index) || index < 0 || index > to.length) return false
      to.splice(index, 0, block); return true
    })
  }
  duplicate(id: string, target: FactoryTarget = { kind: 'main' }, index?: number): boolean {
    const source = lists(this.input.program).flat().find(b => b.id === id)
    if (!source) return false
    const copy = structuredClone(source), used = lists(this.input.program).flat().map(b => b.id)
    const rename = (b: Block) => { b.id = this.id('factory-block', used); used.push(b.id); if ('body' in b) b.body.forEach(rename); if (b.type === 'if') b.else?.forEach(rename) }
    rename(copy)
    return this.add(copy, target, index)
  }
  createFunction(param = false): string | undefined {
    const id = this.id('factory-function', this.input.program.functions.map(f => f.id))
    const accepted = this.edit(next => {
      if (next.program.functions.length >= 2) return false
      next.program.functions.push({ id, icon: next.program.functions.length ? 'moon' : 'star', ...(param ? { param: true as const } : {}), body: [] })
      return true
    })
    return accepted ? id : undefined
  }
  editFunction(id: string, definition: FunctionDef): boolean {
    return this.edit(next => { const index = next.program.functions.findIndex(f => f.id === id); if (index < 0 || definition.id !== id) return false; next.program.functions[index] = structuredClone(definition); return true })
  }
  removeFunction(id: string): boolean {
    // Referenced functions must first have their call sites edited/removed.
    return this.edit(next => { const i = next.program.functions.findIndex(f => f.id === id); if (i < 0) return false; next.program.functions.splice(i, 1); return true })
  }
  addBox(place: 'belt' | Pile, shape: Shape, index?: number): boolean {
    return this.edit(next => {
      const list = place === 'belt' ? next.start.belt : next.start.piles[place], at = index ?? list.length
      if (!Number.isInteger(at) || at < 0 || at > list.length) return false
      const used = [next.start.belt, ...Object.values(next.start.piles)].flat().map(b => b.id)
      list.splice(at, 0, { id: this.id('factory-box', used), shape }); return true
    }, false)
  }
  removeBox(place: 'belt' | Pile, index: number): boolean {
    return this.edit(next => { const list = place === 'belt' ? next.start.belt : next.start.piles[place]; if (!Number.isInteger(index) || index < 0 || index >= list.length) return false; list.splice(index, 1); return true }, false)
  }
  moveBox(place: 'belt' | Pile, from: number, to: number): boolean {
    return this.edit(next => { const list = place === 'belt' ? next.start.belt : next.start.piles[place]; if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < list.length)) return false; const [box] = list.splice(from, 1); list.splice(to, 0, box); return true }, false)
  }
  setOrders(orders: number[]): boolean { return this.edit(next => { next.orders = [...orders]; return true }) }
  setTarget(target: number): boolean { return this.edit(next => { next.target = target; return true }) }
  setSignals(signals: RunInput['signals']): boolean { return this.edit(next => { next.signals = [...signals]; return true }) }
  undo(): boolean {
    if (this.state.locked || !this.previous.length) return false
    this.input = this.previous.pop()!
    this.publish(); return true
  }
  run() { return runFactory(this.input, this.progress) }
}
