import type { ReactNode } from 'react'
import type { Block, Dir } from '../../model/types'
import { t } from '../../i18n/I18n'
export interface Theme {
  world?: 'sketchbook' | 'train' | 'handheld'
  runText?: () => string
  paletteName?: (type: Block['type']) => string
  blockTypes: Block['type'][]
  blockSymbol(type: Block['type']): ReactNode
  blockName(type: Block['type']): string
  blockClass(type: Block['type']): string
  repeat(count: number): string
  buttonLabel(key: string): string
  arrow(direction: Dir): string
}
export const defaultTheme: Theme = {
  blockTypes: ['forward', 'turnLeft', 'turnRight', 'repeat'],
  blockSymbol: type => t(`icons.${type}`),
  blockName: type => t(`blocks.${type}`),
  blockClass: type => `block-${type}`,
  repeat: count => `×${count}`,
  buttonLabel: key => t(key),
  arrow: direction => ({ N: '▲', E: '▶', S: '▼', W: '◀' })[direction],
}
