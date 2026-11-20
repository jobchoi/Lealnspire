import { describe, expect, it } from 'vitest'
import { isLastFrame, nextFrameIndex } from './playback'

describe('프레임 진행', () => {
  it('초기 프레임에서 하나씩 진행하고 마지막을 넘지 않는다', () => {
    let index = 0
    expect(isLastFrame(index, 3)).toBe(false)
    index = nextFrameIndex(index, 3)
    expect(index).toBe(1)
    expect(isLastFrame(index, 3)).toBe(false)
    index = nextFrameIndex(index, 3)
    expect(isLastFrame(index, 3)).toBe(true)
    expect(nextFrameIndex(index, 3)).toBe(2)
  })
  it('명령 프레임이 없는 실행과 빈 목록을 처리한다', () => {
    expect(isLastFrame(0, 1)).toBe(true)
    expect(nextFrameIndex(0, 1)).toBe(0)
    expect(isLastFrame(0, 0)).toBe(false)
    expect(nextFrameIndex(0, 0)).toBe(0)
  })
})
