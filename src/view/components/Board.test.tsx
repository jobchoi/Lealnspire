import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { stages } from '../../model/stages'
import { selectTheme } from '../theme/themes'
import { BlockTiles } from './BlockTiles'
import { t } from '../../i18n/I18n'
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

it('충돌 테두리를 표시한다', () => {
  expect(renderToString(<Board stage={stages[0]} bump />)).toContain('board-bump')
})

it('marks the failure cell and nested command in each world, independently of robot and active command', () => {
  for (const world of ['sketchbook', 'train', 'handheld'] as const) {
    const theme = selectTheme(world, false)
    const html = renderToString(<Board theme={theme} stage={stages[0]} position={{ x: 0, y: 0 }} failurePosition={{ x: 1, y: 0 }} />)
    expect(html).toContain('class="board-failure"')
    expect(html).toContain(t('failureCell'))
    const program = [{ id: 'loop', type: 'repeat' as const, count: 2, body: [{ id: 'inner', type: 'forward' as const }] }]
    const tiles = renderToString(<BlockTiles theme={theme} program={program} selectedId="inner" targetId={null} failedBlockId="inner" locked={false} onSelect={() => {}} />)
    expect(tiles.match(/block-failed/g)).toHaveLength(1)
    expect(tiles).toContain('aria-pressed="true"')
    expect(tiles).toContain(t('failureBlock'))
    expect(tiles).not.toContain('block-active')
    expect(renderToString(<Board theme={theme} stage={stages[0]} />)).not.toContain('board-failure')
  }
})
