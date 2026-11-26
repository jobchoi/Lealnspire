import glossary from '../../i18n/glossary.json'
import { createElement } from 'react'
import { defaultTheme, type Theme } from './defaultTheme'
import { Symbol } from './Symbols'
import { t } from '../../i18n/I18n'
import './sketchbook.css'
export const sketchbook: Theme = {
  ...defaultTheme, world: 'sketchbook',
  blockSymbol: type => createElement(Symbol, { name: type, world: 'sketchbook' }),
  repeat: defaultTheme.repeat,
  runText: () => t('themes.sketchbook.run'),
  paletteName: type => type === 'forEach' ? glossary.list.keyword : type === 'repeat' ? defaultTheme.paletteName!(type) : t(`themes.sketchbook.${type}`),
}
