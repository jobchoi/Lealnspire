import type { Block, HintFocus, HintHighlight, HintTarget, Program, Stage } from '../types'

// T74: each hint observes one region, with a second region only for a relationship.
function hintFocus(id: string, area: HintHighlight): [HintFocus, HintFocus] {
  const map = (area: HintHighlight): HintTarget => ({ kind: 'map', area })
  const region = (kind: Exclude<HintTarget['kind'], 'map'>): HintTarget => ({ kind })
  let primary: HintTarget = map(area)
  let secondary: HintTarget | undefined
  let next: HintTarget = region('workspace')
  if (id === '4') primary = map('path')
  if (id === '1' || id === 'u3-1') next = region('palette')
  if (id === '2') next = map('path')
  if (['u2-4', 'u4-3', 'u6-1', 'u7-3', 'u8-2', 'u8-3'].includes(id)) primary = region('workspace')
  if (id === 'u5-1' || id === 'u5-3') primary = region('variables')
  if (id === 'u5-1') secondary = map('goal')
  if (id.startsWith('u9-')) primary = region('signals')
  if (id === 'u9-1') secondary = map('path')
  if (id === 'u9-2') next = region('signals')
  if (id === 'u9-3') secondary = region('workspace')
  if (id.startsWith('u10-') || id === 'u12-3') primary = next = region('list')
  if (id === 'u10-1') secondary = map('path')
  if (id === 'u12-3') secondary = map('goal')
  if (id.startsWith('u11-')) primary = region('search')
  if (id === 'u11-1') next = region('search')
  return [{ primary, ...(secondary ? { secondary } : {}) }, { primary: next }]
}

const program = (...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Program =>
  types.map((type, index) => ({ id: `block-${index}`, type }))
const repeat = (count: number, ...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Block =>
  ({ id: 'repeat', type: 'repeat', count, body: program(...types) })

// 스테이지 구성과 6~8의 블록 제한은 커리큘럼 초안을 따른 잠정안입니다.
export const stages: Stage[] = [
  { id: '1', world: 'sketchbook', title: 'stage1Title', goal: 'stage1Goal', hints: { keys: ['stage1Hint1', 'stage1Hint2'], focus: hintFocus('1', 'path') }, grid: ['S.G'], startDir: 'E', starBlocks: 2, solution: program('forward', 'forward') },
  { id: '2', world: 'sketchbook', title: 'stage2Title', goal: 'stage2Goal', hints: { keys: ['stage2Hint1', 'stage2Hint2'], focus: hintFocus('2', 'walls') }, grid: ['S..', '##G'], startDir: 'E', starBlocks: 4, solution: program('forward', 'forward', 'turnRight', 'forward') },
  { id: '3', world: 'sketchbook', title: 'stage3Title', goal: 'stage3Goal', hints: { keys: ['stage3Hint1', 'stage3Hint2'], focus: hintFocus('3', 'path') }, grid: ['S.#', '#..', '##G'], startDir: 'E', starBlocks: 7, solution: program('forward', 'turnRight', 'forward', 'turnLeft', 'forward', 'turnRight', 'forward') },
  { id: '4', world: 'train', title: 'stage4Title', goal: 'stage4Goal', hints: { keys: ['stage4Hint1', 'stage4Hint2'], focus: hintFocus('4', 'start') }, grid: ['S.', '#G'], startDir: 'E', starBlocks: 3, initialProgram: program('forward', 'turnLeft', 'forward'), solution: program('forward', 'turnRight', 'forward') },
  { id: '5', world: 'train', title: 'stage5Title', goal: 'stage5Goal', hints: { keys: ['stage5Hint1', 'stage5Hint2'], focus: hintFocus('5', 'path') }, grid: ['S.....G'], startDir: 'E', maxBlocks: 2, starBlocks: 2, solution: [repeat(6, 'forward')] },
  { id: '6', world: 'train', title: 'stage6Title', goal: 'stage6Goal', hints: { keys: ['stage6Hint1', 'stage6Hint2'], focus: hintFocus('6', 'path') }, grid: ['###G', '##..', '#..#', 'S.##'], startDir: 'E', maxBlocks: 5, starBlocks: 5, solution: [repeat(3, 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: '7', world: 'handheld', title: 'stage7Title', goal: 'stage7Goal', hints: { keys: ['stage7Hint1', 'stage7Hint2'], focus: hintFocus('7', 'path') }, grid: ['S..', '##.', 'G..'], startDir: 'E', maxBlocks: 4, starBlocks: 4, solution: [repeat(3, 'forward', 'forward', 'turnRight')] },
  { id: '8', world: 'handheld', title: 'stage8Title', goal: 'stage8Goal', hints: { keys: ['stage8Hint1', 'stage8Hint2'], focus: hintFocus('8', 'goal') }, grid: ['##.G', '#..#', 'S.##'], startDir: 'E', maxBlocks: 7, starBlocks: 7, solution: [repeat(2, 'forward', 'turnLeft', 'forward', 'turnRight'), { id: 'last-forward', type: 'forward' }] },
]

// T21 전이 보너스: 정규 완주 뒤 선택하는 잠정 구성입니다.
export const bonusStages: Stage[] = [
  { id: 'b1', world: 'train', title: 'bonus1Title', goal: 'bonus1Goal', hints: { keys: ['bonus1Hint1', 'bonus1Hint2'], focus: hintFocus('b1', 'path') }, grid: ['####G', '##...', 'S..##'], startDir: 'E', maxBlocks: 7, starBlocks: 6, solution: [repeat(2, 'forward', 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: 'b2', world: 'handheld', title: 'bonus2Title', goal: 'bonus2Goal', hints: { keys: ['bonus2Hint1', 'bonus2Hint2'], focus: hintFocus('b2', 'path') }, grid: ['###G', '###.', '##..', '##.#', 'S..#'], startDir: 'E', maxBlocks: 8, starBlocks: 7, solution: [{ id: 'first-forward', type: 'forward' }, repeat(2, 'forward', 'turnLeft', 'forward', 'forward', 'turnRight')] },
]
// T38 [제안·잠정]: 조건 단원 첫 퍼즐.
export const unit2Stages: Stage[] = [{
  id: 'u2-1', world: 'sketchbook', title: 'u21Title', goal: 'u21Goal',
  hints: { keys: ['u21Hint1', 'u21Hint2'], focus: hintFocus('u2-1', 'walls') },
  grid: ['S..#', '##.#', '##G#'], variants: [['S..#', '##.#', '##G#'], ['S.##', '#.##', '#.##', '#G##']],
  startDir: 'E', maxBlocks: 6, starBlocks: 4,
  solution: [{ id: 'u2-repeat', type: 'repeat', count: 4, body: [{ id: 'u2-if', type: 'if', condition: 'blockedAhead', body: [{ id: 'u2-right', type: 'turnRight' }] }, { id: 'u2-forward', type: 'forward' }] }],
}]
// T39 [제안·잠정]: 센서는 유지하고 행동·반복 위치를 바꿔 보는 퍼즐.
const conditionalLoop = (id: string, count: number, turn: 'turnLeft' | 'turnRight'): Block => ({
  id: id + '-repeat', type: 'repeat', count, body: [
    { id: id + '-if', type: 'if', condition: 'blockedAhead', body: [{ id: id + '-turn', type: turn }] },
    { id: id + '-forward', type: 'forward' },
  ],
})
unit2Stages.push(
  { id: 'u2-2', world: 'sketchbook', title: 'u22Title', goal: 'u22Goal', hints: { keys: ['u22Hint1', 'u22Hint2'], focus: hintFocus('u2-2', 'walls') },
    grid: ['##G#', '##.#', 'S..#'], variants: [['##G#', '##.#', 'S..#'], ['#G##', '#.##', '#.##', 'S.##']],
    startDir: 'E', maxBlocks: 6, starBlocks: 4, solution: [conditionalLoop('u22', 4, 'turnLeft')] },
  { id: 'u2-3', world: 'train', title: 'u23Title', goal: 'u23Goal', hints: { keys: ['u23Hint1', 'u23Hint2'], focus: hintFocus('u2-3', 'walls') },
    grid: ['S..#', '##.#', '#G.#'], variants: [['S..#', '##.#', '#G.#'], ['S.#', '#.#', '#.#', 'G.#']],
    startDir: 'E', maxBlocks: 6, starBlocks: 4, solution: [conditionalLoop('u23', 5, 'turnRight')] },
  { id: 'u2-4', world: 'handheld', title: 'u24Title', goal: 'u24Goal', hints: { keys: ['u24Hint1', 'u24Hint2'], focus: hintFocus('u2-4', 'start') },
    grid: ['S...#', '###G#'], variants: [['S...#', '###G#'], ['S###', '.###', '.###', 'G###']],
    startDir: 'E', maxBlocks: 6, starBlocks: 4,
    initialProgram: [{ id: 'u24-initial-if', type: 'if', condition: 'blockedAhead', body: [{ id: 'u24-initial-turn', type: 'turnRight' }] }, { id: 'u24-initial-repeat', type: 'repeat', count: 4, body: [{ id: 'u24-initial-forward', type: 'forward' }] }],
    solution: [conditionalLoop('u24', 4, 'turnRight')] },
)
// T41 [제안·잠정]: a dead end requires two turns before moving.
for (const [id, world, variants, startDir, turn, count, highlight] of [
  ['u2-5', 'train', [['G.S'], ['S..G']], 'E', 'turnRight', 5, 'start'],
  ['u2-6', 'handheld', [['S..#', '##.#', '##G#'], ['G.S'], ['S#', '.#', '.#', 'G#']], 'E', 'turnRight', 6, 'walls'],
] as const) {
  unit2Stages.push({ id, world, grid: [...variants[0]], variants: variants.map(grid => [...grid]), startDir,
    title: id.replace('-', '') + 'Title', goal: id.replace('-', '') + 'Goal', hints: { keys: [id.replace('-', '') + 'Hint1', id.replace('-', '') + 'Hint2'], focus: hintFocus(id, highlight) },
    maxBlocks: 4, starBlocks: 4, solution: [{ id: id + '-repeat', type: 'repeat', count, body: [{ id: id + '-if', type: 'if', condition: 'blockedAhead', body: [{ id: id + '-turn', type: turn }], else: [{ id: id + '-forward', type: 'forward' }] }] }],
  })
}
const whileForward = (id: string): Block => ({ id, type: 'while', condition: 'clearAhead', body: [{ id: id + '-f', type: 'forward' }] })
export const unit3Stages: Stage[] = [
  { id: 'u3-1', world: 'sketchbook', title: 'u31Title', goal: 'u31Goal', hints: { keys: ['u31Hint1', 'u31Hint2'], focus: hintFocus('u3-1', 'walls') }, grid: ['S..#', '##G#'], variants: [['S..#', '##G#'], ['S....#', '####G#']], startDir: 'E', maxBlocks: 5, starBlocks: 4, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'while'], solution: [whileForward('u31-w'), { id: 'u31-r', type: 'turnRight' }, { id: 'u31-f', type: 'forward' }] },
  { id: 'u3-2', world: 'train', title: 'u32Title', goal: 'u32Goal', hints: { keys: ['u32Hint1', 'u32Hint2'], focus: hintFocus('u3-2', 'path') }, grid: ['S..#', '##.#', 'G..#'], variants: [['S..#', '##.#', 'G..#'], ['S.#', '#.#', '#.#', '#.#', 'G.#']], startDir: 'E', maxBlocks: 5, starBlocks: 4, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'while'], solution: [{ id: 'u32-repeat', type: 'repeat', count: 3, body: [whileForward('u32-w'), { id: 'u32-r', type: 'turnRight' }] }] },
  { id: 'u3-3', world: 'handheld', title: 'u33Title', goal: 'u33Goal', hints: { keys: ['u33Hint1', 'u33Hint2'], focus: hintFocus('u3-3', 'start') }, grid: ['S...G'], variants: [['S...G'], ['S......G']], startDir: 'E', maxBlocks: 3, starBlocks: 2, palette: ['forward', 'turnLeft', 'turnRight', 'while'], initialProgram: [{ id: 'u33-initial', type: 'while', condition: 'clearAhead', body: [{ id: 'u33-l', type: 'turnLeft' }, { id: 'u33-r', type: 'turnRight' }] }], solution: [whileForward('u33-w')] },
]
// T45 [제안·잠정]: each map excludes every function-free tree within its budget.
const functionPuzzle = (number: number, world: Stage['world'], grid: string[], prefix: Program, suffix: Program, budget: number, turn: 'turnLeft' | 'turnRight'): Stage => {
  const id = `u4-${number}`, fn = id + '-star'
  const body: Program = [...prefix, { id: id + '-repeat', type: 'repeat', count: 2, body: [
    { id: id + '-f1', type: 'forward' }, { id: id + '-turn', type: turn }, { id: id + '-f2', type: 'forward' },
  ] }, ...suffix]
  const functions = [{ id: fn, icon: 'star' as const, body }]
  return { id, world, title: `u4${number}Title`, goal: `u4${number}Goal`, hints: { keys: [`u4${number}Hint1`, `u4${number}Hint2`], focus: hintFocus(id, number === 3 ? 'start' : 'path') },
    grid, variants: [grid], startDir: 'E', maxBlocks: budget, starBlocks: budget,
    palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'call'],
    solution: [{ id: id + '-call1', type: 'call', fn }, { id: id + '-gap', type: 'forward' }, { id: id + '-call2', type: 'call', fn }, { id: id + '-call3', type: 'call', fn }],
    solutionFunctions: functions, ...(number === 3 ? { initialProgram: [], initialFunctions: structuredClone(functions) } : {}),
  }
}
export const unit4Stages: Stage[] = [
  functionPuzzle(1, 'sketchbook', ['#G.', '##.', '#..', '#.#', 'S.#'], [], [], 8, 'turnLeft'),
  functionPuzzle(2, 'train', ['##...#', '...#.#', '.###.#', '.G##..', '#####.', '###S..'], [{ id: 'u42-prefix', type: 'forward' }], [{ id: 'u42-suffix', type: 'turnRight' }], 10, 'turnLeft'),
  functionPuzzle(3, 'handheld', ['###S.', '.G##.', '.##..', '..#.#', '#...#'], [], [{ id: 'u43-suffix', type: 'turnLeft' }], 9, 'turnRight'),
]
// The introductory card is a plain three-command shape, before nested repeat.
unit4Stages[0].solutionFunctions![0].body = [
  { id: 'u41-a', type: 'forward' }, { id: 'u41-b', type: 'turnLeft' }, { id: 'u41-c', type: 'forward' },
]
unit4Stages[0].solution.splice(2, 0, { id: 'u41-separator-turn', type: 'turnRight' })
// T48: map-provided values, one shared program per puzzle.
const variablePalette: Stage['palette'] = ['forward', 'turnLeft', 'turnRight', 'repeat', 'set', 'change']
const variableRepeat = (id: string): Block => ({ id, type: 'repeat', countVariable: 'A', body: [{ id: `${id}-f`, type: 'forward' }] })
const variableFinish = (): Block[] => [{ id: 'left', type: 'turnLeft' }, { id: 'finish', type: 'forward' }]
export const unit5Stages: Stage[] = [
  { id: 'u5-1', world: 'sketchbook', title: 'u51Title', goal: 'u51Goal', hints: { keys: ['u51Hint1', 'u51Hint2'], focus: hintFocus('u5-1', 'goal') }, grid: ['##G####', 'S......'], variants: [['##G####', 'S......'], ['####G##', 'S......']], variantVariables: [{ A: 2 }, { A: 4 }], startDir: 'E', maxBlocks: 4, starBlocks: 4, palette: variablePalette, solution: [variableRepeat('repeat'), ...variableFinish()] },
  { id: 'u5-2', world: 'train', title: 'u52Title', goal: 'u52Goal', hints: { keys: ['u52Hint1', 'u52Hint2'], focus: hintFocus('u5-2', 'path') }, grid: ['#G...', '####.', '###S.'], variants: [['#G...', '####.', '###S.'], ['##G....', '######.', '######.', '####S..']], variantVariables: [{ A: 1 }, { A: 2 }], startDir: 'E', maxBlocks: 6, starBlocks: 6, palette: variablePalette, solution: [{ id: 'outer', type: 'repeat', count: 3, body: [variableRepeat('inner'), { id: 'left', type: 'turnLeft' }, { id: 'change', type: 'change', variable: 'A', by: 1 }] }] },
  { id: 'u5-3', world: 'handheld', title: 'u53Title', goal: 'u53Goal', hints: { keys: ['u53Hint1', 'u53Hint2'], focus: hintFocus('u5-3', 'start') }, grid: ['###G##', 'S.....'], variants: [['###G##', 'S.....']], variantVariables: [{ A: 0 }], startDir: 'E', maxBlocks: 5, starBlocks: 5, palette: variablePalette, initialProgram: [variableRepeat('repeat'), { id: 'set', type: 'set', variable: 'A', value: 3 }, ...variableFinish()], solution: [{ id: 'set', type: 'set', variable: 'A', value: 3 }, variableRepeat('repeat'), ...variableFinish()] },
]
const logicPuzzle = (number: number, world: Stage['world']): Stage => {
  const maps = [
    [['##G', 'S..'], ['####G', 'S....']],
    [['##G###', '##.###', 'S.....'], ['####G#', '####.#', 'S.....']],
    [['####G#', '#.##.#', 'S.....', '##.#.#'], ['###G##', '###.##', 'S.....', '#.#.##']],
    [['#.##G#', 'S.....', '##.#.#'], ['###G##', 'S.....', '#.#.##']],
  ]
  const variants = maps[number - 1]
  const atom = (value: 'blockedAhead' | 'blockedLeft' | 'blockedRight') => ({ kind: 'atom' as const, atom: value })
  const not = (value: 'blockedAhead' | 'blockedLeft' | 'blockedRight') => ({ kind: 'not' as const, operand: atom(value) })
  const forward: Block = { id: 'f', type: 'forward' }
  const finish: Block[] = [{ id: 'left', type: 'turnLeft' }, { id: 'end', type: 'forward' }]
  const sides = (kind: 'and' | 'or') => ({ kind, left: atom('blockedLeft'), right: atom('blockedRight') })
  const solution: Block[] = number === 1 || number === 4
    ? [{ id: 'while', type: 'while', condition: number === 1 ? not('blockedAhead') : sides('or'), body: [forward] }, ...finish]
    : [{ id: 'repeat', type: 'repeat', count: 6, body: [{ id: 'if', type: 'if', condition: number === 2 ? not('blockedLeft') : { kind: 'and', left: not('blockedLeft'), right: not('blockedRight') }, body: [{ id: 'left', type: 'turnLeft' }] }, forward] }]
  const initialProgram: Block[] | undefined = number === 1 || number === 4
    ? [{ id: 'while', type: 'while', condition: number === 1 ? atom('blockedAhead') : sides('and'), body: [forward] }, ...finish] : undefined
  return { id: `u6-${number}`, world, title: `u6${number}Title`, goal: `u6${number}Goal`, hints: { keys: [`u6${number}Hint1`, `u6${number}Hint2`], focus: hintFocus(`u6-${number}`, number === 1 ? 'start' : number === 3 ? 'path' : 'walls') }, grid: variants[0], variants, startDir: 'E', maxBlocks: 4, starBlocks: 4, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'if', 'while'], solution, ...(initialProgram ? { initialProgram } : {}) }
}
export const unit6Stages: Stage[] = [logicPuzzle(1, 'sketchbook'), logicPuzzle(2, 'train'), logicPuzzle(3, 'handheld'), logicPuzzle(4, 'sketchbook')]
// T60 [제안·잠정]: one read-only local input, copied on each call.
const parameterPuzzle = (number: number, world: Stage['world'], variants: string[][], args: ('A' | number)[]): Stage => {
  const fn = 'star'
  const functions: NonNullable<Stage['solutionFunctions']> = [{ id: fn, icon: 'star', param: true, body: [
    { id: 'repeat', type: 'repeat', countParam: true, body: [{ id: 'f', type: 'forward' }] }, { id: 'left', type: 'turnLeft' },
  ] }]
  const solution: Program = args.map((arg, i) => ({ id: `call-${i}`, type: 'call', fn, arg: arg === 'A' ? { kind: 'A' } : { kind: 'number', value: arg } }))
  const initialFunctions = structuredClone(functions)
  initialFunctions[0].body[0] = { id: 'repeat', type: 'repeat', countVariable: 'A', body: [{ id: 'f', type: 'forward' }] }
  return { id: `u7-${number}`, params: true, world, title: `u7${number}Title`, goal: `u7${number}Goal`, hints: { keys: [`u7${number}Hint1`, `u7${number}Hint2`], focus: hintFocus(`u7-${number}`, number === 3 ? 'start' : 'path') }, grid: variants[0], variants, variantVariables: [{ A: 2 }, { A: 4 }], startDir: 'E', maxBlocks: 6, starBlocks: 6, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'call'], solution, solutionFunctions: functions, ...(number === 3 ? { initialProgram: structuredClone(solution), initialFunctions } : {}) }
}
export const unit7Stages: Stage[] = [
  parameterPuzzle(1, 'sketchbook', [['G..', '##.', 'S..'], ['G....', '####.', 'S....']], ['A', 2, 'A']),
  parameterPuzzle(2, 'train', [['G...', '###.', '#S..'], ['G...', '###.', '###.', '###.', '#S..']], [2, 'A', 3]),
  parameterPuzzle(3, 'handheld', [['G..', '##.', '##.', 'S..'], ['G....', '####.', '####.', 'S....']], ['A', 3, 'A']),
]
// T63 [제안·잠정]: return is the only map-dependent value source.
const returnPuzzle = (number: number, world: Stage['world'], variants: string[][], budget: number): Stage => {
  const fn = 'star'
  const result: Block = { id: 'return', type: 'return', value: { kind: 'ahead' } }
  const valueRepeat: Block = { id: 'value-repeat', type: 'repeat', countCall: { fn, ...(number === 2 ? { arg: { kind: 'A' as const } } : {}) }, count: 3, body: [{ id: 'forward', type: 'forward' }] }
  const main: Program = number === 3 ? [{ id: 'outer', type: 'repeat', count: 2, body: [valueRepeat, { id: 'left', type: 'turnLeft' }] }] : [valueRepeat, { id: 'turn', type: number === 2 ? 'turnRight' : 'turnLeft' }, { id: 'finish', type: 'forward' }]
  const body: Program = number === 2 ? [{ id: 'input-repeat', type: 'repeat', countParam: true, body: [{ id: 'input-left', type: 'turnLeft' }] }, result] : number === 3 ? [result, { id: 'right', type: 'turnRight' }] : [result]
  const functions = [{ id: fn, icon: 'star' as const, ...(number === 2 ? { param: true as const } : {}), body }]
  return { id: `u8-${number}`, world, returns: true, params: true, title: `u8${number}Title`, goal: `u8${number}Goal`, hints: { keys: [`u8${number}Hint1`, `u8${number}Hint2`], focus: hintFocus(`u8-${number}`, number === 1 ? 'path' : 'start') }, grid: variants[0], variants, variantVariables: [{ A: 1 }, { A: 1 }], startDir: 'E', maxBlocks: budget, starBlocks: budget, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'call', 'set', 'change', 'return'], solution: main, solutionFunctions: functions, ...(number === 3 ? { initialProgram: structuredClone(main), initialFunctions: [{ ...functions[0], body: [body[1], body[0]] }] } : {}) }
}
export const unit8Stages: Stage[] = [
  returnPuzzle(1, 'sketchbook', [['##G', 'S..'], ['####G', 'S....']], 6),
  returnPuzzle(2, 'train', [['.G', '.#', 'S#'], ['.G', '.#', '.#', '.#', 'S#']], 8),
  returnPuzzle(3, 'handheld', [['##G', '##.', 'S..'], ['####G', '####.', '####.', 'S....']], 7),
]
const eventPuzzle = (number: number, world: Stage['world'], grid: string[], signals: string[][], budget: number): Stage => {
  const forward = (id: string): Block => ({ id, type: 'repeat', count: 2, body: [{ id: `${id}-f`, type: 'forward' }] })
  const solution: Block[] = [{ id: `u9${number}-diamond`, type: 'on', signal: '◇', body: [forward(`u9${number}-a`)] }]
  if (number > 1) solution.push({ id: `u9${number}-circle`, type: 'on', signal: '○', body: [...(number === 3 ? [{ id: 'u93-left', type: 'turnLeft' as const }] : []), forward(`u9${number}-b`)] })
  return { id: `u9-${number}`, world, events: true, grid, variants: [grid, [...grid]], signals, startDir: 'E', maxBlocks: budget, starBlocks: budget,
    title: `u9${number}Title`, goal: `u9${number}Goal`, hints: { keys: [`u9${number}Hint1`, `u9${number}Hint2`], focus: hintFocus(`u9-${number}`, number === 2 ? 'path' : 'start') },
    palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'on'], solution,
    ...(number === 3 ? { initialProgram: solution.map(block => block.type === 'on' ? { ...structuredClone(block), signal: block.signal === '◇' ? '○' as const : '◇' as const } : block) } : {}) }
}
export const unit9Stages: Stage[] = [
  eventPuzzle(1, 'sketchbook', ['#####', '#SaG#', '#####'], [['◇'], ['△', '◇']], 3),
  eventPuzzle(2, 'train', ['#######', '#Sa.bG#', '#######'], [['◇', '○'], ['◇', '△', '○']], 6),
  eventPuzzle(3, 'handheld', ['###G#', '###.#', '#Sa.#', '#####'], [['◇', '○'], ['△', '◇', '○']], 7),
]
const listStage = (number: number, world: Stage['world'], variants: string[][], lists: number[][], solution: Program, budget: number): Stage => ({
  id: `u10-${number}`, world, grid: variants[0], variants, lists, variantVariables: [{ A: 0 }, { A: 0 }], startDir: 'E',
  title: `u10${number}Title`, goal: `u10${number}Goal`, hints: { keys: [`u10${number}Hint1`, `u10${number}Hint2`], focus: hintFocus(`u10-${number}`, 'path') },
  palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'set', 'change', 'forEach'], maxBlocks: budget, starBlocks: budget, solution,
  ...(number === 2 ? { initialProgram: solution.map(block => block.type === 'set' ? { ...block, value: 1 } : structuredClone(block)) } : {}),
})
const listMaps = [['##G', 'S..'], ['####G', 'S....']]
const listRepeat = (source: 'current' | 'listAtA' | 'listLength'): Block => ({ id: 'repeat', type: 'repeat', countSource: source, body: [{ id: 'f', type: 'forward' }] })
export const unit10Stages: Stage[] = [
  listStage(1, 'sketchbook', [['#G.', '##.', '##.', 'S..'], ['G....', '###S.']], [[2, 3, 1], [1, 1, 4]], [{ id: 'each', type: 'forEach', body: [listRepeat('current'), { id: 'left', type: 'turnLeft' }] }], 4),
  listStage(2, 'train', listMaps, [[2, 1], [4, 1]], [{ id: 'set', type: 'set', variable: 'A', value: 0 }, listRepeat('listAtA'), { id: 'left', type: 'turnLeft' }, { id: 'finish', type: 'forward' }], 5),
  listStage(3, 'handheld', listMaps, [[7, 9], [6, 0, 8, 3]], [listRepeat('listLength'), { id: 'left', type: 'turnLeft' }, { id: 'finish', type: 'forward' }], 4),
]
const searchProgram = (direction: 'front' | 'back', stop = true): Program => [
  { id: 'each', type: 'forEach', direction, body: [{ id: 'match', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: stop ? [{ id: 'stop', type: 'breakForEach' }] : [] }] },
  { id: 'finish', type: 'forward' },
]
export const unit11Stages: Stage[] = [
  [[7, 2, 4], [4, 2, 7]], [[7, 2, 4, 1, 3], [2, 7, 4, 1, 3]], [[2, 4, 1, 7, 3], [2, 4, 1, 3, 7]],
].map((lists, index) => ({
  id: `u11-${index + 1}`, world: (['sketchbook', 'train', 'handheld'] as const)[index],
  title: `u11${index + 1}Title`, goal: `u11${index + 1}Goal`,
  hints: { keys: [`u11${index + 1}Hint1`, `u11${index + 1}Hint2`], focus: hintFocus(`u11-${index + 1}`, index === 1 ? 'path' : 'start') },
  grid: ['SG'], variants: [['SG'], ['SG']], lists, variantVariables: [{ A: 0 }, { A: 0 }], startDir: 'E',
  search: { target: 7, maxComparisons: index === 0 ? 3 : 2 }, maxBlocks: index === 0 ? 3 : 4, starBlocks: index === 0 ? 3 : 4,
  palette: ['forward', 'forEach', 'if', 'breakForEach'], solution: searchProgram(index === 2 ? 'back' : 'front', index !== 0),
  ...(index === 1 ? { initialProgram: searchProgram('front', false) } : index === 2 ? { initialProgram: searchProgram('front') } : {}),
}))
export const unit12Stages: Stage[] = [
  {
    id: 'u12-1', world: 'sketchbook', title: 'u121Title', goal: 'u121Goal',
    hints: { keys: ['u121Hint1', 'u121Hint2'], focus: hintFocus('u12-1', 'walls') },
    grid: ['S...', '###.', '#G..'], variants: [['S...', '###.', '#G..'], ['S.##', '#.##', '#.##', '#.##', 'G.##']],
    variantVariables: [{ A: 0 }, { A: 0 }], startDir: 'E', maxBlocks: 4, starBlocks: 4,
    palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'if', 'while'],
    solution: [{ id: 'repeat', type: 'repeat', count: 7, body: [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [{ id: 'right', type: 'turnRight' }] }, { id: 'forward', type: 'forward' }] }],
  },
  {
    id: 'u12-2', world: 'train', title: 'u122Title', goal: 'u122Goal',
    hints: { keys: ['u122Hint1', 'u122Hint2'], focus: hintFocus('u12-2', 'path') },
    grid: ['G...', '###.', 'S...'], variants: [['G...', '###.', 'S...'], ['G.....', '#####.', 'S.....']],
    variantVariables: [{ A: 3 }, { A: 5 }], params: true, startDir: 'E', maxBlocks: 6, starBlocks: 6,
    palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'call'],
    solution: [3, 2, 3].map((_, i) => ({ id: `call-${i}`, type: 'call', fn: 'star', arg: i === 1 ? { kind: 'number', value: 2 } : { kind: 'A' } })),
    solutionFunctions: [{ id: 'star', icon: 'star', param: true, body: [{ id: 'repeat', type: 'repeat', countParam: true, body: [{ id: 'forward', type: 'forward' }] }, { id: 'left', type: 'turnLeft' }] }],
  },
  {
    id: 'u12-3', world: 'handheld', title: 'u123Title', goal: 'u123Goal',
    hints: { keys: ['u123Hint1', 'u123Hint2'], focus: hintFocus('u12-3', 'goal') },
    grid: ['###G###', 'S......'], variants: [['###G###', 'S......'], ['#####G#', 'S......']],
    variantVariables: [{ A: 0 }, { A: 0 }], lists: [[9, 0, 8], [1, 9, 0, 8, 2]], startDir: 'E', maxBlocks: 4, starBlocks: 4,
    palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'forEach', 'if'],
    solution: [{ id: 'repeat', type: 'repeat', countSource: 'listLength', body: [{ id: 'forward', type: 'forward' }] }, { id: 'left', type: 'turnLeft' }, { id: 'goal', type: 'forward' }],
  },
]

export const allStages = [...stages, ...bonusStages, ...unit2Stages, ...unit3Stages, ...unit4Stages, ...unit5Stages, ...unit6Stages, ...unit7Stages, ...unit8Stages, ...unit9Stages, ...unit10Stages, ...unit11Stages, ...unit12Stages]
export const isLastStage = (index: number) => [stages, bonusStages, unit2Stages, unit3Stages, unit4Stages, unit5Stages, unit6Stages, unit7Stages, unit8Stages, unit9Stages, unit10Stages, unit11Stages, unit12Stages].some((_, group, groups) => index === groups.slice(0, group + 1).reduce((total, entries) => total + entries.length, 0) - 1)
