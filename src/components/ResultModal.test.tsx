import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ResultModal } from './ResultModal'
import { ko } from '../i18n/ko'

const noop = () => {}
describe('결과 모달', () => {
  it('성공 결과와 별, 다시 하기와 닫기 버튼을 렌더링한다', () => {
    const html = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="result-title"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain(ko.success)
    expect(html).toContain(ko.stars(3))
    expect(html).toContain(ko.retry)
    expect(html).toContain(ko.close)
  })
  it('각 실패 이유를 표시한다', () => {
    for (const result of ['collision', 'unfinished', 'stepLimit'] as const) {
      const html = renderToString(<ResultModal result={result} stars={0} onRetry={noop} onClose={noop} />)
      expect(html).toContain(ko.failures[result])
      expect(html).not.toContain('★')
    }
  })
})

 it('성공 시 다음 이동과 마지막 스테이지의 완주 안내를 표시한다', () => {
   const normal = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} onNext={noop} />)
   expect(normal).toContain(ko.nextStage)
   expect(normal).not.toContain(ko.congratulations)
   const last = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} onNext={noop} lastStage />)
   expect(last).toContain(ko.toList)
   expect(last).toContain(ko.congratulations)
   const failed = renderToString(<ResultModal result="collision" stars={0} onRetry={noop} onClose={noop} onNext={noop} lastStage />)
   expect(failed).not.toContain(ko.toList)
   expect(failed).not.toContain(ko.congratulations)
 })
