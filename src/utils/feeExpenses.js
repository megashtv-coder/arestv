/**
 * Shpenzimet automatike të fee-së ("Fee transaksioni — <metoda> (<INV-...>)") që krijohen kur
 * regjistrohet një pagesë me fee. Kjo skedë përmban VETËM logjikën mbi shpenzimet — asnjëherë
 * nuk prek pagesat apo faturat.
 */

// Nga kjo datë, fee zbritet VETËM një herë te barazimi mes partnerëve (përmes netos së pagesës);
// shpenzimi automatik i fee-së mbetet te Shpenzimet, por nuk numërohet përsëri te barazimi.
export const FEE_RULE_START = '2026-06-01'

export const isAutoFeeExpense = e => /^Fee transaksioni/i.test(e?.reference || '')

// A është ky shpenzim fee që te barazimi numërohet përmes netos (pra duhet anashkaluar)?
export const feeCountedViaNet = e => isAutoFeeExpense(e) && (e.date || '') >= FEE_RULE_START

const invoiceOf = e => ((e.reference || '').match(/\((INV-[^)]+)\)/) || [])[1]

const feeReference = (method, invoiceId) => `Fee transaksioni — ${method} (${invoiceId})`

/**
 * Gjen shpenzimin e fee-së të një pagese: fillimisht me lidhjen e sigurt `paymentId`, ndryshe
 * (shpenzime më të vjetra pa lidhje) me faturën + shumën + datën e saktë të pagesës.
 */
export function findFeeExpense(expenses, payment) {
  const linked = expenses.find(e => isAutoFeeExpense(e) && e.paymentId === payment.id)
  if (linked) return linked
  return expenses.find(e =>
    isAutoFeeExpense(e) && !e.paymentId &&
    invoiceOf(e) === payment.invoiceId &&
    Math.abs((e.amount || 0) - (payment.fee || 0)) < 0.011 &&
    e.date === payment.date
  ) || null
}

/**
 * Pas fshirjes së pagesave: heq shpenzimet e fee-së që janë të lidhura SIGURT (me paymentId) me to.
 * Shpenzimet e tjera (përfshirë ato të vjetrat pa paymentId) nuk preken fare.
 */
export function withoutFeeExpensesOf(expenses, paymentIds) {
  const ids = paymentIds instanceof Set ? paymentIds : new Set(paymentIds)
  return expenses.filter(e => !(isAutoFeeExpense(e) && e.paymentId && ids.has(e.paymentId)))
}

/**
 * Pas editimit të një pagese: sinkronizon shpenzimin e fee-së.
 *  - gjendet + fee e re > 0  → përditësohet (shuma, data, metoda, kush e pagoi)
 *  - gjendet + fee e re = 0  → fshihet
 *  - nuk gjendet + fee ndryshoi në > 0 → krijohet (me paymentId)
 *  - nuk gjendet + fee nuk ndryshoi → asgjë (pagesat e vjetra nuk marrin shpenzim "nga hiçi")
 * `old` = pagesa para editimit; `next` = { fee, date, method, depositedTo }.
 */
export function applyFeeEdit(expenses, old, next, makeId = () => `EXP-${Date.now() + 1}`) {
  const found = findFeeExpense(expenses, old)
  const newFee = next.fee || 0

  if (found) {
    if (newFee <= 0) return expenses.filter(e => e.id !== found.id)
    return expenses.map(e => e.id !== found.id ? e : {
      ...e,
      amount:    newFee,
      date:      next.date,
      vendor:    next.method,
      reference: feeReference(next.method, old.invoiceId),
      paidBy:    next.depositedTo,
      paymentId: old.id,
      invoiceId: old.invoiceId,
    })
  }

  if (newFee > 0 && newFee !== (old.fee || 0)) {
    return [{
      id:            makeId(),
      date:          next.date,
      type:          'Pagesa tjera',
      vendor:        next.method,
      reference:     feeReference(next.method, old.invoiceId),
      paidBy:        next.depositedTo,
      recurring:     false,
      recurringFreq: '',
      amount:        newFee,
      invoiceId:     old.invoiceId,
      paymentId:     old.id,
    }, ...expenses]
  }
  return expenses
}
