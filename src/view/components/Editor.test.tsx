import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Editor } from './Editor'
import { GameController } from '../../controller/GameController'
import { ProgressRepository } from '../../model/ProgressRepository'
import { stages } from '../../model/stages'
import type { Program } from '../../model/types'
import { EditorController } from '../../controller/EditorController'
import { i18n, t } from '../../i18n/I18n'

const program: Program = [{ id: 'a', type: 'repeat', count: 3, body: [{ id: 'b', type: 'repeat', count: 2, body: [{ id: 'c', type: 'forward' }] }] }]
const onChange = () => {}
describe('Editor', () => {
  it('renders nested order, repeat counts and accessible editing controls', () => {
    const html = renderToString(<Editor program={program} onChange={onChange} />)
    expect(html.replaceAll('<!-- -->', '')).toContain('aria-label="1.1.1번 앞으로"')
    expect(html).toContain('aria-label="1.1번 반복 2번"')
    expect(html.replaceAll('<!-- -->', '')).toContain('×2')
    expect(html.replaceAll('<!-- -->', '')).toContain('×3')
    expect(html).toContain(t('total', { count: 3, max: 10 }))
    expect(html).not.toContain(t('limit'))
    expect(html).not.toContain('value="11"')
  })
  it('disables all palette buttons at or beyond the limit', () => {
    for (const maxBlocks of [2, 3]) {
      const html = renderToString(<Editor program={program} onChange={onChange} maxBlocks={maxBlocks} />)
      const palette = html.split('aria-label="블록 추가">')[1].split('</div>')[0]
      expect(palette.match(/disabled=""/g)).toHaveLength(4)
      expect(html).toContain(t('total', { count: 3, max: maxBlocks }))
      expect(html).toContain(t('limit'))
    }
  })
  it('offers additions below the limit and explains an empty workspace', () => {
    const html = renderToString(<Editor program={[]} onChange={onChange} maxBlocks={4} />)
    expect(html).toContain(t('empty'))
    const palette = html.split('aria-label="블록 추가">')[1].split('</div>')[0]
    expect(palette).not.toContain('disabled=""')
    expect(html.match(/<button[^>]*aria-label="되돌리기"[^>]*>/)?.[0]).toContain('disabled=""')
    expect(html).toContain(t('root'))
  })
})

describe('재생 중 편집기', () => {
  it('중첩된 현재 블록만 강조하고 모든 편집 컨트롤을 잠근다', () => {
    const html = renderToString(<Editor program={program} onChange={onChange} locked activeBlockId="c" />)
    expect(html.match(/block-active/g)).toHaveLength(1)
    expect(html).toContain('aria-current="step"')
    for (const control of html.match(/<(?:button|select)\b[^>]*>/g) ?? []) expect(control).toContain('disabled=""')
  })
})

it('빈 반복 자리와 주황 틀을 렌더링하고 타일에 편집 버튼을 넣지 않는다', () => {
  const html = renderToString(<Editor program={[{ id: 'r', type: 'repeat', count: 2, body: [] }]} onChange={onChange} />)
  expect(html).toContain('class="repeat-frame"')
  expect(html).toContain(t('emptyRepeat'))
  expect(html).toContain('aria-label="1번 반복 2번"')
  expect(html).toContain('aria-pressed="false"')
  expect(html).not.toContain('aria-label="1번 N번 반복 삭제"')
})
it('스테이지 제한이 없어도 10개 상한을 적용한다', () => {
  const ten: Program = Array.from({ length: 10 }, (_, i) => ({ id: String(i), type: 'forward' }))
  for (const maxBlocks of [undefined, 20]) {
    const html = renderToString(<Editor program={ten} maxBlocks={maxBlocks} onChange={onChange} />)
    expect(html).toContain(t('total', { count: 10, max: 10 }))
    expect(html.split('aria-label="블록 추가">')[1].split('</div>')[0].match(/disabled=""/g)).toHaveLength(4)
    expect(html.match(/class="filled"/g)).toHaveLength(10)
  }
})


it('enables undo only with history and disables it during playback or after consuming history', () => {
  const game = new GameController(stages[0], new ProgressRepository())
  const undoTag = (locked = game.locked) => renderToString(<Editor controller={game.editor} program={game.getSnapshot().program} onChange={game.edit} locked={locked} />).match(/<button[^>]*aria-label="되돌리기"[^>]*>/)?.[0]
  expect(undoTag()).toContain('disabled=""')
  game.edit(stages[0].solution)
  expect(undoTag()).not.toContain('disabled=""')
  game.step()
  expect(undoTag()).toContain('disabled=""')
  game.reset(); game.undo()
  expect(undoTag()).toContain('disabled=""')
})

it('describes the insertion target using its block type in both languages', () => {
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      for (const type of ['repeat', 'if'] as const) {
        const controller = new EditorController()
        const code: Program = [type === 'if' ? { id: 'target', type, condition: 'blockedAhead', body: [] } : { id: 'target', type, count: 2, body: [] }]
        controller.configure(code, onChange, false)
        controller.select('target'); controller.toggleTarget()
        const html = renderToString(<Editor program={code} onChange={onChange} controller={controller} />)
        expect(html).toContain(t(type === 'if' ? 'targetIf' : 'target', { order: 1 }))
      }
    }
  } finally { i18n.locale = previous }
})

it('edits the else branch separately and removes its subtree without mutating the previous program', () => {
  const controller = new EditorController()
  let tree: Program = [{ id: 'choose', type: 'if', condition: 'blockedAhead', body: [] }]
  controller.configure(tree, next => { tree = next }, false)
  controller.select('choose')
  controller.toggleElse()
  controller.toggleTarget(true)
  controller.add('forward')
  expect(controller.total).toBe(2)
  const alternative = tree[0].type === 'if' ? tree[0].else! : []
  controller.select(alternative[0].id)
  expect(controller.selectedPath).toEqual([0, -1, 0])
  controller.remove()
  expect(controller.total).toBe(1)
  expect(alternative).toHaveLength(1)
  controller.select('choose')
  const html = renderToString(<Editor conditions program={tree} onChange={() => {}} controller={controller} />)
  expect(html).toContain('else 빼기')
  expect(html).toContain('else 안에 넣기')
  expect(html).toContain('else-branches')
})

it('numbers else tiles after the if branch and names branches in both languages', () => {
  const code: Program = [{ id: 'r', type: 'repeat', count: 3, body: [{ id: 'i', type: 'if', condition: 'blockedAhead', body: [{ id: 'right', type: 'turnRight' }], else: [{ id: 'f', type: 'forward' }] }] }]
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      const controller = new EditorController()
      controller.configure(code, onChange, false)
      controller.select('f')
      const html = renderToString(<Editor conditions program={code} controller={controller} onChange={onChange} />)
      expect(html).toContain(locale === 'ko' ? 'aria-label="1.1.2번 앞으로 (else)"' : 'aria-label="Block 1.1.2: Move forward (else)"')
      expect(html).not.toContain('1.1.0.1')
      expect(html).toContain(t('action', { order: '1.1.2', name: locale === 'ko' ? '앞으로' : 'Move forward', action: t('before') }))
    }
  } finally { i18n.locale = previous }
})

it('renders the stage palette and while check cycle in all themes and both languages', async () => {
  const { unit3Stages } = await import('../../model/stages')
  const { themes } = await import('../theme/themes')
  const { BlockTiles } = await import('./BlockTiles')
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      for (const stage of unit3Stages) {
        const html = renderToString(<Editor theme={themes[stage.world]} program={stage.solution} onChange={onChange} palette={stage.palette} />)
        expect(html).toContain(`aria-label="${t('blocks.while')}"`)
        expect(html).not.toContain(`aria-label="${t('blocks.if')}"`)
        if (stage.id === 'u3-3') expect(html).not.toContain(`aria-label="${t('blocks.repeat')}"`)
        expect(html).toContain('while-frame')
        expect(html).toContain(t('recheck'))
      }
      const html = renderToString(<BlockTiles program={[{ id: 'w', type: 'while', condition: 'clearAhead', body: [] }]} selectedId={null} targetId={null} loops={[{ blockId: 'w', iteration: 3 }]} locked={false} onSelect={onChange} />)
      expect(html).toContain(`aria-label="${t('whileIteration', { iteration: 3 })}"`)
      expect(html).not.toContain('3/undefined')
    }
  } finally { i18n.locale = previous }
})
