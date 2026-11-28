import { t } from '../../i18n/I18n'
export function CompletionStamp() {
  return <span className="completion-stamp"><svg viewBox="0 0 64 64" width="36" height="36" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M19 24h25v20H19zM31 17v7M16 30h3m25 0h4" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="26" cy="31" r="2" fill="currentColor" /><circle cx="37" cy="31" r="2" fill="currentColor" /><path d="m25 39 5 5 12-12" fill="none" stroke="currentColor" strokeWidth="4" /></svg><span>{t('stamp.done')}</span></span>
}
