import type { ReactElement } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const i = hooks.cursor++; if (hooks.values.length <= i) hooks.values[i] = typeof initial === 'function' ? (initial as () => unknown)() : initial; return [hooks.values[i], (next: unknown) => { hooks.values[i] = next }] },
  useSyncExternalStore: (_s: unknown, get: () => unknown) => get(),
}))
import { FactorySetup, FactoryCode, FactoryControls } from './FactoryPage'
import { FactoryEditorController } from '../../controller/FactoryEditorController'
import { FactoryPlaybackController } from '../../controller/FactoryPlaybackController'
import { factoryUnits } from '../../model/factory/unlocks'
import { t } from '../../i18n/I18n'
type Node = ReactElement<Record<string, unknown>>
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (!value || typeof value !== 'object' || !('props' in value)) return []
  const n = value as Node
  return [n, ...nodes(n.props.children)]
}
const progress = { stages: Object.fromEntries(factoryUnits.flat().map(s => [s.id, { completed: true, bestStars: 0, lastProgram: [] }])) }
beforeEach(() => { hooks.values = []; hooks.cursor = 0 })
it('edits boxes with the actual add, reorder and delete buttons', () => {
  const e = new FactoryEditorController()
  const click = (name: string) => { const b = nodes(FactorySetup({ editor: e })).find(n => n.type === 'button' && n.props['aria-label'] === name)!; expect(b).toBeDefined(); (b.props.onClick as () => void)() }
  click(t('factory.add', { place: t('factory.belt'), shape: '◆' })); click(t('factory.add', { place: t('factory.belt'), shape: '○' }))
  click(t('factory.earlier', { place: t('factory.belt'), index: 2 }))
  expect(e.getSnapshot().input.start.belt.map(b => b.shape)).toEqual(['○', '◆'])
  click(t('factory.removeBox', { place: t('factory.belt'), index: 1, shape: '○' }))
  expect(e.getSnapshot().input.start.belt[0].shape).toBe('◆')
})
it('builds nested code from palette buttons and dispatches run, step, reset, stop', () => {
  vi.useFakeTimers()
  const e = new FactoryEditorController(undefined, progress), p = new FactoryPlaybackController(e)
  const code = () => { hooks.cursor = 0; return nodes(FactoryCode({ editor: e })) }
  const clickCode = (name: string) => { const b = code().find(n => n.type === 'button' && (n.props['aria-label'] === name || n.props.children === name))!; expect(b).toBeDefined(); (b.props.onClick as () => void)() }
  clickCode(t('factory.addBlock', { block: t('factory.repeat') }))
  clickCode(t('factory.body'))
  clickCode(t('factory.addBlock', { block: t('factory.takeBelt') }))
  clickCode(t('factory.addBlock', { block: t('factory.putPile') }))
  const repeat = e.doc.main[0]
  expect(repeat.type === 'repeat' && repeat.body.map(b => b.type)).toEqual(['takeBelt', 'putPile'])
  e.addBox('belt', '◆'); e.addBox('belt', '○')
  const clickControl = (key: string) => { const b = nodes(FactoryControls({ playback: p })).find(n => n.type === 'button' && n.props.children === t(`factory.${key}`))!; (b.props.onClick as () => void)() }
  clickControl('step'); expect(e.getSnapshot().locked).toBe(true)
  clickControl('stop'); expect(e.getSnapshot().locked).toBe(false)
  clickControl('run'); vi.runAllTimers()
  expect(p.getSnapshot().frame?.state.piles.leaf.map(b => b.shape)).toEqual(['◆', '○'])
  clickControl('reset'); expect(p.getSnapshot().frame).toBeNull()
  p.dispose(); vi.useRealTimers()
})
