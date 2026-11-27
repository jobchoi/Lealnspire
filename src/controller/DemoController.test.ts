import { afterEach, expect, it, vi } from 'vitest'
import { DemoController, canOfferDemo, demoEntries, demoScene, demoForStage } from './DemoController'
import { GameController } from './GameController'
import { ProgressRepository, demoIds, settingsKey, progressKey, progressV2Key } from '../model/ProgressRepository'
import { stages, allStages } from '../model/stages'
const memory = () => {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
afterEach(() => vi.useRealTimers())
it('migrates language, repairs whole damaged lists, merges language and preserves settings on progress deletion', () => {
  for (const seenDemos of [undefined, null, 'add-run', ['add-run', 3], ['unknown']]) {
    const storage = memory()
    storage.setItem(settingsKey, JSON.stringify({ version: 2, lang: 'en', seenDemos }))
    const repository = new ProgressRepository(storage)
    expect(repository.getLanguage()).toBe('en')
    expect(repository.getSeenDemos()).toEqual([])
  }
  const storage = memory()
  storage.setItem(settingsKey, JSON.stringify({ version: 1, lang: 'en' }))
  const repository = new ProgressRepository(storage)
  expect(JSON.parse(storage.getItem(settingsKey)!)).toEqual({ version: 2, lang: 'en', seenDemos: [] })
  repository.markDemoSeen('add-run'); repository.markDemoSeen('add-run'); repository.saveLanguage('ko')
  const restored = new ProgressRepository(storage)
  expect(restored.getSeenDemos()).toEqual(['add-run'])
  restored.clear()
  expect(new ProgressRepository(storage).getSeenDemos()).toEqual(['add-run'])
  restored.resetDemos()
  expect(new ProgressRepository(storage).getLanguage()).toBe('ko')
  expect(new ProgressRepository(storage).getSeenDemos()).toEqual([])
})
it('keeps blocked settings in session memory', () => {
  const repository = new ProgressRepository({ getItem() { throw Error() }, setItem() { throw Error() } })
  repository.markDemoSeen('add-run'); repository.saveLanguage('en')
  expect(repository.getSeenDemos()).toEqual(['add-run'])
  repository.resetDemos(); expect(repository.getSeenDemos()).toEqual([])
  expect(repository.getLanguage()).toBe('en')
})
it('plays four cuts once without changing the real game, progress keys, stars or unlocks', () => {
  vi.useFakeTimers()
  const storage = memory(), repository = new ProgressRepository(storage)
  const game = new GameController(stages[0], repository)
  const state = structuredClone(game.getSnapshot()), progress = repository.getProgress()
  const raw = [storage.getItem(progressKey), storage.getItem(progressV2Key)]
  const complete = vi.fn(() => repository.markDemoSeen('add-run'))
  const demo = new DemoController(complete)
  demo.restart()
  expect(demo.program).toEqual([])
  vi.advanceTimersByTime(2400); expect(demo.program).toHaveLength(1)
  vi.advanceTimersByTime(2400); expect(demo.getSnapshot().cut).toBe(2)
  vi.advanceTimersByTime(2400); expect(demo.frame.pos).toEqual({ x: 1, y: 0 })
  vi.advanceTimersByTime(24000); expect(complete).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
  expect(game.getSnapshot()).toEqual(state)
  expect(repository.getProgress()).toEqual(progress)
  expect([storage.getItem(progressKey), storage.getItem(progressV2Key)]).toEqual(raw)
})
it('cleans up close/navigation timers, pauses, replays and supports manual cuts', () => {
  vi.useFakeTimers()
  const complete = vi.fn(), demo = new DemoController(complete)
  demo.restart(); demo.pause(); vi.advanceTimersByTime(12000)
  expect(demo.getSnapshot().cut).toBe(0)
  demo.pause(); expect(vi.getTimerCount()).toBe(1)
  demo.restart(); expect(vi.getTimerCount()).toBe(1)
  demo.dispose(); expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(12000); expect(complete).not.toHaveBeenCalled()
  demo.restart(true); expect(vi.getTimerCount()).toBe(0)
  demo.next(); demo.back(); expect(demo.getSnapshot().cut).toBe(0)
  demo.next(); demo.next(); demo.next(); expect(complete).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})
it('offers demos after edits and revisits, outside playback and results', () => {
  expect(canOfferDemo('1', false, false, false)).toBe(true)
  expect(canOfferDemo('1', true, false, false)).toBe(true)
  expect(canOfferDemo('1', true, false, false, true), 'completed stage hides the demo button').toBe(false)
  for (const args of [['3', false, false, false], ['1', false, true, false], ['1', false, false, true]] as const) expect(canOfferDemo(args[0], args[1], args[2], args[3])).toBe(false)
})

// Ignore generated IDs so a copied solution cannot pass by merely renaming its blocks.
const semantic = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(semantic)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').map(([key, val]) => [key, key === 'fn' ? 'function-reference' : semantic(val)]))
  return value
}
it('keeps every cut separate from entry maps and solutions, with exactly the designated entry points', () => {
  expect(demoEntries).toHaveLength(14)
  expect(demoEntries.map(entry => entry[0])).toEqual(demoIds)
  expect(demoForStage('u12-1')).toBeUndefined()
  for (const [id, stageId] of demoEntries) {
    const entry = allStages.find(stage => stage.id === stageId)!
    expect(entry, stageId).toBeDefined()
    expect(canOfferDemo(stageId, false, false, false)).toBe(true)
    expect(canOfferDemo(stageId, true, false, false)).toBe(true)
    for (const flags of [[false, true, false], [false, false, true]]) expect(canOfferDemo(stageId, flags[0], flags[1], flags[2])).toBe(false)
    for (let cut = 0; cut < 4; cut++) {
      const scene = demoScene(id, cut)
      for (const grid of entry.variants ?? [entry.grid]) expect(scene.stage.grid, `${id}/${cut} map`).not.toEqual(grid)
      expect(semantic(scene.doc), `${id}/${cut} solution`).not.toEqual(semantic({ main: entry.solution, functions: entry.solutionFunctions ?? [] }))
      expect(scene.frame).toBeDefined()
      expect(scene.stage.id).not.toBe(entry.id)
    }
  }
})
it('keeps real code, functions, selection, variants, stars and raw progress unchanged for every demo', () => {
  vi.useFakeTimers()
  for (const [id, stageId] of demoEntries) {
    const storage = memory(), repository = new ProgressRepository(storage)
    const game = new GameController(allStages.find(stage => stage.id === stageId)!, repository)
    game.editor.add('repeat')
    const block = game.editor.program.at(-1)!
    game.editor.select(block.id); game.editor.toggleTarget()
    const editorBefore = structuredClone(game.editor.getSnapshot())
    const before = structuredClone(game.getSnapshot()), progress = repository.getProgress()
    const raw = [storage.getItem(progressKey), storage.getItem(progressV2Key)]
    const complete = vi.fn(() => repository.markDemoSeen(id))
    const demo = new DemoController(complete, undefined, id)
    demo.restart()
    for (let cut = 0; cut < 4; cut++) { expect(demo.getSnapshot().cut).toBe(cut); expect(demo.scene.frame).toBeDefined(); vi.advanceTimersByTime(2400) }
    expect(complete).toHaveBeenCalledTimes(1)
    expect(game.getSnapshot()).toEqual(before)
    expect(game.editor.getSnapshot()).toEqual(editorBefore)
    demo.dispose()
    expect(game.editor.getSnapshot()).toEqual(editorBefore)
    expect(repository.getProgress()).toEqual(progress)
    expect([storage.getItem(progressKey), storage.getItem(progressV2Key)]).toEqual(raw)
    expect(new ProgressRepository(storage).getSeenDemos()).toEqual([id])
    demo.dispose(); game.dispose()
  }
  expect(vi.getTimerCount()).toBe(0)
})
it('shows the concept through interpreter traces, not just captions', () => {
  expect(demoScene('rotation', 2).frame.dir).toBe('E')
  expect(demoScene('rotation', 2).frame.pos).toEqual({ x: 0, y: 0 })
  expect(demoScene('rotation', 3).frame.pos).toEqual({ x: 1, y: 0 })
  expect(demoScene('repeat', 3).frame.loops?.[0]).toMatchObject({ iteration: 2, count: 2 })
  expect(demoScene('condition', 2).frame.check?.result).toBe(true)
  expect(demoScene('condition', 3).frame.check?.result).toBe(false)
  expect(demoScene('else', 2).doc.main[0]).toMatchObject({ type: 'if', else: [{ type: 'turnLeft' }] })
  expect(demoScene('else', 3).frame.dir).toBe('N')
  expect(demoScene('while', 3).frame.check?.result).toBe(false)
  expect(demoScene('logic', 2).frame.check?.result).toBe(true)
  expect(demoScene('parameter', 1).doc.functions[0]).toMatchObject({ param: true, body: [{ type: 'repeat', countParam: true }] })
  expect(demoScene('list', 1).doc.main[0]).toMatchObject({ type: 'forEach', body: [{ type: 'repeat', countSource: 'current' }] })
  expect(demoScene('parameter', 3).frame.variables?.A).toBe(4)
  expect(demoScene('parameter', 3).frame.call?.arg).toBe(2)
  expect(demoScene('return', 3).frame.returned?.value).toBe(2)
  expect(demoScene('return', 3).frame.returned?.skippedIds.length).toBe(1)
  expect(demoScene('event', 2).frame.events?.phase).toBe('arrival')
  expect(demoScene('event', 3).frame.events?.phase).toBe('end')
  expect(demoScene('list', 2).frame.list?.current).toMatchObject({ index: 0, value: 2 })
  expect(demoScene('list', 3).frame.list?.current).toMatchObject({ index: 1, value: 3 })
  expect(demoScene('search', 2).frame.search?.stopped?.remaining).toEqual([1, 0])
  expect(demoScene('search', 3).frame.pos).toEqual({ x: 1, y: 0 })
})
it('list and search demos count indexes from 0 like the interpreter (cue matches the frame index)', () => {
  for (const cut of [2, 3]) {
    const scene = demoScene('list', cut)
    const index = scene.frame.list?.current?.index
    expect(index).toBe(cut - 2)
    expect(scene.cue).toContain(`#${index}`)
  }
  const search = demoScene('search', 2)
  expect(search.frame.search?.foundIndex).toBe(2)
  expect(search.cue).toContain(`#${search.frame.search?.foundIndex} ✓`)
})

it('manual next and back stop automatic playback, including boundary clicks', () => {
  vi.useFakeTimers()
  const demo = new DemoController(() => {})
  demo.restart(); demo.next()
  expect(demo.getSnapshot()).toEqual({ cut: 1, paused: true })
  expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(12000)
  expect(demo.getSnapshot().cut).toBe(1)
  demo.pause(); demo.back()
  expect(demo.getSnapshot()).toEqual({ cut: 0, paused: true })
  expect(vi.getTimerCount()).toBe(0)
  demo.pause(); demo.back()
  expect(demo.getSnapshot()).toEqual({ cut: 0, paused: true })
  expect(vi.getTimerCount()).toBe(0)
  demo.next(); demo.next(); demo.next(); demo.next()
  expect(demo.getSnapshot()).toEqual({ cut: 3, paused: true })
  demo.dispose()
})
