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
