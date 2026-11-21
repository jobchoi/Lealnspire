import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { selectTheme, themes, worlds } from './themes'
import { ConceptDefs, Symbol, Engine } from './Symbols'
import { isometric } from './isometric'
import { Editor } from '../components/Editor'
import { Board } from '../components/Board'
import { stages } from '../../model/stages'

describe('world presentation', () => {
  it('uses the assigned world and permits overrides only after completion', () => {
    for (const stage of stages) {
      expect(selectTheme(stage.world, false, 'handheld')).toBe(themes[stage.world])
      for (const world of worlds) expect(selectTheme(stage.world, true, world)).toBe(themes[world])
    }
  })
  it('projects grid neighbors onto opposite island diagonals', () => {
    expect(isometric(0, 0, 3)).toEqual({ x: 144, y: 65 })
    expect(isometric(1, 0, 3)).toEqual({ x: 184, y: 85 })
    expect(isometric(0, 1, 3)).toEqual({ x: 104, y: 85 })
  })
  for (const world of worlds) it(`${world} preserves editing names and supplies distinct repeat artwork`, () => {
    const theme = themes[world]
    const html = renderToString(<Editor theme={theme} program={[{ id: 'r', type: 'repeat', count: 3, body: [{ id: 'f', type: 'forward' }] }]} onChange={() => {}} />)
    for (const label of ['앞으로', '왼쪽으로 돌기', '오른쪽으로 돌기', 'N번 반복', '1번 반복 3번', '1.1번 앞으로']) expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain(theme.repeat(3))
    expect(html).toContain('<svg')
    const board = renderToString(<Board theme={theme} stage={stages[1]} />)
    expect(board).toContain('board-wall')
    expect(board).toContain('board-goal')
    expect(board).toContain('board-robot')
  })
})

it('includes all concept symbols with isolated IDs and the original crayon filter', () => {
  const html = renderToString(<ConceptDefs />)
  for (const world of worlds) {
    const symbols = world === 'handheld' ? ['pu', 'pl', 'pr', 'pp'] : ['up', 'left', 'right', 'loop']
    for (const symbol of symbols) expect(html).toContain(`id="${world}-${symbol}"`)
  }
  expect(html).toContain('baseFrequency=".04"')
  expect(html).toContain('scale="3"')
  expect(renderToString(<Symbol name="forward" world="train" />)).toContain('#train-up')
  expect(renderToString(<Symbol name="turnLeft" world="handheld" />)).toContain('#handheld-pl')
  expect(renderToString(<Engine />)).toContain('viewBox="0 0 120 92"')
})
it('draws exactly one island tile per stage cell and reserves margins around the entire map', () => {
  for (const stage of stages) {
    const html = renderToString(<Board stage={stage} theme={themes.train} />)
    expect(html.match(/M0-20 40 0 0 20-40 0Z/g)).toHaveLength(stage.grid.length * stage.grid[0].length)
    expect(html).toContain(`viewBox="0 0 ${(stage.grid.length + stage.grid[0].length)*40+48} ${(stage.grid.length + stage.grid[0].length)*20+120}"`)
    for (let y = 0; y < stage.grid.length; y++) {
      for (let x = 0; x < stage.grid[0].length; x++) {
        const point = isometric(x, y, stage.grid.length)
        expect(html).toContain(`transform="translate(${point.x} ${point.y})"`)
      }
    }
    expect(html).not.toContain('foreignObject')
  }
})
it('renders LCD brick and scanline patterns and the original pixel flag', () => {
  const html = renderToString(<Board stage={stages[6]} theme={themes.handheld} />)
  expect(html).toContain('id="pixel-wall"')
  expect(html).toContain('fill="url(#lcd-scan)"')
  expect(html).toContain('M6 3h1v11H6zM7 3h6v1h-1v1h1v1H7z')
})

it('keeps every enclosing repeat ribbon on nested tiles', () => {
  const html = renderToString(<Editor theme={themes.train} program={[{ id:'outer', type:'repeat', count:2, body:[{ id:'f', type:'forward' }, { id:'inner', type:'repeat', count:3, body:[{ id:'l', type:'turnLeft' }] }, { id:'r', type:'turnRight' }] }]} onChange={() => {}} />)
  expect(html.match(/data-ribbon-depth="1"/g)).toHaveLength(5)
  expect(html.match(/data-ribbon-depth="2"/g)).toHaveLength(2)
})
