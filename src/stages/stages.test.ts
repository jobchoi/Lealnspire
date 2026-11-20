import { describe, expect, it } from 'vitest'
import { run } from '../engine/interpreter'
import { countBlocks } from '../engine/program'
import { stages } from './index'

describe('스테이지 정답', () => {
  it('1~8 스테이지가 순서대로 있다', () => {
    expect(stages.map(stage => stage.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })
  for (const stage of stages) {
    it(`${stage.id}번 정답이 도착하고 블록 제한을 지킨다`, () => {
      expect(run(stage, stage.solution).result).toBe('success')
      expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.starBlocks)
      if (stage.maxBlocks !== undefined) expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.maxBlocks)
    })
  }
  it('4번은 명령 하나를 고쳐 성공한다', () => {
    const stage = stages[3]
    expect(run(stage, stage.initialProgram!).result).not.toBe('success')
    expect(stage.initialProgram!.filter((block, index) => block.type !== stage.solution[index].type)).toHaveLength(1)
  })
})
