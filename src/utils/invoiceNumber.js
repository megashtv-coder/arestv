import { supabase as defaultClient } from '../lib/supabase'
import { maxInvoiceNumber } from './invoicePayments'

/**
 * Numri i faturës rezervohet ATOMIKISHT në databazë.
 *
 * Problemi që zgjidh: çdo pajisje e llogariste numrin tjetër nga kopja e saj lokale (max+1), ndaj dy pajisje
 * mund të merrnin të njëjtin numër (p.sh. INV-011701) dhe ruajtja e të dytës e zëvendësonte të parën pa
 * asnjë paralajmërim. Tani fatura futet direkt në Supabase me INSERT: çelësi primar (id) e bën të pamundur
 * që dy pajisje ta marrin të njëjtin numër — nëse numri është zënë, provohet numri tjetër.
 *
 * Nëse databaza s'arrihet (offline), bie te numri lokal si më parë.
 */
export const formatInvoiceId = n => `INV-${String(n).padStart(6, '0')}`
const numberOf = id => { const m = /^INV-(\d+)$/.exec(String(id || '')); return m ? parseInt(m[1], 10) : 0 }

export async function reserveInvoiceId({ invoices = [], payments = [], orgId, buildInvoice, client = defaultClient }) {
  const localNext = maxInvoiceNumber(invoices, payments) + 1
  if (!client) return { id: formatInvoiceId(localNext), reserved: false }

  try {
    // Numri më i lartë që ekziston tashmë në databazë (pajisje të tjera mund të kenë krijuar më shumë)
    const { data: top, error: topErr } = await client
      .from('invoices').select('id').like('id', 'INV-%').order('id', { ascending: false }).limit(50)
    if (topErr) throw topErr

    let n = Math.max(localNext, ...(top || []).map(r => numberOf(r.id) + 1))
    for (let tries = 0; tries < 50; tries++, n++) {
      const id = formatInvoiceId(n)
      const invoice = buildInvoice(id)
      const { error } = await client
        .from('invoices')
        .insert({ id, data: { ...invoice, orgId: orgId || invoice.orgId, _synced: new Date().toISOString() } })
      if (!error) return { id, reserved: true }
      if (error.code !== '23505') throw error   // gabim tjetër (rrjeti etj.) — jo numër i zënë
      // 23505 = numri u zu në çast nga pajisje tjetër → provo numrin tjetër
    }
  } catch (e) {
    console.warn('[reserveInvoiceId] rezervimi në databazë dështoi, përdoret numri lokal:', e)
  }
  return { id: formatInvoiceId(localNext), reserved: false }
}
