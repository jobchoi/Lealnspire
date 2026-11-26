import glossary from '../../i18n/glossary.json'
import { createElement } from 'react'
import { defaultTheme, type Theme } from './defaultTheme'
import { Symbol } from './Symbols'
import { t } from '../../i18n/I18n'
import './train.css'
export const train: Theme = {
  ...defaultTheme, world: 'train',
  blockSymbol: type => createElement(Symbol, { name: type, world: 'train' }),
  repeat: defaultTheme.repeat,
  runText: () => t('themes.train.run'),
  paletteName: type => type === 'forEach' ? glossary.list.keyword : type === 'repeat' ? defaultTheme.paletteName!(type) : t(`themes.train.${type}`),
}
