import type { Block, Condition, Program as BlockTree } from './types'
import { createBlock, findBlockPath, hasBody, blockAt, cloneBlock } from './editor'

export const MAX_PROGRAM_BLOCKS = 10

// Paths contain an index at each nesting level; an empty parent path is the root.
function updateList(program: BlockTree, path: number[], update: (list: BlockTree) => BlockTree): BlockTree {
  if (!path.length) return update(program)
  const [index, ...rest] = path
  const block = program[index]
  if (!block || !hasBody(block)) throw new Error('Invalid body path')
  if (block.type === 'if' && rest[0] === -1) return program.map((item, i) => i === index ? { ...block, else: updateList(block.else ?? [], rest.slice(1), update) } : item)
  return program.map((item, i) => i === index ? { ...block, body: updateList(block.body, rest, update) } : item)
}
function splitPath(path: number[]): [number[], number] {
  if (!path.length) throw new Error('Block path cannot be empty')
  return [path.slice(0, -1), path[path.length - 1]]
}
function checkIndex(list: BlockTree, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new Error('Invalid block index')
}

export class Program {
  static readonly MAX_BLOCKS = MAX_PROGRAM_BLOCKS
  private readonly tree: BlockTree
  constructor(tree: BlockTree = []) { this.tree = structuredClone(tree) }
  toBlocks(): BlockTree { return structuredClone(this.tree) }
  count(): number { return Program.countBlocks(this.tree) }
  find(id: string): number[] | undefined { return findBlockPath(this.tree, id) }
  create(type: Block['type']): Block { return createBlock(this.tree, type) }
  add(block: Block, parent: number[] = []): Program { return new Program(Program.addBlock(this.tree, block, parent)) }
  remove(path: number[]): Program { return new Program(Program.deleteBlock(this.tree, path)) }
  move(path: number[], direction: 'up' | 'down'): Program { return new Program(Program.moveBlock(this.tree, path, direction)) }
  setCount(path: number[], count: number): Program { return new Program(Program.setRepeatCount(this.tree, path, count)) }
  static addBlock(program: BlockTree, block: Block, parentPath: number[] = []): BlockTree {
    if (countBlocks(program) + countBlocks([block]) > MAX_PROGRAM_BLOCKS) return program
    if (block.type === 'on' && (parentPath.length || program.some(item => item.type === 'on' && item.signal === block.signal))) return program
    return updateList(program, parentPath, list => [...list, block])
  }
  static deleteBlock(program: BlockTree, path: number[]): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => { checkIndex(list, index); return list.filter((_, i) => i !== index) })
  }
  static moveBlock(program: BlockTree, path: number[], direction: 'up' | 'down'): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const target = index + (direction === 'up' ? -1 : 1)
      if (target < 0 || target >= list.length) return [...list]
      const copy = [...list]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy
    })
  }
  static setRepeatCount(program: BlockTree, path: number[], count: number): BlockTree {
    if (!Number.isInteger(count) || count < 2 || count > 10) throw new Error('Invalid repeat count')
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const block = list[index]
      if (block.type !== 'repeat') throw new Error('Block is not a repeat')
      return list.map((item, i) => i === index ? { ...block, count } : item)
    })
  }
  static setSignal(program: BlockTree, path: number[], signal: import('./types').EventSignal): BlockTree {
    if (path.length !== 1 || blockAt(program, path)?.type !== 'on' || !['◇', '○', '△'].includes(signal)) return program
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'on') return block
      // Swapping occupied connections lets the repair puzzle keep both bodies intact.
      return { ...block, signal }
    }).map((block, index) => block.type === 'on' && index !== path[0] && block.signal === signal
      ? { ...block, signal: (program[path[0]] as Extract<Block, { type: 'on' }>).signal } : block)
  }
  static setVariableValue(program: BlockTree, path: number[], value: number): BlockTree {
    if (!Number.isInteger(value) || value < 0 || value > 20) throw new Error('Invalid variable value')
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'set') throw new Error('Block is not a set')
      return { ...block, value }
    })
  }
  static toggleChange(program: BlockTree, path: number[]): BlockTree {
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'change') throw new Error('Block is not a change')
      return { ...block, by: block.by === 1 ? -1 : 1 }
    })
  }
  static setRepeatSource(program: BlockTree, path: number[], source: 'number' | 'A' | 'param' | import('./types').ListSource | import('./types').ValueCall): BlockTree {
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'repeat') throw new Error('Block is not a repeat')
      const { countVariable: _variable, countParam: _param, countCall: _call, countSource: _source, ...numeric } = block
      if (typeof source === 'object') return { ...numeric, countCall: structuredClone(source) }
      if (source === 'current' || source === 'listAtA' || source === 'listLength') { const { count: _count, ...plain } = numeric; return { ...plain, countSource: source } }
      return source === 'param' ? { ...numeric, countParam: true } : source === 'A' ? { ...numeric, countVariable: 'A' } : { ...numeric, count: block.count ?? 3 }
    })
  }
  static setReturnValue(program: BlockTree, path: number[], value: import('./types').ReturnValue): BlockTree {
    if (value.kind === 'number' ? !Number.isInteger(value.value) || value.value < 0 || value.value > 20 : !['A', 'param', 'ahead'].includes(value.kind)) throw new Error('Invalid return value')
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'return') throw new Error('Block is not a return')
      return { ...block, value: structuredClone(value) }
    })
  }
  static setCallArgument(program: BlockTree, path: number[], arg: import('./types').CallArgument): BlockTree {
    if (arg.kind !== 'A' && (arg.kind !== 'number' || !Number.isInteger(arg.value) || arg.value < 0 || arg.value > 20)) throw new Error('Invalid call argument')
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'call') throw new Error('Block is not a call')
      return { ...block, arg: structuredClone(arg) }
    })
  }
  private static editVariableBlock(program: BlockTree, path: number[], edit: (block: Block) => Block): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      return list.map((block, i) => i === index ? edit(block) : block)
    })
  }
  static setCondition(program: BlockTree, path: number[], condition: Condition | 'blockedAhead' | 'clearAhead'): BlockTree {
    if (typeof condition !== 'string' && !validCondition(condition)) throw new Error('Invalid condition')
    return Program.editVariableBlock(program, path, block => {
      if (block.type !== 'if' && block.type !== 'while') throw new Error('Block has no condition')
      if (typeof condition === 'string' && condition !== (block.type === 'if' ? 'blockedAhead' : 'clearAhead')) throw new Error('Invalid condition')
      return { ...block, condition: structuredClone(condition) } as Block
    })
  }
  static setElse(program: BlockTree, path: number[], enabled: boolean): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const block = list[index]
      if (block.type !== 'if') throw new Error('Block is not an if')
      const { else: alternative, ...plain } = block
      return list.map((item, i) => i === index ? enabled ? { ...block, else: alternative ?? [] } : plain : item)
    })
  }
  static countBlocks(program: BlockTree): number {
    return program.reduce((sum, block) => sum + 1 + (hasBody(block) ? countBlocks(block.body) : 0) + (block.type === 'if' ? countBlocks(block.else ?? []) : 0), 0)
  }
}
export const addBlock = Program.addBlock
export const deleteBlock = Program.deleteBlock
export const moveBlock = Program.moveBlock
export const setRepeatCount = Program.setRepeatCount
export const countBlocks = Program.countBlocks

/** Only an atom, a negated atom, or one binary operator with atomic operands is accepted. */
export function validCondition(value: unknown): value is Condition {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  const atom = (v: unknown): boolean => record(v) && Object.keys(v).length === 2 && v.kind === 'atom' && (v.atom === 'matchesTarget' || v.atom === 'clearAhead' || v.atom === 'blockedAhead' || v.atom === 'blockedLeft' || v.atom === 'blockedRight')
  const operand = (v: unknown): boolean => atom(v) || record(v) && Object.keys(v).length === 2 && v.kind === 'not' && atom(v.operand)
  return operand(value) || record(value) && Object.keys(value).length === 3 && (value.kind === 'and' || value.kind === 'or') && operand(value.left) && operand(value.right)
}

/** Canonical sensor conditions for the logic editor; callers gate this to unit 6. */
export function normalizeLogicCondition(condition: Condition | 'blockedAhead' | 'clearAhead'): Condition {
  if (typeof condition === 'string') return normalizeLogicCondition({ kind: 'atom', atom: condition })
  if (condition.kind === 'atom') return condition.atom === 'clearAhead'
    ? { kind: 'not', operand: { kind: 'atom', atom: 'blockedAhead' } } : structuredClone(condition)
  if (condition.kind === 'not') {
    const operand = normalizeLogicCondition(condition.operand)
    return operand.kind === 'not' ? operand.operand : { kind: 'not', operand }
  }
  return { ...condition, left: normalizeLogicCondition(condition.left), right: normalizeLogicCondition(condition.right) }
}
export function normalizeLogicProgram(program: BlockTree): BlockTree {
  return program.map(block => hasBody(block) ? {
    ...block,
    body: normalizeLogicProgram(block.body),
    ...(block.type === 'if' || block.type === 'while' ? { condition: normalizeLogicCondition(block.condition) } : {}),
    ...(block.type === 'if' && block.else ? { else: normalizeLogicProgram(block.else) } : {}),
  } as Block : structuredClone(block))
}

/** Validate persisted documents with a shared node/ID budget across all bodies. */
export function validDocument(value: unknown, palette?: Block['type'][], allowVariableCount = true, allowLogic = true, allowParams = true, allowReturns = true, allowEvents = true, allowLists = true, allowSearch = true): value is import('./types').ProgramDocument {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (!record(value) || !Array.isArray(value.main) || !Array.isArray(value.functions) || value.functions.length > 2) return false
  if (allowSearch && palette?.includes('breakForEach') && value.functions.length) return false
  const functions = new Map<string, boolean>()
  for (const fn of value.functions) {
    if (!record(fn) || typeof fn.id !== 'string' || !fn.id || functions.has(fn.id) || (fn.icon !== 'star' && fn.icon !== 'moon') || !Array.isArray(fn.body)) return false
    if (fn.param !== undefined && (!allowParams || fn.param !== true)) return false
    functions.set(fn.id, fn.param === true)
  }
  function argument(arg: unknown): boolean {
    return record(arg) && (arg.kind === 'A' && Object.keys(arg).length === 1 || arg.kind === 'number' && Object.keys(arg).length === 2 && Number.isInteger(arg.value) && Number(arg.value) >= 0 && Number(arg.value) <= 20)
  }
  function valueCall(value: unknown): boolean {
    return record(value) && typeof value.fn === 'string' && functions.has(value.fn) && Object.keys(value).every(key => key === 'fn' || key === 'arg') && (functions.get(value.fn) ? allowParams && argument(value.arg) : value.arg === undefined)
  }
  const signals = new Set<string>()
  const ids = new Set<string>()
  let nodes = 0
  function list(input: unknown[], depth: number, inFunction: boolean, param = false, inEach = false): boolean {
    for (const block of input) {
      if (++nodes > 60 || depth > MAX_PROGRAM_BLOCKS || !record(block) || typeof block.id !== 'string' || !block.id || ids.has(block.id)) return false
      ids.add(block.id)
      if ('countSource' in block && (!allowLists || block.type !== 'repeat')) return false
      if ('value' in block && block.type !== 'set' && block.type !== 'return') return false
      if ('countCall' in block && (!allowReturns || block.type !== 'repeat')) return false
      if ('arg' in block && block.type !== 'call' || 'countParam' in block && block.type !== 'repeat') return false
      if (palette && !palette.includes(block.type as Block['type'])) return false
      if ('direction' in block && (block.type !== 'forEach' || !allowSearch || !['front', 'back'].includes(String(block.direction)))) return false
      if (allowSearch && palette?.includes('breakForEach') && (block.type === 'forward' && (depth !== 1 || inFunction) || block.type === 'if' && (!record(block.condition) || block.condition.kind !== 'atom' || block.condition.atom !== 'matchesTarget'))) return false
      if ((block.type === 'if' || block.type === 'while') && record(block.condition) && validCondition(block.condition) && JSON.stringify(block.condition).includes('matchesTarget') && (!allowSearch || block.type !== 'if' || block.condition.kind !== 'atom' || block.condition.atom !== 'matchesTarget' || !inEach)) return false
      switch (block.type) {
      case 'breakForEach':
        if (!allowSearch || !inEach || inFunction) return false
        break
      case 'forEach':
        if (!allowLists || inFunction || !Array.isArray(block.body) || !list(block.body, depth + 1, false, false, true)) return false
        break
      case 'on':
        if (!allowEvents || inFunction || depth !== 1 || typeof block.signal !== 'string' || !['◇', '○', '△'].includes(block.signal) || signals.has(String(block.signal)) || !Array.isArray(block.body)) return false
        signals.add(String(block.signal))
        if (!list(block.body, depth + 1, false)) return false
        break
      case 'return':
        if (!allowReturns || !inFunction || !record(block.value) || !(argument(block.value) || Object.keys(block.value).length === 1 && (block.value.kind === 'ahead' || block.value.kind === 'param' && allowParams && param))) return false
        break
      case 'set': if (block.variable !== 'A' || !Number.isInteger(block.value) || Number(block.value) < 0 || Number(block.value) > 20) return false; break
      case 'change': if (block.variable !== 'A' || block.by !== 1 && block.by !== -1) return false; break
      case 'call': {
        if (inFunction || typeof block.fn !== 'string' || !functions.has(block.fn)) return false
        if (functions.get(block.fn)) {
          if (!allowParams || !record(block.arg) || !(block.arg.kind === 'A' && Object.keys(block.arg).length === 1 || block.arg.kind === 'number' && Object.keys(block.arg).length === 2 && Number.isInteger(block.arg.value) && Number(block.arg.value) >= 0 && Number(block.arg.value) <= 20)) return false
        } else if (block.arg !== undefined) return false
        break
      }
      case 'forward': case 'turnLeft': case 'turnRight': break
      case 'repeat': case 'if': case 'while':
        if (!Array.isArray(block.body)) return false
        if ((block.type === 'if' || block.type === 'while') && typeof block.condition !== 'string' && !allowLogic && !(allowSearch && record(block.condition) && block.condition.kind === 'atom' && block.condition.atom === 'matchesTarget')) return false
        if (block.type === 'repeat') {
          if (block.countSource !== undefined) {
            if (!allowLists || inFunction || !['current', 'listAtA', 'listLength'].includes(String(block.countSource)) || block.countSource === 'current' && !inEach || block.count !== undefined || block.countVariable !== undefined || block.countParam !== undefined || block.countCall !== undefined) return false
          }
          if (block.countCall !== undefined && (inFunction || !valueCall(block.countCall) || block.countVariable !== undefined || block.countParam !== undefined)) return false
          if (block.countParam !== undefined && (!allowParams || !param || block.countParam !== true || block.countVariable !== undefined)) return false
          if (block.countVariable !== undefined && (!allowVariableCount || block.countVariable !== 'A')) return false
          if (!block.countSource && !block.countCall && !block.countParam && block.countVariable !== 'A' || block.count !== undefined) {
            if (!Number.isInteger(block.count) || Number(block.count) < 2 || Number(block.count) > 10) return false
          }
        }
        if (block.type === 'while' && (block.condition !== 'clearAhead' && !validCondition(block.condition) || 'else' in block)) return false
        if (block.type === 'if' && (block.condition !== 'blockedAhead' && !validCondition(block.condition) || 'else' in block && !Array.isArray(block.else))) return false
        if (!list(block.body, depth + 1, inFunction, param, inEach)) return false
        if (block.type === 'if' && Array.isArray(block.else) && !list(block.else, depth + 1, inFunction, param, inEach)) return false
        break
      default: return false
      }
    }
    return true
  }
  return list(value.main, 1, false) && value.functions.every(fn => list(fn.body, 1, true, fn.param === true))
}

/** Immutable doc edits share the same tree operations for main and function bodies. */
export class FunctionProgram {
  private readonly doc: import('./types').ProgramDocument
  constructor(doc: import('./types').ProgramDocument = { main: [], functions: [] }) {
    if (!validDocument(doc)) throw new Error('Invalid program doc')
    this.doc = structuredClone(doc)
  }
  toDocument() { return structuredClone(this.doc) }
  count() { return countBlocks(this.doc.main) + this.doc.functions.reduce((n, fn) => n + countBlocks(fn.body), 0) }
  createFunction(): FunctionProgram {
    if (this.doc.functions.length === 2) return this
    let serial = 1
    while (this.doc.functions.some(fn => fn.id === `function-${serial}`)) serial++
    const icon = this.doc.functions.some(fn => fn.icon === 'star') ? 'moon' : 'star'
    return new FunctionProgram({ ...this.doc, functions: [...this.doc.functions, { id: `function-${serial}`, icon, body: [] }] })
  }
  setParameter(id: string, enabled: boolean): FunctionProgram {
    if (!this.doc.functions.some(fn => fn.id === id)) throw new Error('Unknown function')
    const clean = (blocks: BlockTree): BlockTree => blocks.map(block => {
      if (block.type === 'return' && block.value.kind === 'param') return { ...block, value: { kind: 'number', value: 0 } }
      if (block.type === 'repeat' && block.countCall?.fn === id) {
        const { arg: _arg, ...plain } = block.countCall
        return { ...block, countCall: enabled ? { ...plain, arg: block.countCall.arg ?? { kind: 'number', value: 2 } } : plain, body: clean(block.body) }
      }
      if (block.type === 'call' && block.fn === id) {
        const { arg: _arg, ...plain } = block
        return enabled ? { ...plain, arg: block.arg ?? { kind: 'number', value: 2 } } : plain
      }
      if (!hasBody(block)) return block
      const copy = { ...block, body: clean(block.body), ...(block.type === 'if' && block.else ? { else: clean(block.else) } : {}) }
      if (copy.type === 'repeat' && copy.countParam) {
        const { countParam: _param, ...plain } = copy
        return { ...plain, count: copy.count ?? 3 }
      }
      return copy
    })
    return new FunctionProgram({ main: clean(this.doc.main), functions: this.doc.functions.map(fn => {
      if (fn.id !== id) return fn
      const { param: _param, ...plain } = fn
      return enabled ? { ...fn, param: true } : { ...plain, body: clean(fn.body) }
    }) })
  }
  removeFunction(id: string): FunctionProgram {
    const strip = (blocks: BlockTree): BlockTree => blocks.filter(block => (block.type !== 'call' || block.fn !== id) && (block.type !== 'repeat' || block.countCall?.fn !== id)).map(block => hasBody(block) ? { ...block, body: strip(block.body), ...(block.type === 'if' && block.else ? { else: strip(block.else) } : {}) } : block)
    return new FunctionProgram({ main: strip(this.doc.main), functions: this.doc.functions.filter(fn => fn.id !== id) })
  }
  edit(body: (blocks: BlockTree) => BlockTree, fn?: string): FunctionProgram {
    if (fn && !this.doc.functions.some(def => def.id === fn)) throw new Error('Unknown function')
    const next = new FunctionProgram(fn ? { ...this.doc, functions: this.doc.functions.map(def => def.id === fn ? { ...def, body: body(structuredClone(def.body)) } : def) } : { ...this.doc, main: body(structuredClone(this.doc.main)) })
    return next.count() > MAX_PROGRAM_BLOCKS ? this : next
  }
  create(type: Block['type'], fn = ''): Block {
    const all = [...this.doc.main, ...this.doc.functions.flatMap(def => def.body)]
    const block = createBlock(all, type)
    return block.type === 'call' ? { ...block, fn, ...(this.doc.functions.find(def => def.id === fn)?.param ? { arg: { kind: 'number' as const, value: 2 } } : {}) } : block
  }
  add(block: Block, parent: number[] = [], fn?: string) { return this.edit(body => Program.addBlock(body, structuredClone(block), parent), fn) }
  remove(path: number[], fn?: string) { return this.edit(body => Program.deleteBlock(body, path), fn) }
  move(path: number[], direction: 'up' | 'down', fn?: string) { return this.edit(body => Program.moveBlock(body, path, direction), fn) }
  duplicate(path: number[], fn?: string): FunctionProgram {
    const body = fn ? this.doc.functions.find(def => def.id === fn)?.body : this.doc.main
    if (!body) throw new Error('Unknown function')
    const source = blockAt(body, path)
    if (!source) throw new Error('Invalid block path')
    return this.add(cloneBlock([...this.doc.main, ...this.doc.functions.flatMap(def => def.body)], source), path.slice(0, -1), fn)
  }
}
