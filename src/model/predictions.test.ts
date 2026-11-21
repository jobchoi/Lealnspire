import { expect, it } from 'vitest'
import { predictions, predictionEnd, samePrediction } from './predictions'
it('has three distinct engine-derived candidates and exactly one matching outcome per challenge', () => {
  expect(predictions.map(p => p.stageId)).toEqual(['2', '5', '7', 'b1', 'b2'])
  for (const challenge of predictions) {
    expect(challenge.choices).toHaveLength(3)
    expect(new Set(challenge.choices.map(c => JSON.stringify(c))).size).toBe(3)
    expect(challenge.choices.filter(c => samePrediction(c, predictionEnd(challenge.stageId, challenge.program)))).toHaveLength(1)
  }
})
