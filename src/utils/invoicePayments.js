/**
 * Lidhja pagesë ↔ faturë. Numri i faturës rinumërohet (max+1) kur fshihet fatura e fundit,
 * ndaj një pagesë "jetime" e një klienti tjetër mund të ketë të njëjtin invoiceId me një
 * faturë të re. Prandaj një pagesë i përket një fature vetëm kur përputhet edhe klienti.
 */
export const sameCustomer = (a, b) =>
  !a || !b || String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

export const paymentBelongsToInvoice = (payment, invoice) =>
  payment.invoiceId === invoice.id && sameCustomer(payment.customer, invoice.customer)

// Numri më i lartë i përdorur ndonjëherë (faturat ekzistuese + faturat e referuara nga pagesat)
export function maxInvoiceNumber(invoices = [], payments = []) {
  let max = 0
  const take = id => {
    const m = String(id || '').match(/^INV-(\d+)$/)
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n }
  }
  invoices.forEach(i => take(i.id))
  payments.forEach(p => take(p.invoiceId))
  return max
}
