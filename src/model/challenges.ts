import { FunctionProgram } from './program'
import type { Block, ProgramDocument, RunResult } from './types'

export type Challenge = { stageId: string; id: string; kind: 'shorter' | 'bothTurns' | 'bothDirections'; ruleVersion: number; params: { maxBlocks?: number } }
export type ChallengeState = { ruleVersion: number; achievedAt: string | null; partial?: string[] }
export const challenges: Challenge[] = [
  { stageId: '2', id: 'both-turns', kind: 'bothTurns', ruleVersion: 1, params: {} },
  { stageId: 'u2-1', id: 'shorter', kind: 'shorter', ruleVersion: 1, params: { maxBlocks: 4 } },
  { stageId: 'u11-1', id: 'both-directions', kind: 'bothDirections', ruleVersion: 1, params: {} },
]
export const stageChallenges = (stageId: string) => challenges.filter(c => c.stageId === stageId)
export const earnedChallenges = (stageId: string, states?: Record<string, ChallengeState>) => stageChallenges(stageId).filter(c => states?.[c.id]?.ruleVersion === c.ruleVersion && !!states[c.id].achievedAt)
export function evaluateChallenge(challenge: Challenge, doc: ProgramDocument, runs: RunResult[], previous: ChallengeState | undefined, now: string): ChallengeState | undefined {
  if (!runs.length || runs.some(run => run.result !== 'success')) return previous
  if (previous?.ruleVersion === challenge.ruleVersion && previous.achievedAt) return previous
  const blocks = new Map<string, Block>()
  const visit = (body: Block[]) => body.forEach(block => { blocks.set(block.id, block); if ('body' in block) visit(block.body); if (block.type === 'if') visit(block.else ?? []) })
  visit(doc.main); doc.functions.forEach(fn => visit(fn.body))
  const partial = new Set(previous?.ruleVersion === challenge.ruleVersion ? previous.partial ?? [] : [])
  if (challenge.kind === 'shorter') {
    if (new FunctionProgram(doc).count() > (challenge.params.maxBlocks ?? -1)) return previous
    return { ruleVersion: challenge.ruleVersion, achievedAt: now }
  }
  const required = challenge.kind === 'bothTurns' ? ['turnLeft', 'turnRight'] : ['front', 'back']
  const evidence = runs.map(run => {
    const seen = new Set<string>()
    let comparisons = 0
    for (const frame of run.frames) {
      const block = frame.activeBlockId ? blocks.get(frame.activeBlockId) : undefined
      if (challenge.kind === 'bothTurns' && frame.event === 'turn' && (block?.type === 'turnLeft' || block?.type === 'turnRight')) seen.add(block.type)
      if (challenge.kind === 'bothDirections' && frame.search && frame.search.count > comparisons) {
        const each = frame.list?.current ? blocks.get(frame.list.current.blockId) : undefined
        if (each?.type === 'forEach') seen.add(each.direction ?? 'front')
        comparisons = frame.search.count
      }
    }
    return seen
  })
  for (const direction of required) if (evidence.every(seen => seen.size === 1 && seen.has(direction))) partial.add(direction)
  if (!partial.size) return previous
  return { ruleVersion: challenge.ruleVersion, achievedAt: required.every(direction => partial.has(direction)) ? now : null, partial: [...partial] }
}
