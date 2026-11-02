/* Kur ndryshon emri i një klienti, faturat dhe pagesat e tij (që e referojnë klientin me EMËR)
   marrin emrin e ri. Bëhet vetëm nëse emri i vjetër i përket vetëm këtij klienti — nëse ka klient
   tjetër me të njëjtin emër, nuk dihet cilit i takojnë faturat, ndaj nuk preket asgjë.
   Ndryshon VETËM fusha e emrit (shumat, datat, statuset mbeten siç janë). */
export function cascadeCustomerRename({
  oldName, newName, customerId,
  customers, invoices, setInvoices, setPayments, setCustomers,
}) {
  const from = (oldName || '').trim()
  const to   = (newName || '').trim()
  if (!from || !to || from === to) return { done: false, ambiguous: false, invoiceCount: 0 }

  const twins = customers.some(c =>
    c.id !== customerId && (c.name || '').trim().toLowerCase() === from.toLowerCase()
  )
  const invoiceCount = invoices.filter(i => i.customer === oldName).length
  if (twins) return { done: false, ambiguous: true, invoiceCount }

  setInvoices(prev => prev.map(i => {
    if (i.customer === oldName || i.referent === oldName) {
      return {
        ...i,
        ...(i.customer === oldName ? { customer: to } : null),
        ...(i.referent === oldName ? { referent: to } : null),
      }
    }
    return i
  }))
  setPayments(prev => prev.map(p => (p.customer === oldName ? { ...p, customer: to } : p)))
  // Klientët e tjerë që e kanë këtë klient si referent
  setCustomers(prev => prev.map(c => (c.referredBy === oldName ? { ...c, referredBy: to } : c)))
  return { done: true, ambiguous: false, invoiceCount }
}
