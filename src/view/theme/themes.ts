import type { Stage } from '../../model/types'
import { sketchbook } from './sketchbook'
import { train } from './train'
import { handheld } from './handheld'
export const worlds = ['sketchbook', 'train', 'handheld'] as const
export const themes = { sketchbook, train, handheld }
export function selectTheme(world: Stage['world'], completed: boolean, requested?: Stage['world']) {
  return themes[completed && requested ? requested : world]
}
