import { supabase } from '../lib/supabase'

/**
 * Para se një pagesë të regjistrohet, lexon gjendjen E FUNDIT të faturës nga
 * Supabase (jo kopjen lokale, që mund të jetë e vjetër nëse një përdorues tjetër
 * ka regjistruar pagesë në një pajisje tjetër). Kthen:
 *   { ok: true,  paidAmount }                        — mund të vazhdojë
 *   { ok: false, message, invoice, payments }        — faturë tashmë e paguar / shuma e tejkalon
 * Nëse Supabase s'është i arritshëm, lejon vazhdimin (fail-open) që puna offline të mos bllokohet.
 */
export async function checkInvoiceFresh(invoiceId, amount) {
  if (!supabase) return { ok: true }
  try {
    const [invRes, payRes] = await Promise.all([
      supabase.from('invoices').select('data').eq('id', invoiceId).maybeSingle(),
      supabase.from('payments').select('data').filter('data->>invoiceId', 'eq', invoiceId),
    ])
    if (invRes.error || !invRes.data) return { ok: true }
    const invoice  = invRes.data.data
    const payments = (payRes.data || []).map(r => r.data)
    const paid  = invoice.paidAmount || 0
    const total = invoice.amount || 0
    if (invoice.status === 'paid' || paid + amount > total + 0.005) {
      const left = Math.max(0, Math.round((total - paid) * 100) / 100)
      return {
        ok: false,
        invoice,
        payments,
        message: invoice.status === 'paid' || left === 0
          ? 'Kjo faturë u pagua tashmë nga një përdorues tjetër. Faqja u rifreskua — pagesa NUK u regjistrua përsëri.'
          : `Kjo faturë ka marrë pagesë nga një përdorues tjetër. Mbetet vetëm €${left.toFixed(2)} për t'u paguar. Faqja u rifreskua.`,
      }
    }
    return { ok: true, paidAmount: paid }
  } catch (e) {
    console.warn('[checkInvoiceFresh] failed, continuing offline-safe:', e)
    return { ok: true }
  }
}
