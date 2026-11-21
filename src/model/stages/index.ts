import type { Block, Program, Stage } from '../types'

const program = (...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Program =>
  types.map((type, index) => ({ id: `block-${index}`, type }))
const repeat = (count: number, ...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Block =>
  ({ id: 'repeat', type: 'repeat', count, body: program(...types) })

// 스테이지 구성과 6~8의 블록 제한은 커리큘럼 초안을 따른 잠정안입니다.
export const stages: Stage[] = [
  { id: '1', world: 'sketchbook', title: 'stage1Title', goal: 'stage1Goal', hint: 'stage1Hint', grid: ['S.G'], startDir: 'E', starBlocks: 2, solution: program('forward', 'forward') },
  { id: '2', world: 'sketchbook', title: 'stage2Title', goal: 'stage2Goal', hint: 'stage2Hint', grid: ['S..', '##G'], startDir: 'E', starBlocks: 4, solution: program('forward', 'forward', 'turnRight', 'forward') },
  { id: '3', world: 'sketchbook', title: 'stage3Title', goal: 'stage3Goal', hint: 'stage3Hint', grid: ['S.#', '#..', '##G'], startDir: 'E', starBlocks: 7, solution: program('forward', 'turnRight', 'forward', 'turnLeft', 'forward', 'turnRight', 'forward') },
  { id: '4', world: 'train', title: 'stage4Title', goal: 'stage4Goal', hint: 'stage4Hint', grid: ['S.', '#G'], startDir: 'E', starBlocks: 3, initialProgram: program('forward', 'turnLeft', 'forward'), solution: program('forward', 'turnRight', 'forward') },
  { id: '5', world: 'train', title: 'stage5Title', goal: 'stage5Goal', hint: 'stage5Hint', grid: ['S.....G'], startDir: 'E', maxBlocks: 2, starBlocks: 2, solution: [repeat(6, 'forward')] },
  { id: '6', world: 'train', title: 'stage6Title', goal: 'stage6Goal', hint: 'stage6Hint', grid: ['###G', '##..', '#..#', 'S.##'], startDir: 'E', maxBlocks: 5, starBlocks: 5, solution: [repeat(3, 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: '7', world: 'handheld', title: 'stage7Title', goal: 'stage7Goal', hint: 'stage7Hint', grid: ['S..', '##.', 'G..'], startDir: 'E', maxBlocks: 4, starBlocks: 4, solution: [repeat(3, 'forward', 'forward', 'turnRight')] },
  { id: '8', world: 'handheld', title: 'stage8Title', goal: 'stage8Goal', hint: 'stage8Hint', grid: ['##.G', '#..#', 'S.##'], startDir: 'E', maxBlocks: 7, starBlocks: 7, solution: [repeat(2, 'forward', 'turnLeft', 'forward', 'turnRight'), { id: 'last-forward', type: 'forward' }] },
]
