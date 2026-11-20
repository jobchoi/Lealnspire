import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { stages } from '../stages'
import { Board } from './Board'

describe('지도', () => {
  it('벽, 도착 지점과 지정한 로봇 방향을 렌더링한다', () => {
    const html = renderToString(<Board stage={stages[1]} position={{ x: 2, y: 1 }} direction="N" />)
    expect(html).toContain('board-wall')
    expect(html).toContain('board-goal')
    expect(html).toContain('로봇 북쪽 방향')
    expect(html).toContain('▲')
    expect(html).toContain('★')
  })
})
