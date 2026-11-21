import { hintCells } from '../grid'
import { t } from '../../i18n/I18n'
import { describe, expect, it } from 'vitest'
import { run } from '../interpreter'
import { countBlocks, MAX_PROGRAM_BLOCKS } from '../program'
import { stages, bonusStages } from './index'
import type { Program } from '../types'

describe('스테이지 정답', () => {
  it('1~8 스테이지가 순서대로 있다', () => {
    expect(stages.map(stage => stage.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })
  for (const stage of stages) {
    it(`${stage.id}번 정답이 도착하고 블록 제한을 지킨다`, () => {
      expect(countBlocks(stage.solution)).toBeLessThanOrEqual(MAX_PROGRAM_BLOCKS)
      expect(run(stage, stage.solution).result).toBe('success')
      expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.starBlocks)
      if (stage.maxBlocks !== undefined) expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.maxBlocks)
    })
  }
  it('모든 스테이지에 별 기준보다 짧은 기본 명령 정답이 없다', () => {
    const started = performance.now()
    const commands = ['forward', 'turnLeft', 'turnRight'] as const
    for (const stage of stages) {
      const visit = (program: Program): void => {
        expect(run(stage, program).result).not.toBe('success')
        if (program.length + 1 >= stage.starBlocks) return
        for (const type of commands) visit([...program, { id: `plain-${program.length}`, type }])
      }
      visit([])
    }
    expect(performance.now() - started).toBeLessThan(1000)
  })
  it('4번은 명령 하나를 고쳐 성공한다', () => {
    const stage = stages[3]
    expect(run(stage, stage.initialProgram!).result).not.toBe('success')
    expect(stage.initialProgram!.filter((block, index) => block.type !== stage.solution[index].type)).toHaveLength(1)
  })
})

it('assigns the confirmed worlds to stages 1–8', () => {
  expect(stages.map(stage => stage.world)).toEqual(['sketchbook', 'sketchbook', 'sketchbook', 'train', 'train', 'train', 'handheld', 'handheld'])
})

it('provides two translated hints for every stage and highlights original map cells', () => {
  for (const stage of stages) {
    expect(stage.hints.keys).toHaveLength(2)
    for (const key of stage.hints.keys) expect(t(key)).not.toBe(key)
    for (const kind of ['path', 'walls', 'start', 'goal'] as const) {
      const expected = stage.grid.flatMap((row, y) => [...row].flatMap((cell, x) => {
        const included = kind === 'path' ? cell !== '#' && cell !== 'S'
          : cell === ({ walls: '#', start: 'S', goal: 'G' } as const)[kind]
        return included ? [`${x},${y}`] : []
      }))
      expect([...hintCells(stage, kind)]).toEqual(expected)
    }
  }
})

for (const stage of bonusStages) {
  it(`${stage.id}: two solutions fit, all open cells are reachable, and no plain program fits`, () => {
    const started = performance.now()
    expect(run(stage, stage.solution).result).toBe('success')
    expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.starBlocks)
    const alternative: Program = structuredClone(stage.solution)
    const loop = alternative.find(block => block.type === 'repeat')!
    if (loop.type !== 'repeat') throw new Error('missing repeat')
    const pair = loop.body.findIndex((block, i) => block.type === 'forward' && loop.body[i + 1]?.type === 'forward')
    loop.body.splice(pair, 2, { id: 'inner', type: 'repeat', count: 2, body: [{ id: 'inner-forward', type: 'forward' }] })
    expect(countBlocks(alternative)).toBeLessThanOrEqual(stage.maxBlocks!)
    expect(run(stage, alternative).result).toBe('success')
    const visited = new Set(run(stage, stage.solution).frames.map(frame => `${frame.pos.x},${frame.pos.y}`))
    stage.grid.forEach((row, y) => [...row].forEach((cell, x) => { if (cell !== '#') expect(visited.has(`${x},${y}`)).toBe(true) }))
    expect(stage.grid.length).toBeLessThanOrEqual(6)
    expect(stage.grid[0].length).toBeLessThanOrEqual(6)
    for (const key of stage.hints.keys) expect(t(key)).not.toBe(key)
    const visit = (program: Program): void => {
      if (run(stage, program).result === 'success') throw new Error(`plain shortcut: ${JSON.stringify(program)}`)
      if (program.length === stage.maxBlocks) return
      for (const type of ['forward', 'turnLeft', 'turnRight'] as const) visit([...program, { id: `plain-${program.length}`, type }])
    }
    visit([])
    expect(performance.now() - started).toBeLessThan(1000)
  })
}
