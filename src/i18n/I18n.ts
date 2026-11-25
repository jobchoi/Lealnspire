import korean from './locales/ko.json'
// Official locales require all Korean keys and matching interpolation arguments.
// Other discovered locale files may remain partial and fall back to Korean.
export const supportedLocales = ['ko', 'en'] as const
export type Locale = typeof supportedLocales[number]
export function isSupportedLocale(value: unknown): value is Locale {
  return supportedLocales.some(locale => locale === value)
}
export function resolveLocale(requested: unknown, saved: unknown): Locale {
  return isSupportedLocale(requested) ? requested : isSupportedLocale(saved) ? saved : 'ko'
}
// Native language names and the bilingual selector label stay readable in either UI.
export const languageControl = { label: '언어 바꾸기 / Change language', names: { ko: '한국어', en: 'English' } }
export type Messages = { [key: string]: string | Messages }
export const locales = import.meta.glob<Messages>('./locales/*.json', { eager: true, import: 'default' })
function lookup(messages: Messages, key: string): string | undefined {
  let value: string | Messages | undefined = messages
  for (const part of key.split('.')) value = typeof value === 'object' ? value[part] : undefined
  return typeof value === 'string' ? value : undefined
}
export class I18n {
  locale: string
  constructor(locale = 'ko') { this.locale = locale }
  t = (key: string, params: Record<string, string | number> = {}): string => {
    const message = lookup(locales[`./locales/${this.locale}.json`] ?? {}, key) ?? lookup(korean, key) ?? key
    return message.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match))
  }
}
export const i18n = new I18n()
export const t = i18n.t
