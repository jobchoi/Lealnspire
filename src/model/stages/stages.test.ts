import { hintCells } from '../grid'
import { t } from '../../i18n/I18n'
import { describe, expect, it } from 'vitest'
import { run, runAll } from '../interpreter'
import { countBlocks, MAX_PROGRAM_BLOCKS } from '../program'
import { stages, bonusStages, unit2Stages } from './index'
import type { Program, Dir } from '../types'

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

for (const stage of unit2Stages.slice(1)) {
  it(stage.id + ': solution passes both maps within the limit', () => {
    expect(runAll(stage, stage.solution).results.map(result => result.result)).toEqual(['success', 'success'])
    expect(countBlocks(stage.solution)).toBeLessThanOrEqual(stage.maxBlocks!)
    for (const key of [stage.title, stage.goal, ...stage.hints.keys]) expect(t(key)).not.toBe(key)
  })
  it(stage.id + ': no if-free program up to maxBlocks, including arbitrary repeat nesting, succeeds on both maps', () => {
    // Exhaust every program's state transformation, merging equivalent trees at their
    // cheapest node count. Unbounded execution is a superset of the engine's capped
    // execution, so proving impossibility here also excludes capped shortcuts.
    const states: Array<{ map: number; x: number; y: number; dir: Dir }> = []
    stage.variants!.forEach((grid, map) => grid.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell !== '#' && cell !== 'G') for (const dir of ['N', 'E', 'S', 'W'] as const) states.push({ map, x, y, dir })
    })))
    const success = states.length, collision = success + 1
    const identity = Array.from({ length: collision + 1 }, (_, i) => i)
    const compose = (a: number[], b: number[]) => a.map(value => b[value])
    const commands = (['forward', 'turnLeft', 'turnRight'] as const).map(type => [
      ...states.map(state => {
        const grid = stage.variants![state.map].map((row, y) => [...row].map((cell, x) =>
          x === state.x && y === state.y ? 'S' : cell === 'S' ? '.' : cell).join(''))
        const result = run({ ...stage, grid, startDir: state.dir, variants: undefined }, [{ id: 'command', type }])
        if (result.result === 'success') return success
        if (result.result === 'collision') return collision
        const end = result.frames[result.frames.length - 1]
        return states.findIndex(next => next.map === state.map && next.x === end.pos.x && next.y === end.pos.y && next.dir === end.dir)
      }), success, collision,
    ])
    const starts = stage.variants!.map((grid, map) => {
      const y = grid.findIndex(row => row.includes('S')), x = grid[y].indexOf('S')
      return states.findIndex(state => state.map === map && state.x === x && state.y === y && state.dir === stage.startDir)
    })
    const bySize: number[][][] = [[identity]]
    const seen = new Set([identity.join(',')])
    for (let size = 1; size <= stage.maxBlocks!; size++) {
      const current: number[][] = []
      const add = (transform: number[]) => {
        const key = transform.join(',')
        if (seen.has(key)) return
        if (starts.every(index => transform[index] === success)) throw new Error('if-free shortcut at size ' + size)
        seen.add(key); current.push(transform)
      }
      for (const command of commands) for (const tail of bySize[size - 1]) add(compose(command, tail))
      for (let bodySize = 1; bodySize < size; bodySize++) for (const body of bySize[bodySize]) {
        let repeated = body
        for (let count = 2; count <= 10; count++) {
          repeated = compose(repeated, body)
          for (const tail of bySize[size - bodySize - 1]) add(compose(repeated, tail))
        }
      }
      bySize.push(current)
    }
    expect(seen.size).toBeGreaterThan(100)
  })
}
it('u2-4 initial code collides on the fourth forward in A and succeeds in B', () => {
  const stage = unit2Stages[3]
  const results = runAll(stage, stage.initialProgram!).results
  expect(results.map(result => result.result)).toEqual(['collision', 'success'])
  expect(results[0].frames.filter(frame => frame.event === 'move')).toHaveLength(3)
  expect(results[0].frames.filter(frame => frame.event === 'check').map(frame => frame.check?.result)).toEqual([false])
  expect(results[1].frames.filter(frame => frame.event === 'check').map(frame => frame.check?.result)).toEqual([true])
})
