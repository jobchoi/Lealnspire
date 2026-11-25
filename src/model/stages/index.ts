import type { Block, Program, Stage } from '../types'

const program = (...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Program =>
  types.map((type, index) => ({ id: `block-${index}`, type }))
const repeat = (count: number, ...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Block =>
  ({ id: 'repeat', type: 'repeat', count, body: program(...types) })

// 스테이지 구성과 6~8의 블록 제한은 커리큘럼 초안을 따른 잠정안입니다.
export const stages: Stage[] = [
  { id: '1', world: 'sketchbook', title: 'stage1Title', goal: 'stage1Goal', hints: { keys: ['stage1Hint1', 'stage1Hint2'], highlight: 'path' }, grid: ['S.G'], startDir: 'E', starBlocks: 2, solution: program('forward', 'forward') },
  { id: '2', world: 'sketchbook', title: 'stage2Title', goal: 'stage2Goal', hints: { keys: ['stage2Hint1', 'stage2Hint2'], highlight: 'walls' }, grid: ['S..', '##G'], startDir: 'E', starBlocks: 4, solution: program('forward', 'forward', 'turnRight', 'forward') },
  { id: '3', world: 'sketchbook', title: 'stage3Title', goal: 'stage3Goal', hints: { keys: ['stage3Hint1', 'stage3Hint2'], highlight: 'path' }, grid: ['S.#', '#..', '##G'], startDir: 'E', starBlocks: 7, solution: program('forward', 'turnRight', 'forward', 'turnLeft', 'forward', 'turnRight', 'forward') },
  { id: '4', world: 'train', title: 'stage4Title', goal: 'stage4Goal', hints: { keys: ['stage4Hint1', 'stage4Hint2'], highlight: 'start' }, grid: ['S.', '#G'], startDir: 'E', starBlocks: 3, initialProgram: program('forward', 'turnLeft', 'forward'), solution: program('forward', 'turnRight', 'forward') },
  { id: '5', world: 'train', title: 'stage5Title', goal: 'stage5Goal', hints: { keys: ['stage5Hint1', 'stage5Hint2'], highlight: 'path' }, grid: ['S.....G'], startDir: 'E', maxBlocks: 2, starBlocks: 2, solution: [repeat(6, 'forward')] },
  { id: '6', world: 'train', title: 'stage6Title', goal: 'stage6Goal', hints: { keys: ['stage6Hint1', 'stage6Hint2'], highlight: 'path' }, grid: ['###G', '##..', '#..#', 'S.##'], startDir: 'E', maxBlocks: 5, starBlocks: 5, solution: [repeat(3, 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: '7', world: 'handheld', title: 'stage7Title', goal: 'stage7Goal', hints: { keys: ['stage7Hint1', 'stage7Hint2'], highlight: 'path' }, grid: ['S..', '##.', 'G..'], startDir: 'E', maxBlocks: 4, starBlocks: 4, solution: [repeat(3, 'forward', 'forward', 'turnRight')] },
  { id: '8', world: 'handheld', title: 'stage8Title', goal: 'stage8Goal', hints: { keys: ['stage8Hint1', 'stage8Hint2'], highlight: 'goal' }, grid: ['##.G', '#..#', 'S.##'], startDir: 'E', maxBlocks: 7, starBlocks: 7, solution: [repeat(2, 'forward', 'turnLeft', 'forward', 'turnRight'), { id: 'last-forward', type: 'forward' }] },
]

// T21 전이 보너스: 정규 완주 뒤 선택하는 잠정 구성입니다.
export const bonusStages: Stage[] = [
  { id: 'b1', world: 'train', title: 'bonus1Title', goal: 'bonus1Goal', hints: { keys: ['bonus1Hint1', 'bonus1Hint2'], highlight: 'path' }, grid: ['####G', '##...', 'S..##'], startDir: 'E', maxBlocks: 7, starBlocks: 6, solution: [repeat(2, 'forward', 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: 'b2', world: 'handheld', title: 'bonus2Title', goal: 'bonus2Goal', hints: { keys: ['bonus2Hint1', 'bonus2Hint2'], highlight: 'path' }, grid: ['###G', '###.', '##..', '##.#', 'S..#'], startDir: 'E', maxBlocks: 8, starBlocks: 7, solution: [{ id: 'first-forward', type: 'forward' }, repeat(2, 'forward', 'turnLeft', 'forward', 'forward', 'turnRight')] },
]
// T38 [제안·잠정]: 조건 단원 첫 퍼즐.
export const unit2Stages: Stage[] = [{
  id: 'u2-1', world: 'sketchbook', title: 'u21Title', goal: 'u21Goal',
  hints: { keys: ['u21Hint1', 'u21Hint2'], highlight: 'walls' },
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
  { id: 'u2-2', world: 'sketchbook', title: 'u22Title', goal: 'u22Goal', hints: { keys: ['u22Hint1', 'u22Hint2'], highlight: 'walls' },
    grid: ['##G#', '##.#', 'S..#'], variants: [['##G#', '##.#', 'S..#'], ['#G##', '#.##', '#.##', 'S.##']],
    startDir: 'E', maxBlocks: 6, starBlocks: 4, solution: [conditionalLoop('u22', 4, 'turnLeft')] },
  { id: 'u2-3', world: 'train', title: 'u23Title', goal: 'u23Goal', hints: { keys: ['u23Hint1', 'u23Hint2'], highlight: 'walls' },
    grid: ['S..#', '##.#', '#G.#'], variants: [['S..#', '##.#', '#G.#'], ['S.#', '#.#', '#.#', 'G.#']],
    startDir: 'E', maxBlocks: 6, starBlocks: 4, solution: [conditionalLoop('u23', 5, 'turnRight')] },
  { id: 'u2-4', world: 'handheld', title: 'u24Title', goal: 'u24Goal', hints: { keys: ['u24Hint1', 'u24Hint2'], highlight: 'start' },
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
    title: id.replace('-', '') + 'Title', goal: id.replace('-', '') + 'Goal', hints: { keys: [id.replace('-', '') + 'Hint1', id.replace('-', '') + 'Hint2'], highlight },
    maxBlocks: 4, starBlocks: 4, solution: [{ id: id + '-repeat', type: 'repeat', count, body: [{ id: id + '-if', type: 'if', condition: 'blockedAhead', body: [{ id: id + '-turn', type: turn }], else: [{ id: id + '-forward', type: 'forward' }] }] }],
  })
}
const whileForward = (id: string): Block => ({ id, type: 'while', condition: 'clearAhead', body: [{ id: id + '-f', type: 'forward' }] })
export const unit3Stages: Stage[] = [
  { id: 'u3-1', world: 'sketchbook', title: 'u31Title', goal: 'u31Goal', hints: { keys: ['u31Hint1', 'u31Hint2'], highlight: 'walls' }, grid: ['S..#', '##G#'], variants: [['S..#', '##G#'], ['S....#', '####G#']], startDir: 'E', maxBlocks: 5, starBlocks: 4, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'while'], solution: [whileForward('u31-w'), { id: 'u31-r', type: 'turnRight' }, { id: 'u31-f', type: 'forward' }] },
  { id: 'u3-2', world: 'train', title: 'u32Title', goal: 'u32Goal', hints: { keys: ['u32Hint1', 'u32Hint2'], highlight: 'path' }, grid: ['S..#', '##.#', 'G..#'], variants: [['S..#', '##.#', 'G..#'], ['S.#', '#.#', '#.#', '#.#', 'G.#']], startDir: 'E', maxBlocks: 5, starBlocks: 4, palette: ['forward', 'turnLeft', 'turnRight', 'repeat', 'while'], solution: [{ id: 'u32-repeat', type: 'repeat', count: 3, body: [whileForward('u32-w'), { id: 'u32-r', type: 'turnRight' }] }] },
  { id: 'u3-3', world: 'handheld', title: 'u33Title', goal: 'u33Goal', hints: { keys: ['u33Hint1', 'u33Hint2'], highlight: 'start' }, grid: ['S...G'], variants: [['S...G'], ['S......G']], startDir: 'E', maxBlocks: 3, starBlocks: 2, palette: ['forward', 'turnLeft', 'turnRight', 'while'], initialProgram: [{ id: 'u33-initial', type: 'while', condition: 'clearAhead', body: [{ id: 'u33-l', type: 'turnLeft' }, { id: 'u33-r', type: 'turnRight' }] }], solution: [whileForward('u33-w')] },
]
export const allStages = [...stages, ...bonusStages, ...unit2Stages, ...unit3Stages]
export const isLastStage = (index: number) => index === stages.length - 1 || index === stages.length + bonusStages.length - 1 || index === stages.length + bonusStages.length + unit2Stages.length - 1 || index === allStages.length - 1
