import type { Progress } from '../ProgressRepository'
import { stages, unit2Stages, unit3Stages, unit4Stages, unit5Stages, unit6Stages, unit7Stages, unit8Stages, unit9Stages, unit10Stages, unit11Stages, unit12Stages } from '../stages'
import { validInput } from './program'
import { run } from './interpreter'
import type { Block, Condition, ProgramDocument, RunInput } from './types'

/** Provisional factory policy. Later units never imply completion of earlier units. */
export const factoryUnits = [stages, unit2Stages, unit3Stages, unit4Stages, unit5Stages, unit6Stages, unit7Stages, unit8Stages, unit9Stages, unit10Stages, unit11Stages, unit12Stages]
export type FactoryProgress = Pick<Progress, 'stages'>
export function completedFactoryUnits(progress: FactoryProgress): number[] {
  return factoryUnits.flatMap((entries, i) => entries.every(s => progress.stages[s.id]?.completed === true) ? [i + 1] : [])
}
export type FactoryAccess = { allowed: boolean; requiredUnits: number[] }

/** One policy for palette candidates, edits, loaded documents and execution. */
export function factoryAccess(program: ProgramDocument, progress: FactoryProgress, inputs?: Pick<RunInput, 'orders' | 'signals' | 'target'>): FactoryAccess {
  const required = new Set<number>()
  if (inputs?.orders.length) required.add(10)
  if (inputs?.signals.length) required.add(9)
  if (inputs?.target) required.add(11)
  const value = (v: { kind: string } | undefined) => {
    if (!v) return
    if (v.kind === 'A' || v.kind === 'beltCount' || v.kind === 'pileCount') required.add(5)
    if (v.kind === 'param') required.add(7)
    if (['current', 'listAtA', 'listLength'].includes(v.kind)) required.add(10)
    if (v.kind === 'listAtA') required.add(5)
  }
  const condition = (c: Condition) => {
    if (c.kind === 'atom') required.add(c.atom.kind === 'matchesTarget' ? 11 : 2)
    else {
      required.add(6)
      if (c.kind === 'not') condition(c.operand)
      else { condition(c.left); condition(c.right) }
    }
  }
  const blocks = (list: Block[]) => {
    for (const b of list) {
      // Code production starts after unit 1, including independently unlocked syntax.
      required.add(1)
      switch (b.type) {
      case 'if': required.add(2); condition(b.condition); if (b.else) blocks(b.else); break
      case 'while': required.add(3); condition(b.condition); break
      case 'call': required.add(4); if (b.arg) { required.add(7); value(b.arg) }; break
      case 'set': case 'change': required.add(5); break
      case 'return': required.add(8); value(b.value); break
      case 'on': required.add(9); break
      case 'forEach': required.add(10); if (b.direction === 'back') required.add(11); break
      case 'breakForEach': required.add(11); break
      case 'repeat':
        if (b.countVariable) required.add(5)
        if (b.countParam) required.add(7)
        if (b.countCall) { required.add(4); required.add(8); if (b.countCall.arg) { required.add(7); value(b.countCall.arg) } }
        value(b.countSource)
        break
      }
      if ('body' in b) blocks(b.body)
    }
  }
  for (const f of program.functions) { required.add(1); required.add(4); if (f.param) required.add(7); blocks(f.body) }
  blocks(program.main)
  const completed = completedFactoryUnits(progress)
  const requiredUnits = [...required].filter(u => !completed.includes(u)).sort((a, b) => a - b)
  return { allowed: requiredUnits.length === 0, requiredUnits }
}
export const FACTORY_BLOCK_TYPES: Block['type'][] = ['takeBelt', 'takePile', 'putPile', 'repeat', 'if', 'while', 'call', 'set', 'change', 'return', 'on', 'forEach', 'breakForEach']
/** Candidates are full documents so input fields, bodies and function definitions share the policy. */
export function factoryPalette<T extends { program: ProgramDocument }>(candidates: readonly T[], progress: FactoryProgress): T[] {
  return candidates.filter(c => factoryAccess(c.program, progress).allowed)
}
export function readFactoryDocument(doc: unknown, progress: FactoryProgress) {
  // Structural validation is separate; locked but valid code is returned intact.
  if (!validInput({ start: { belt: [], piles: { leaf: [], moon: [], sun: [] } }, program: doc, orders: [], target: 0, signals: [] })) return undefined
  const program = structuredClone(doc as ProgramDocument)
  return { program, ...factoryAccess(program, progress) }
}
export function runFactory(input: RunInput, progress: FactoryProgress) {
  if (!validInput(input)) throw new Error('Invalid factory input')
  const access = factoryAccess(input.program, progress, input)
  if (!access.allowed) return { allowed: false as const, requiredUnits: access.requiredUnits }
  return { allowed: true as const, requiredUnits: [], result: run(input) }
}
