import { describe, expect, it } from 'vitest'
import { I18n, locales, resolveLocale, type Messages } from './I18n'
import korean from './locales/ko.json'
function keys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => typeof value === 'string' ? [prefix + key] : keys(value, prefix + key + '.'))
}
describe('language resources', () => {
  it('interpolates, falls back per key, displays unknown keys and discovers files', () => {
    const en = new I18n('en')
    expect(en.t('start')).toBe('Start')
    expect(en.t('hint')).toBe('Hint')
    expect(en.t('stars', { count: 2 })).toBe('2 stars')
    expect(en.t('missing')).toBe('missing')
    expect(new I18n('unknown').t('stars', { count: 2 })).toBe('별 2개')
    expect(new I18n('unknown').t('start')).toBe(korean.start)
    expect(en.t('action', { order: '1.2', name: 'A', action: 'B' })).toBe('Block 1.2 A: B')
  })
  it('selects a supported URL language before saved settings and the Korean default', () => {
    expect(resolveLocale('en', 'ko')).toBe('en')
    expect(resolveLocale('ko', 'en')).toBe('ko')
    expect(resolveLocale(null, 'en')).toBe('en')
    expect(resolveLocale('invalid', 'en')).toBe('en')
    expect(resolveLocale(null, 'invalid')).toBe('ko')
  })
  it('all locale keys are a subset of Korean keys', () => {
    const base = new Set(keys(korean))
    for (const messages of Object.values(locales)) for (const key of keys(messages)) expect(base.has(key), key).toBe(true)
  })
  it('keeps Korean literals out of production TSX and platform dependencies out of model/controllers', () => {
    const views = import.meta.glob('../view/**/*.tsx', { query: '?raw', eager: true, import: 'default' })
    for (const [path, source] of Object.entries(views)) {
      if (path.includes('.test.')) continue
      expect(source, path).not.toMatch(/[가-힣]/)
    }
    const logic = import.meta.glob(['../model/**/*.ts', '../controller/**/*.ts'], { query: '?raw', eager: true, import: 'default' })
    for (const [path, source] of Object.entries(logic)) {
      if (path.includes('.test.')) continue
      expect(source, path).not.toMatch(/\b(?:react|react-dom|document|window|localStorage)\b/)
    }
  })
})
