import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DemoModal } from './DemoModal'
import { selectTheme, worlds } from '../theme/themes'
import { i18n } from '../../i18n/I18n'
it('renders one labelled dialog, decorative scene and all controls in ko/en and three worlds', () => {
  try {
    for (const locale of ['ko', 'en']) for (const world of worlds) {
      i18n.locale = locale
      const html = renderToStaticMarkup(<DemoModal theme={selectTheme(world, false)} onClose={() => {}} onSeen={() => {}} />)
      expect(html.match(/role="dialog"/g)).toHaveLength(1)
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('aria-live="polite"')
      expect(html).toContain('aria-hidden="true" inert=""')
      expect(html).toContain(i18n.t('demo.cut0'))
      expect(html).toContain(i18n.t('demo.again'))
      expect(html).toContain(i18n.t('demo.skip'))
    }
  } finally { i18n.locale = 'ko' }
})
