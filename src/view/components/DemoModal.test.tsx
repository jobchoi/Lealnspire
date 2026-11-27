import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoEntries, demoScene } from '../../controller/DemoController'
import { DemoModal } from './DemoModal'
import { selectTheme, worlds } from '../theme/themes'
import { i18n } from '../../i18n/I18n'
it('renders one labelled dialog, decorative scene and all controls in ko/en and three worlds', () => {
  try {
    for (const locale of ['ko', 'en']) for (const world of worlds) for (const [id] of demoEntries) {
      i18n.locale = locale
      const html = renderToStaticMarkup(<DemoModal demoId={id} theme={selectTheme(world, false)} onClose={() => {}} onSeen={() => {}} />)
      expect(html.match(/role="dialog"/g)).toHaveLength(1)
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('aria-live="polite"')
      expect(html).toContain('aria-hidden="true" inert=""')
      expect(html).toContain(i18n.t(id === 'add-run' ? 'demo.cut0' : `demo.scenes.${id}.0`))
      expect(html).toContain(i18n.t('demo.back'))
      expect(html).toContain(i18n.t('demo.next'))
      const altKey = `demo.scenes.${id}.alt0`
      if (i18n.t(altKey) !== altKey) expect(html).toContain(i18n.t(altKey))
      expect(html).toContain(i18n.t('demo.again'))
      expect(html).toContain(i18n.t('demo.skip'))
    }
  } finally { i18n.locale = 'ko' }
})

it('provides spoken descriptions for every informational cue in both languages', () => {
  const targets = ['list', 'search', 'logic', 'parameter', 'variable', 'return', 'event', 'condition', 'else', 'while']
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      for (const [id] of demoEntries) if (targets.includes(id)) for (let cut = 0; cut < 4; cut++) {
        const key = `demo.scenes.${id}.alt${cut}`
        if (demoScene(id, cut).cue) {
          expect(i18n.t(key), `${locale}/${key}`).not.toBe(key)
          expect(i18n.t(key)).not.toMatch(/[◎▣✓✕⊘]/)
        }
      }
    }
  } finally { i18n.locale = 'ko' }
})
