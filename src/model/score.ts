import type { RunResult } from './types'

// 잠정 별 평가: 반복 몸체를 포함한 프로그램 전체 블록 수 기준.

export class Score {
  static score(result: RunResult['result'], blocks: number, starBlocks: number): number {
    if (result !== 'success') return 0
    return blocks <= starBlocks ? 3 : blocks <= starBlocks + 2 ? 2 : 1
  }
}
export const score = Score.score
