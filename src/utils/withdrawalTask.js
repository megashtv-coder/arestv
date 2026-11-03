/* Detyrat automatike për kontrollin e tërheqjeve krijohen nga WithdrawalFollowUp.jsx me ID "TSK-WD-<id e pagesës>"
   dhe përshkrim me pjesë të ndara me " | ". Këtu: njohja e tyre, ID-ja e pagesës dhe leximi i pjesëve. */
const PREFIX = 'TSK-WD-'

export const isWithdrawalTask = t => String(t?.id || '').startsWith(PREFIX)

export const withdrawalPaymentId = t => (isWithdrawalTask(t) ? String(t.id).slice(PREFIX.length) : null)

// Faqja e editimit të pagesës së pranuar (shih Payments.jsx → "payments:<id>:edit")
export const withdrawalEditPage = t => {
  const id = withdrawalPaymentId(t)
  return id ? `payments:${id}:edit` : null
}

const field = (parts, label) => {
  const p = parts.find(x => x.startsWith(label))
  return p ? p.slice(label.length).trim() : ''
}

export function parseWithdrawalTask(t) {
  const parts = String(t?.description || '').split(' | ').map(s => s.trim()).filter(Boolean)
  const method = field(parts, 'Metoda:')
  const [methodName, where] = method.split('· Dërguar në:').map(s => (s || '').trim())
  return {
    headline: parts.find(p => p.startsWith('🔔')) || '',
    sender: field(parts, 'Dërguar nga:'),
    tracking: field(parts, 'Nr. tërheqjes:'),
    method: methodName || '',
    where: where || '',
    to: field(parts, 'Tek:'),
    payment: parts.find(p => p.startsWith('Pagesa ')) || '',
  }
}

// Një rresht i shkurtër për panele të vogla (dashboard)
export function withdrawalShortText(t) {
  const w = parseWithdrawalTask(t)
  return ['Kontrollo tërheqjen', w.method, w.tracking && w.tracking !== '—' ? `Nr. ${w.tracking}` : '']
    .filter(Boolean).join(' · ')
}
