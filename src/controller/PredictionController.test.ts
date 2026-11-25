import { expect, it, vi } from 'vitest'
import { PredictionController } from './PredictionController'
import { AppController } from './AppController'
import { predictions, predictionEnd, samePrediction } from '../model/predictions'
it('locks entry until completion and does not write challenge runs into progress', () => {
  vi.useFakeTimers()
  try {
    const app = new AppController()
    app.openPrediction(predictions[0].id)
    expect(app.getSnapshot().page).toBe('home')
    app.repository.completeStage('2', 3, [])
    const before = app.progress
    app.openPrediction(predictions[0].id)
    expect(app.getSnapshot().page).toBe('prediction')
    const controller = app.prediction!
    const correct = predictions[0].choices.findIndex(c => samePrediction(c, predictionEnd('2', predictions[0].program)))
    controller.choose((correct + 1) % 3)
    controller.choose(correct)
    vi.runAllTimers()
    expect(controller.correct).toBe(false)
    expect(controller.game.finished).toBe(true)
    controller.retry()
    expect(controller.game.frame).toBeUndefined()
    controller.choose(correct)
    vi.runAllTimers()
    expect(controller.correct).toBe(true)
    expect(app.progress).toEqual(before)
    controller.retry()
    controller.choose(correct)
    app.list()
    vi.runAllTimers()
    expect(controller.game.finished).toBe(false)
  } finally { vi.useRealTimers() }
})
it('rejects invalid candidates', () => {
  const controller = new PredictionController(predictions[0])
  controller.choose(-1)
  controller.choose(.5)
  expect(controller.getSnapshot().selected).toBeNull()
})

it('runs the conditional challenge on its single map, reveals the first check after playback and preserves progress', () => {
  vi.useFakeTimers()
  try {
    const app = new AppController()
    app.openPrediction('p-u2-1')
    expect(app.getSnapshot().page).toBe('home')
    app.repository.completeStage('u2-1', 3, [])
    const before = app.progress
    app.openPrediction('p-u2-1')
    const controller = app.prediction!
    expect(controller.game.stage.grid).toEqual(['S.#', '#.G'])
    expect(controller.game.stage.variants).toBeUndefined()
    expect(controller.firstCheck).toBeUndefined()
    controller.choose(0)
    expect(controller.firstCheck).toBeUndefined()
    vi.runAllTimers()
    expect(controller.correct).toBe(true)
    expect(controller.game.frame).toMatchObject({ pos: { x: 1, y: 0 }, dir: 'E', event: 'bump' })
    expect(controller.firstCheck).toBe(false)
    expect(app.progress).toEqual(before)
    controller.retry()
    expect(controller.firstCheck).toBeUndefined()
    controller.dispose()
  } finally { vi.useRealTimers() }
})
