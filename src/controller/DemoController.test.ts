import { afterEach, expect, it, vi } from 'vitest'
import { DemoController, canOfferDemo } from './DemoController'
import { GameController } from './GameController'
import { ProgressRepository, settingsKey, progressKey, progressV2Key } from '../model/ProgressRepository'
import { stages } from '../model/stages'
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
it('offers only before the first edit on stage 1, outside playback and results', () => {
  expect(canOfferDemo('1', false, false, false)).toBe(true)
  for (const args of [['2', false, false, false], ['1', true, false, false], ['1', false, true, false], ['1', false, false, true]] as const) expect(canOfferDemo(args[0], args[1], args[2], args[3])).toBe(false)
})
