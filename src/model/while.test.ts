import { describe, expect, it } from 'vitest'
import { run, runAll, failurePoint } from './interpreter'
import { unit3Stages, unit2Stages, allStages, stages } from './stages'
import { ProgressRepository, progressV3Key, isUnlocked } from './ProgressRepository'
import { blockAt, cloneBlock, createBlock, findBlockPath } from './editor'
import { countBlocks, Program as ProgramModel } from './program'
import type { Block, Stage } from './types'

const stage: Stage = { ...unit3Stages[0], grid: ['S..#', '##G#'], variants: undefined }
const forward: Block = { id: 'f', type: 'forward' }
const loop = (body: Block[] = [forward]): Block => ({ id: 'w', type: 'while', condition: 'clearAhead', body })

describe('while checks before every iteration', () => {
  it('skips the body on the first false check', () => {
    const result = run({ ...stage, startDir: 'N' }, [loop()])
    expect(result.frames.slice(1).map(frame => frame.event)).toEqual(['check'])
    expect(result.frames[1].check?.result).toBe(false)
    expect(result.result).toBe('unfinished')
  })
  it('checks again after each body, reports iterations without a total, then continues', () => {
    const result = run(stage, [loop(), { id: 'r', type: 'turnRight' }, { ...forward, id: 'finish' }])
    expect(result.result).toBe('success')
    expect(result.frames.filter(frame => frame.check).map(frame => frame.check?.result)).toEqual([true, true, false])
    expect(result.frames.filter(frame => frame.event === 'move').map(frame => frame.loops)).toEqual([
      [{ blockId: 'w', iteration: 1 }], [{ blockId: 'w', iteration: 2 }],
    ])
    expect(result.frames.at(-1)?.loops).toBeUndefined()
  })
  for (const body of [[], [{ id: 'l', type: 'turnLeft' }, { id: 'r', type: 'turnRight' }] as Block[]]) {
    it('bounds a condition that never changes and identifies its while', () => {
      const result = run(stage, [loop(body)])
      expect(result.result).toBe('stepLimit')
      expect(result.frames).toHaveLength(1001)
      expect(result.whileLimitBlockId).toBe('w')
      expect(failurePoint(result)?.blockId).toBe('w')
    })
  }
  it('supports while inside repeat and if inside while', () => {
    expect(runAll(unit3Stages[1], unit3Stages[1].solution).result).toBe('success')
    const result = run(stage, [loop([{ id: 'i', type: 'if', condition: 'blockedAhead', body: [], else: [forward] }])])
    expect(result.frames.filter(frame => frame.check?.blockId === 'w').map(frame => frame.check?.result)).toEqual([true, true, false])
    expect(result.frames.filter(frame => frame.check?.blockId === 'i')).toHaveLength(2)
  })
  it('attributes nested nontermination to the inner while', () => {
    const result = run(stage, [loop([{ ...loop([]), id: 'inner' }])])
    expect(result.whileLimitBlockId).toBe('inner')
  })
  it('starts u3-3 with a nonterminating program on both maps', () => {
    const stage = unit3Stages[2]
    const result = runAll(stage, stage.initialProgram!)
    expect(result.results.map(run => run.result)).toEqual(['stepLimit', 'stepLimit'])
    expect(failurePoint(result)).toMatchObject({ blockId: 'u33-initial', variant: 0 })
  })
})

it('creates, counts, edits, finds and clones while subtrees', () => {
  const created = createBlock([], 'while')
  expect(created).toEqual({ id: 'block-1', type: 'while', condition: 'clearAhead', body: [] })
  const tree = new ProgramModel([created]).add(forward, [0]).toBlocks()
  expect(countBlocks(tree)).toBe(2)
  expect(findBlockPath(tree, 'f')).toEqual([0, 0])
  expect(blockAt(tree, [0, 0])).toEqual(forward)
  const copied = cloneBlock(tree, tree[0])
  expect(countBlocks([copied])).toBe(2)
  expect(copied.id).not.toBe(created.id)
  expect(new ProgramModel(tree).remove([0, 0]).count()).toBe(1)
})

it('roundtrips while in v2 and rejects conditions outside its allowlist', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const repository = new ProgressRepository(storage)
  repository.saveProgram('u3-1', [loop()])
  expect(new ProgressRepository(storage).getProgram(unit3Stages[0])).toEqual([loop()])
  const doc = JSON.parse(data.get(progressV3Key)!)
  doc.stages['u3-1'].lastProgram.main[0].condition = 'blockedAhead'
  data.set(progressV3Key, JSON.stringify(doc))
  expect(new ProgressRepository(storage).getProgram(unit3Stages[0])).toEqual([])
})

it('opens unit 3 after unit 2, then unlocks sequentially without bonus completion', () => {
  const repository = new ProgressRepository()
  const first = allStages.indexOf(unit3Stages[0])
  for (const stage of [...stages, ...unit2Stages.slice(0, -1)]) repository.completeStage(stage.id, 3, [])
  expect(isUnlocked(repository.getProgress(), first)).toBe(false)
  repository.completeStage('u2-6', 3, [])
  for (const [offset, stage] of unit3Stages.entries()) {
    expect(isUnlocked(repository.getProgress(), first + offset)).toBe(true)
    if (offset < 2) expect(isUnlocked(repository.getProgress(), first + offset + 1)).toBe(false)
    repository.completeStage(stage.id, 3, stage.solution)
  }
})
