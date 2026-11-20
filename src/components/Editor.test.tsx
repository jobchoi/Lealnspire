import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Editor } from './Editor'
import type { Program } from '../engine/types'
import { ko } from '../i18n/ko'

const program: Program = [{ id: 'a', type: 'repeat', count: 3, body: [{ id: 'b', type: 'repeat', count: 2, body: [{ id: 'c', type: 'forward' }] }] }]
const onChange = () => {}
describe('Editor', () => {
  it('renders nested order, repeat counts and accessible editing controls', () => {
    const html = renderToString(<Editor program={program} onChange={onChange} />)
    expect(html.replaceAll('<!-- -->', '')).toContain('1.1.1. 앞으로')
    expect(html).toContain('1.1번 N번 반복 반복 횟수')
    expect(html.replaceAll('<!-- -->', '')).toContain('×2')
    expect(html.replaceAll('<!-- -->', '')).toContain('×3')
    expect(html).toContain(ko.total(3))
    expect(html).not.toContain(ko.limit)
    expect(html).not.toContain('value="11"')
  })
  it('disables all palette buttons at or beyond the limit', () => {
    for (const maxBlocks of [2, 3]) {
      const html = renderToString(<Editor program={program} onChange={onChange} maxBlocks={maxBlocks} />)
      const palette = html.split('aria-label="블록 추가">')[1].split('</div>')[0]
      expect(palette.match(/disabled=""/g)).toHaveLength(4)
      expect(html).toContain(ko.total(3, maxBlocks))
      expect(html).toContain(ko.limit)
    }
  })
  it('offers additions below the limit and explains an empty workspace', () => {
    const html = renderToString(<Editor program={[]} onChange={onChange} maxBlocks={4} />)
    expect(html).toContain(ko.empty)
    expect(html).not.toContain('disabled=""')
    expect(html).toContain(ko.root)
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

it('반복 횟수의 경계에서 해당 버튼만 비활성화하고 아이콘 이름을 유지한다', () => {
  for (const count of [2, 3, 10]) {
    const html = renderToString(<Editor program={[{ id: 'r', type: 'repeat', count, body: [] }]} onChange={onChange} />)
    for (const [action, disabled] of [[ko.decrease, count === 2], [ko.increase, count === 10]] as const) {
      const button = (html.match(/<button[^>]*>/g) ?? []).find(tag => tag.includes(`aria-label="${ko.action('1', ko.blocks.repeat, action)}"`))
      expect(button).toBeDefined()
      expect(button!.includes('disabled=""')).toBe(disabled)
    }
    for (const type of ['forward', 'turnLeft', 'turnRight', 'repeat'] as const) {
      expect(html).toContain(`aria-label="${ko.blocks[type]}"`)
      expect(html).toContain(`title="${ko.blocks[type]}"`)
      expect(html).toContain(ko.icons[type])
    }
  }
})
