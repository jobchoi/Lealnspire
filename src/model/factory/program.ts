import type { Block, Condition, ProgramDocument, RunInput } from './types'

export const MAX_FACTORY_BLOCKS = 30
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(key => allowed.includes(key))
const integer = (v: unknown, max: number, min = 0) => Number.isInteger(v) && Number(v) >= min && Number(v) <= max
const pile = (v: unknown) => v === 'leaf' || v === 'moon' || v === 'sun'
const shape = (v: unknown) => v === '◆' || v === '○' || v === '△'
const signal = (v: unknown) => v === '◇' || v === '○' || v === '△'
const argument = (v: unknown): boolean => record(v) && (v.kind === 'number' && keys(v, ['kind', 'value']) && integer(v.value, 20) || v.kind === 'A' && keys(v, ['kind']))

export function validCondition(v: unknown, inEach = false): v is Condition {
  const atom = (v: unknown): boolean => {
    if (!record(v) || v.kind !== 'atom' || !keys(v, ['kind', 'atom']) || !record(v.atom)) return false
    const a = v.atom
    switch (a.kind) {
    case 'beltEmpty': case 'beltHasBoxes': case 'heldEmpty': case 'heldHasBox': return keys(a, ['kind'])
    case 'matchesTarget': return inEach && keys(a, ['kind'])
    case 'pileEmpty': case 'pileHasBoxes': case 'pileFull': return keys(a, ['kind', 'pile']) && pile(a.pile)
    case 'heldShape': return keys(a, ['kind', 'shape']) && shape(a.shape)
    case 'pileShape': return keys(a, ['kind', 'pile', 'shape']) && pile(a.pile) && shape(a.shape)
    default: return false
    }
  }
  const operand = (v: unknown) => atom(v) || record(v) && v.kind === 'not' && keys(v, ['kind', 'operand']) && atom(v.operand)
  return operand(v) || record(v) && (v.kind === 'and' || v.kind === 'or') && keys(v, ['kind', 'left', 'right']) && operand(v.left) && operand(v.right)
}

/** Structural/context checks only. No learner progression or unlock policy here. */
export function validDocument(v: unknown): v is ProgramDocument {
  if (!record(v) || !keys(v, ['main', 'functions']) || !Array.isArray(v.main) || !Array.isArray(v.functions) || v.functions.length > 2) return false
  const functions = new Map<string, boolean>()
  for (const f of v.functions) {
    if (!record(f) || !keys(f, ['id', 'icon', 'param', 'body']) || typeof f.id !== 'string' || !f.id || functions.has(f.id) || !['star', 'moon'].includes(String(f.icon)) || f.param !== undefined && f.param !== true || !Array.isArray(f.body)) return false
    functions.set(f.id, f.param === true)
  }
  const call = (v: unknown): boolean => record(v) && keys(v, ['fn', 'arg']) && typeof v.fn === 'string' && functions.has(v.fn) && (functions.get(v.fn) ? argument(v.arg) : v.arg === undefined)
  function value(v: unknown, param: boolean, each: boolean, returning = false): boolean {
    if (!record(v)) return false
    if (argument(v)) return true
    if (v.kind === 'pileCount') return keys(v, ['kind', 'pile']) && pile(v.pile)
    if (!keys(v, ['kind'])) return false
    if (v.kind === 'param') return param
    if (v.kind === 'beltCount') return true
    return !returning && (v.kind === 'listLength' || v.kind === 'listAtA' || v.kind === 'current' && each)
  }
  const ids = new Set<string>(), signals = new Set<unknown>()
  let count = 0
  function list(v: unknown, inFunction: boolean, param: boolean, each: boolean, top: boolean): boolean {
    if (!Array.isArray(v)) return false
    for (const b of v) {
      if (++count > MAX_FACTORY_BLOCKS || !record(b) || typeof b.id !== 'string' || !b.id || ids.has(b.id)) return false
      ids.add(b.id)
      const allowed = ['id', 'type']
      switch (b.type) {
      case 'takeBelt': break
      case 'takePile': case 'putPile': allowed.push('pile'); if (!pile(b.pile)) return false; break
      case 'breakForEach': if (!each || inFunction) return false; break
      case 'set': allowed.push('variable', 'value'); if (b.variable !== 'A' || !integer(b.value, 20)) return false; break
      case 'change': allowed.push('variable', 'by'); if (b.variable !== 'A' || b.by !== 1 && b.by !== -1) return false; break
      case 'call': {
        allowed.push('fn', 'arg')
        const { id: _id, type: _type, ...c } = b
        if (inFunction || !call(c)) return false
        break
      }
      case 'return': allowed.push('value'); if (!inFunction || !value(b.value, param, false, true)) return false; break
      case 'on':
        allowed.push('signal', 'body')
        if (!top || inFunction || !signal(b.signal) || signals.has(b.signal)) return false
        signals.add(b.signal)
        if (!list(b.body, false, false, false, false)) return false
        break
      case 'forEach':
        allowed.push('direction', 'body')
        if (inFunction || b.direction !== undefined && b.direction !== 'front' && b.direction !== 'back' || !list(b.body, false, false, true, false)) return false
        break
      case 'repeat': {
        const sources = ['count', 'countVariable', 'countParam', 'countCall', 'countSource']
        allowed.push('body', ...sources)
        if (sources.filter(k => k in b).length !== 1) return false
        if ('count' in b && !integer(b.count, 10, 2) || 'countVariable' in b && b.countVariable !== 'A' || 'countParam' in b && (!param || b.countParam !== true) || 'countCall' in b && (inFunction || !call(b.countCall)) || 'countSource' in b && (!record(b.countSource) || ['number', 'A', 'param'].includes(String(b.countSource.kind)) || !value(b.countSource, param, each))) return false
        if (!list(b.body, inFunction, param, each, false)) return false
        break
      }
      case 'if': case 'while':
        allowed.push('condition', 'body', ...(b.type === 'if' ? ['else'] : []))
        if (!validCondition(b.condition, each) || !list(b.body, inFunction, param, each, false) || 'else' in b && !list(b.else, inFunction, param, each, false)) return false
        break
      default: return false
      }
      if (!keys(b, allowed)) return false
    }
    return true
  }
  return list(v.main, false, false, false, true) && v.functions.every(f => list(f.body, true, f.param === true, false, false))
}
export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + 1 + ('body' in b ? countBlocks(b.body) : 0) + (b.type === 'if' ? countBlocks(b.else ?? []) : 0), 0)
}
export function countDocument(doc: ProgramDocument): number {
  return countBlocks(doc.main) + doc.functions.reduce((n, f) => n + countBlocks(f.body), 0)
}
export function validInput(v: unknown): v is RunInput {
  if (!record(v) || !keys(v, ['start', 'program', 'orders', 'target', 'signals']) || !validDocument(v.program) || !record(v.start) || !keys(v.start, ['belt', 'piles']) || !Array.isArray(v.start.belt) || v.start.belt.length > 12 || !record(v.start.piles) || !keys(v.start.piles, ['leaf', 'moon', 'sun'])) return false
  const ids = new Set<string>()
  let total = 0
  for (const boxes of [v.start.belt, v.start.piles.leaf, v.start.piles.moon, v.start.piles.sun]) {
    if (!Array.isArray(boxes) || boxes !== v.start.belt && boxes.length > 6) return false
    for (const b of boxes) {
      if (++total > 18 || !record(b) || !keys(b, ['id', 'shape']) || typeof b.id !== 'string' || !b.id || ids.has(b.id) || !shape(b.shape)) return false
      ids.add(b.id)
    }
  }
  return Array.isArray(v.orders) && v.orders.length <= 5 && v.orders.every(n => integer(n, 10)) && integer(v.target, 10) && Array.isArray(v.signals) && v.signals.length <= 20 && v.signals.every(signal)
}
