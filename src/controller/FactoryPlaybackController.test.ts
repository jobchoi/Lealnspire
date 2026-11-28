import { afterEach, expect, it, vi } from 'vitest'
import { FactoryEditorController } from './FactoryEditorController'
import { FactoryPlaybackController } from './FactoryPlaybackController'
import { factoryUnits } from '../model/factory/unlocks'
const progress = { stages: Object.fromEntries(factoryUnits.flat().map(s => [s.id, { completed: true, bestStars: 0, lastProgram: [] }])) }
function setup() {
  const e = new FactoryEditorController(undefined, progress)
  e.addBox('belt', '◆'); e.add({ id: 'take', type: 'takeBelt' }); e.add({ id: 'put', type: 'putPile', pile: 'leaf' })
  return new FactoryPlaybackController(e)
}
afterEach(() => vi.useRealTimers())
it('steps, locks edits, stops without resuming, and reruns from the original setup', () => {
  const p = setup(), e = p.editor
  p.step()
  expect(p.getSnapshot().frame?.state.held?.shape).toBe('◆')
  expect(e.addBox('belt', '○')).toBe(false)
  p.stop()
  expect(p.getSnapshot().frame?.state.held?.shape).toBe('◆')
  expect(e.getSnapshot().locked).toBe(false)
  p.step()
  expect(p.getSnapshot().frame?.state.held?.shape).toBe('◆')
  p.step(); p.step()
  expect(p.getSnapshot().finished).toBe(true)
  expect(p.getSnapshot().frame?.state.piles.leaf).toHaveLength(1)
  expect(e.getSnapshot().input.start.belt).toHaveLength(1)
  expect(e.addBox('belt', '○')).toBe(true)
  expect(p.getSnapshot().frame).toBeNull()
  p.reset(); expect(p.getSnapshot().started).toBe(false)
  p.dispose()
})
it('auto playback respects speed, ends, cancels timers on reset and disposal', () => {
  vi.useFakeTimers()
  const p = setup()
  p.play(); p.play()
  vi.advanceTimersByTime(399)
  expect(p.getSnapshot().frame?.activeBlockId).toBeNull()
  p.setSpeed('fast'); vi.advanceTimersByTime(150)
  expect(p.getSnapshot().frame?.activeBlockId).toBe('take')
  vi.runAllTimers()
  expect(p.getSnapshot()).toMatchObject({ finished: true, running: false })
  expect(p.editor.getSnapshot().locked).toBe(false)
  p.play(); p.reset(); vi.runAllTimers()
  expect(p.getSnapshot().frame).toBeNull()
  p.play(); p.dispose(); expect(vi.getTimerCount()).toBe(0)
})
it('shows the error at its source and leaves the setup unchanged', () => {
  const e = new FactoryEditorController(undefined, progress), p = new FactoryPlaybackController(e)
  e.add({ id: 'empty', type: 'takeBelt' }); p.step()
  expect(p.getSnapshot().frame?.error).toMatchObject({ code: 'beltEmpty', blockId: 'empty' })
  expect(p.getSnapshot().finished).toBe(true)
  expect(e.getSnapshot().locked).toBe(false)
  p.dispose()
})

it('reconnects after an effect cleanup so StrictMode keeps edit/reset synchronization', () => {
  const p = setup()
  p.dispose(); p.activate()
  p.step(); p.stop()
  p.editor.addBox('belt', '○')
  expect(p.getSnapshot().frame).toBeNull()
  p.dispose()
})
