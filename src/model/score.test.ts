import { describe, expect, it } from 'vitest'
import { score } from './score'

describe('잠정 별 평가', () => {
  it('성공 시 두 경계값을 포함해 별을 평가한다', () => {
    expect([2, 3, 4, 5, 6].map(n => score('success', n, 3))).toEqual([3, 3, 2, 2, 1])
  })
  it('모든 실패 결과는 별이 없다', () => {
    for (const result of ['collision', 'unfinished', 'stepLimit'] as const) expect(score(result, 1, 3)).toBe(0)
  })
})
