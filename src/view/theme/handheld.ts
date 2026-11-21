import { createElement } from 'react'
import { defaultTheme, type Theme } from './defaultTheme'
import { Symbol } from './Symbols'
import { t } from '../../i18n/I18n'
import './handheld.css'
export const handheld: Theme = {
  ...defaultTheme, world: 'handheld',
  blockSymbol: type => createElement(Symbol, { name: type, world: 'handheld' }),
  repeat: count => t('themes.handheld.repeat', { count }),
  runText: () => t('themes.handheld.run'),
  paletteName: type => type === 'repeat' ? t('blocks.repeat') : t(`themes.handheld.${type}`),
}
