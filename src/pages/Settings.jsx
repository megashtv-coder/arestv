import { useState } from 'react'
import { Save, LogOut, Shield, Bell, Building2, Globe, MessageCircle } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { showToast, paymentModes, setPaymentModes, depositAccounts, setDepositAccounts, logout } = useApp()
  const [toggles, setToggles] = useState({
    emailNotif: true, smsNotif: false, autoInvoice: true,
    twofa: false, darkReports: false, weeklyDigest: true,
    autoWhatsApp: true,
  })
  const [advanceDays, setAdvanceDays] = useState(() => {
    const saved = localStorage.getItem('xflow_notif_advance_days')
    return saved ? parseInt(saved) : 7
  })
  const tog = k => setToggles(p => ({ ...p, [k]: !p[k] }))

  const handleSaveAdvanceDays = () => {
    if (advanceDays < 0 || advanceDays > 90) {
      showToast('Numri i ditëve duhet të jetë ndërmjet 0 dhe 90', 'error')
      return
    }
    localStorage.setItem('xflow_notif_advance_days', advanceDays.toString())
    showToast('Cilësimet e njoftimeve u ruajtën ✓', 'success')
  }

  const handleLogout = () => {
    localStorage.removeItem('xflow_auth')
    window.location.reload()
  }

  const sections = [
    {
      title: 'Profili i kompanisë', icon: Building2,
      rows: [
        { label: 'Emri i kompanisë', sub: 'XFlow Studio', type: 'field' },
        { label: 'Email', sub: 'info@xflow.ks', type: 'field' },
        { label: 'Telefon', sub: '+383 44 100 200', type: 'field' },
        { label: 'Adresa', sub: 'Rruga Nënë Tereza 12, Prishtinë', type: 'field' },
      ]
    },
    {
      title: 'Gjuha & Rajoni', icon: Globe,
      rows: [
        { label: 'Gjuha', sub: 'Shqip (Kosovë)', type: 'field' },
        { label: 'Formati i datës', sub: 'DD/MM/YYYY', type: 'field' },
        { label: 'Zona kohore', sub: 'UTC+1 (CET)', type: 'field' },
      ]
    },
    {
      title: 'Njoftimet', icon: Bell,
      rows: [
        { label: 'Njoftime me email', sub: 'Merr email për fatura dhe pagesa', key: 'emailNotif' },
        { label: 'Njoftime SMS', sub: 'SMS kur faturat janë pranë afatit', key: 'smsNotif' },
        { label: 'Fatura automatike', sub: 'Dërgo fatura automatikisht', key: 'autoInvoice' },
        { label: 'Raport javor', sub: 'Merr përmbledhje javore me email', key: 'weeklyDigest' },
      ]
    },
    {
      title: 'Njoftimet automatike WhatsApp', icon: MessageCircle,
      rows: [
        { label: 'Njoftime skadimi abonimesh', sub: 'Dërgo automatikisht WhatsApp kur abonimet skadojnë', key: 'autoWhatsApp' },
      ]
    },
    {
      title: 'Siguria', icon: Shield,
      rows: [
        { label: 'Autentifikim 2FA', sub: 'Mbroje llogarinë me dy faktorë', key: 'twofa' },
        { label: 'Raportet dark mode', sub: 'Shfaq raportet në temë të errët', key: 'darkReports' },
      ]
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cilësimet</h2>
          <p className="text-sm text-gray-400 mt-0.5">Menaxho preferencat e llogarisë</p>
        </div>
        <button className="btn btn-primary" onClick={() => showToast('Ndryshimet u ruajtën ✓')}>
          <Save size={15}/>Ruaj ndryshimet
        </button>
      </div>

      <div className="max-w-2xl space-y-5">
        {sections.map(({ title, icon: Icon, rows }) => (
          <div key={title}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon size={14} className="text-gray-400"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{row.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.sub}</p>
                  </div>
                  {row.key ? (
                    <Toggle on={toggles[row.key]} onToggle={() => tog(row.key)}/>
                  ) : (
                    <button className="btn btn-outline btn-sm text-xs">Ndrysho</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Auto-notification configuration */}
        {toggles.autoWhatsApp && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <MessageCircle size={14} className="text-gray-400"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Konfigurimi i njoftimeve WhatsApp</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Dita më parë të dërgimit</p>
                  <p className="text-xs text-gray-400 mb-3">Dërgimi i njoftimit kur mbesin X ditë deri sa skadon abonimit</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={advanceDays}
                      onChange={(e) => setAdvanceDays(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800"
                    />
                    <span className="text-sm text-gray-600">ditë më parë</span>
                    <button
                      onClick={handleSaveAdvanceDays}
                      className="ml-auto btn btn-primary btn-sm text-xs flex items-center gap-1"
                    >
                      <Save size={12}/>Ruaj
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Zona e rrezikshme</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">Dilni nga sistemi</p>
                <p className="text-xs text-gray-400 mt-0.5">Do të dilni nga paneli</p>
              </div>
              <button className="btn btn-danger btn-sm flex items-center gap-1.5" onClick={logout}>
                <LogOut size={13}/>Dilni
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
