import type { Block, Program, Stage } from '../engine/types'

const program = (...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Program =>
  types.map((type, index) => ({ id: `block-${index}`, type }))
const repeat = (count: number, ...types: Array<'forward' | 'turnLeft' | 'turnRight'>): Block =>
  ({ id: 'repeat', type: 'repeat', count, body: program(...types) })

// 스테이지 구성과 6~8의 블록 제한은 커리큘럼 초안을 따른 잠정안입니다.
export const stages: Stage[] = [
  { id: '1', title: '첫걸음', goal: '앞으로 두 칸 이동해요.', hint: '앞으로 블록을 두 번 놓아 보세요.', grid: ['S.G'], startDir: 'E', starBlocks: 2, solution: program('forward', 'forward') },
  { id: '2', title: '방향 바꾸기', goal: '오른쪽으로 돌아 도착해요.', hint: '두 칸 이동한 뒤 오른쪽으로 돌아요.', grid: ['S..', '##G'], startDir: 'E', starBlocks: 4, solution: program('forward', 'forward', 'turnRight', 'forward') },
  { id: '3', title: '지그재그', goal: '벽을 피해 도착해요.', hint: '돌아야 하는 순서를 살펴보세요.', grid: ['S.#', '#..', '##G'], startDir: 'E', starBlocks: 7, solution: program('forward', 'turnRight', 'forward', 'turnLeft', 'forward', 'turnRight', 'forward') },
  { id: '4', title: '틀린 명령 고치기', goal: '명령 하나를 고쳐 도착해요.', hint: '회전 방향을 확인해 보세요.', grid: ['S.', '#G'], startDir: 'E', starBlocks: 3, initialProgram: program('forward', 'turnLeft', 'forward'), solution: program('forward', 'turnRight', 'forward') },
  { id: '5', title: '반복하기', goal: '반복으로 여섯 칸 이동해요.', hint: '앞으로 블록을 여섯 번 반복해요.', grid: ['S.....G'], startDir: 'E', maxBlocks: 2, starBlocks: 2, solution: [repeat(6, 'forward')] },
  { id: '6', title: '계단 오르기', goal: '반복으로 계단을 올라가요.', hint: '앞, 왼쪽, 앞, 오른쪽을 반복해요.', grid: ['###G', '##..', '#..#', 'S.##'], startDir: 'E', maxBlocks: 5, starBlocks: 5, solution: [repeat(3, 'forward', 'turnLeft', 'forward', 'turnRight')] },
  { id: '7', title: '세 변 따라가기', goal: '반복으로 사각형의 세 변을 따라가요.', hint: '두 칸 이동하고 오른쪽으로 도는 패턴을 세 번 반복해요.', grid: ['S..', '##.', 'G..'], startDir: 'E', maxBlocks: 4, starBlocks: 4, solution: [repeat(3, 'forward', 'forward', 'turnRight')] },
  { id: '8', title: '반복 미로', goal: '순서와 반복을 섞어 미로를 지나가요.', hint: '계단을 반복한 뒤 한 칸 더 이동해요.', grid: ['##.G', '#..#', 'S.##'], startDir: 'E', maxBlocks: 7, starBlocks: 7, solution: [repeat(2, 'forward', 'turnLeft', 'forward', 'turnRight'), { id: 'last-forward', type: 'forward' }] },
]
