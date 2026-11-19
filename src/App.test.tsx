import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('프로젝트 제목을 렌더링한다', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Lealnspire')
  })
})
