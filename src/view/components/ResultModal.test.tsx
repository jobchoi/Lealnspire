import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ResultModal } from './ResultModal'
import { t } from '../../i18n/I18n'

const noop = () => {}
describe('결과 모달', () => {
  it('성공 결과와 별, 다시 하기와 닫기 버튼을 렌더링한다', () => {
    const html = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="result-title"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain(t('success'))
    expect(html).toContain(t('stars', { count: 3 }))
    expect(html).toContain(t('retry'))
    expect(html).toContain(t('close'))
  })
  it('각 실패 이유를 표시한다', () => {
    for (const result of ['collision', 'unfinished', 'stepLimit'] as const) {
      const html = renderToString(<ResultModal result={result} stars={0} onRetry={noop} onClose={noop} />)
      expect(html).toContain(t(`failures.${result}`))
      expect(html).not.toContain('★')
    }
  })
})

 it('성공 시 다음 이동과 마지막 스테이지의 완주 안내를 표시한다', () => {
   const normal = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} onNext={noop} />)
   expect(normal).toContain(t('nextStage'))
   expect(normal).not.toContain(t('congratulations'))
   const last = renderToString(<ResultModal result="success" stars={3} onRetry={noop} onClose={noop} onNext={noop} lastStage />)
   expect(last).toContain(t('toList'))
   expect(last).toContain(t('congratulations'))
   const failed = renderToString(<ResultModal result="collision" stars={0} onRetry={noop} onClose={noop} onNext={noop} lastStage />)
   expect(failed).not.toContain(t('toList'))
   expect(failed).not.toContain(t('congratulations'))
 })

it('offers fix for every failure and never for success', () => {
  for (const result of ['collision', 'unfinished', 'stepLimit', 'success'] as const) {
    const html = renderToString(<ResultModal result={result} stars={0} onFix={noop} onRetry={noop} onClose={noop} />)
    expect(html.includes('aria-label="' + t('fix') + '"')).toBe(result !== 'success')
  }
})
