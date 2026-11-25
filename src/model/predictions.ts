import { Interpreter } from './interpreter'
import { allStages as stages } from './stages'
import type { Dir, Position, Program, Block, Stage } from './types'
export type PredictionChoice = { pos: Position; dir: Dir }
export type Prediction = { id: string; stageId: string; program: Program; stage?: Stage; choices: PredictionChoice[] }
const code = (...types: Array<'forward' | 'turnRight' | 'turnLeft'>): Program => types.map((type, i) => ({ id: `prediction-${i}`, type }))
const loop = (count: number, body: Program): Block => ({ id: 'prediction-loop', type: 'repeat', count, body })
export function predictionEnd(stageId: string, program: Program, override?: Stage): PredictionChoice {
  const stage = override ?? stages.find(stage => stage.id === stageId)!
  const frames = Interpreter.run(stage, program).frames
  const { pos, dir } = frames[frames.length - 1]
  return { pos: { ...pos }, dir }
}
export const samePrediction = (a: PredictionChoice, b: PredictionChoice) => a.pos.x === b.pos.x && a.pos.y === b.pos.y && a.dir === b.dir
// 잠정 도전: 오답도 동일한 엔진에서 변형 코드를 실행해 만든다.
const definitions = [
  { stageId: '2', program: code('forward', 'turnRight', 'forward'), variants: [code('forward', 'turnLeft', 'forward'), code('forward', 'forward')] },
  { stageId: '5', program: [loop(3, code('forward'))], variants: [[loop(6, code('forward'))], code('forward')] },
  { stageId: '7', program: [loop(2, code('forward', 'forward', 'turnRight'))], variants: [[loop(3, code('forward', 'forward', 'turnRight'))], [loop(2, code('forward', 'forward', 'turnLeft'))]] },
  { stageId: 'b1', program: [loop(2, code('forward', 'forward', 'turnLeft', 'forward', 'turnRight'))], variants: [[loop(2, code('forward', 'turnLeft', 'forward', 'turnRight'))], code('forward', 'forward')] },
  { stageId: 'b2', program: code('forward', 'forward', 'turnLeft', 'forward'), variants: [code('forward', 'turnLeft', 'forward'), code('forward', 'forward', 'turnLeft', 'forward', 'forward')] },
]
export const predictions: Prediction[] = definitions.map(({ stageId, program, variants }, i) => {
  const choices = variants.map(variant => predictionEnd(stageId, variant))
  choices.splice(i % 3, 0, predictionEnd(stageId, program))
  return { id: `prediction-${stageId}`, stageId, program, choices }
})

const conditionStage: Stage = { ...stages.find(stage => stage.id === 'u2-1')!, grid: ['S.#', '#.G'], variants: undefined }
const conditionProgram: Program = [{ id: 'prediction-if', type: 'if', condition: 'blockedAhead', body: [{ id: 'prediction-turn', type: 'turnRight' }] }, ...code('forward', 'forward')]
predictions.push({
  id: 'p-u2-1', stageId: 'u2-1', stage: conditionStage, program: conditionProgram,
  choices: [conditionProgram, code('forward', 'turnRight', 'forward'), code('turnRight', 'forward', 'forward')]
    .map(program => predictionEnd('u2-1', program, conditionStage)),
})
