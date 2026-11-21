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
export const allStages = [...stages, ...bonusStages]
export const isLastStage = (index: number) => index === stages.length - 1 || index === allStages.length - 1
