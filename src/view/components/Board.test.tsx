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
    expect(html).toContain('로봇은 2번째 줄 3번째 칸에서 북쪽을 봐요.')
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

it('describes initial and moving robot coordinates and the goal in every world', () => {
  for (const world of ['sketchbook', 'train', 'handheld'] as const) {
    const theme = selectTheme(world, false)
    const initial = renderToString(<Board theme={theme} stage={stages[0]} />)
    expect(initial).toContain('로봇은 1번째 줄 1번째 칸에서 동쪽을 봐요. 별은 1번째 줄 3번째 칸.')
    const moved = renderToString(<Board theme={theme} stage={stages[0]} position={{ x: 1, y: 0 }} direction="W" />)
    expect(moved).toContain('로봇은 1번째 줄 2번째 칸에서 서쪽을 봐요. 별은 1번째 줄 3번째 칸.')
  }
})

it('marks each checked side at the robot-relative cell in all worlds', () => {
  const stage = { ...stages[0], grid: ['.#.', '.SG', '...'], startDir: 'E' as const }
  const check: NonNullable<import('../../model/types').Frame['check']> = {
    blockId: 'if', condition: { kind: 'and', left: { kind: 'atom', atom: 'blockedLeft' }, right: { kind: 'atom', atom: 'blockedRight' } }, result: false,
    atoms: [{ atom: 'blockedLeft', value: true, result: true, path: ['left'] }, { atom: 'blockedRight', value: false, result: false, path: ['right'] }],
  }
  for (const world of ['sketchbook', 'train', 'handheld'] as const) {
    const html = renderToString(<Board theme={selectTheme(world, false)} stage={stage} check={check} />)
    expect(html.match(/class="board-sensor"/g)).toHaveLength(2)
    expect(html).toContain('왼쪽이 막힘: 참, 오른쪽이 막힘: 거짓')
    if (world === 'sketchbook') {
      expect(html).toContain('class="board-sensor" transform="translate(80 0)"')
      expect(html).toContain('class="board-sensor" transform="translate(80 160)"')
    }
    if (world === 'handheld') {
      expect(html).toContain('class="board-sensor" transform="translate(16 0)"')
      expect(html).toContain('class="board-sensor" transform="translate(16 32)"')
    }
  }
})
