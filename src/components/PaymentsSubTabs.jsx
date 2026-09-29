import { CreditCard, Scale, Link2, UserCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'

/* ══════════════════════════════════════════════════════════
   Nën-tabet e menusë "Pagesat" — Stripe, Barazimi (WU/Ria/MG) dhe
   Emrat për Pagesa jetojnë si faqe brenda kësaj menuje, jo si zëra
   të veçantë në sidebar. Secila faqe e vet (Payments/Settlement/
   Stripe/PaymentNames) e rendit këtë komponent lart.
══════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'payments',     label: 'Pagesat',         icon: CreditCard },
  { id: 'settlement',   label: 'Barazimi',        icon: Scale },
  { id: 'stripe',       label: 'Stripe',          icon: Link2 },
  { id: 'paymentnames', label: 'Emrat për Pagesa', icon: UserCheck },
]

export default function PaymentsSubTabs() {
  const { page, navigate } = useApp()

  return (
    <div className="flex gap-1 bg-gray-200/60 dark:bg-gray-800/80 rounded-2xl p-1 overflow-x-auto">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => navigate(id)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            page === id
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Icon size={14} className={page === id ? 'text-blue-500' : 'text-gray-400'} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
