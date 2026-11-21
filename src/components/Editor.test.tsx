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
    expect(html.replaceAll('<!-- -->', '')).toContain('aria-label="1.1.1번 앞으로"')
    expect(html).toContain('aria-label="1.1번 반복 2번"')
    expect(html.replaceAll('<!-- -->', '')).toContain('×2')
    expect(html.replaceAll('<!-- -->', '')).toContain('×3')
    expect(html).toContain(ko.total(3, 10))
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

it('빈 반복 자리와 주황 틀을 렌더링하고 타일에 편집 버튼을 넣지 않는다', () => {
  const html = renderToString(<Editor program={[{ id: 'r', type: 'repeat', count: 2, body: [] }]} onChange={onChange} />)
  expect(html).toContain('class="repeat-frame"')
  expect(html).toContain(ko.emptyRepeat)
  expect(html).toContain('aria-label="1번 반복 2번"')
  expect(html).toContain('aria-pressed="false"')
  expect(html).not.toContain('aria-label="1번 N번 반복 삭제"')
})
it('스테이지 제한이 없어도 10개 상한을 적용한다', () => {
  const ten: Program = Array.from({ length: 10 }, (_, i) => ({ id: String(i), type: 'forward' }))
  for (const maxBlocks of [undefined, 20]) {
    const html = renderToString(<Editor program={ten} maxBlocks={maxBlocks} onChange={onChange} />)
    expect(html).toContain(ko.total(10, 10))
    expect(html.split('aria-label="블록 추가">')[1].split('</div>')[0].match(/disabled=""/g)).toHaveLength(4)
    expect(html.match(/class="filled"/g)).toHaveLength(10)
  }
})
