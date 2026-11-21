import { createElement } from 'react'
import { defaultTheme, type Theme } from './defaultTheme'
import { Symbol } from './Symbols'
import { t } from '../../i18n/I18n'
import './train.css'
export const train: Theme = {
  ...defaultTheme, world: 'train',
  blockSymbol: type => createElement(Symbol, { name: type, world: 'train' }),
  repeat: count => t('themes.train.repeat', { count }),
  runText: () => t('themes.train.run'),
  paletteName: type => type === 'repeat' ? t('blocks.repeat') : t(`themes.train.${type}`),
}
