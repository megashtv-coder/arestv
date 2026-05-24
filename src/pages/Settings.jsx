import { useState } from 'react'
import { Save, LogOut, Shield, Bell, Building2, Globe } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { showToast } = useApp()
  const [toggles, setToggles] = useState({
    emailNotif: true, smsNotif: false, autoInvoice: true,
    twofa: false, darkReports: false, weeklyDigest: true,
  })
  const tog = k => setToggles(p => ({ ...p, [k]: !p[k] }))

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
              <button className="btn btn-danger btn-sm flex items-center gap-1.5" onClick={handleLogout}>
                <LogOut size={13}/>Dilni
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
