import { useState } from 'react'
import { Save, LogOut, Shield, Bell, Building2, Globe, CreditCard, Wallet, Plus, X, Check, Pencil } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'

/* ── Editable field row — must be OUTSIDE Settings to keep stable identity across renders ── */
function FieldRow({ fieldKey, label, value, editField, editVal, onStart, onSave, onCancel, onChangeVal }) {
  const isEditing = editField === fieldKey
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              className="form-control text-sm py-1.5 flex-1 max-w-xs"
              value={editVal}
              onChange={e => onChangeVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
              autoFocus
            />
            <button
              className="w-7 h-7 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex-shrink-0"
              onClick={onSave}
              title="Ruaj"
            >
              <Check size={13}/>
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center border border-gray-200 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors flex-shrink-0"
              onClick={onCancel}
              title="Anulo"
            >
              <X size={13}/>
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">{value}</p>
        )}
      </div>
      {!isEditing && (
        <button
          className="btn btn-outline btn-sm text-xs flex-shrink-0 flex items-center gap-1"
          onClick={() => onStart(fieldKey, value)}
        >
          <Pencil size={11}/> Ndrysho
        </button>
      )}
    </div>
  )
}

export default function Settings() {
  const { showToast, paymentModes, setPaymentModes, depositAccounts, setDepositAccounts } = useApp()
  const [newMode,    setNewMode]    = useState('')
  const [newAccount, setNewAccount] = useState('')

  /* ── Company profile editable state ── */
  const [company, setCompany] = useState({
    name:  'X',
    email: 'megashtv@gmail.com',
    phone: '+35569533040',
  })

  /* ── Region editable state ── */
  const [region, setRegion] = useState({
    gjuha:   'Shqip (Kosovë)',
    formati: 'DD/MM/YYYY',
    zona:    'UTC+1 (CET)',
  })

  /* ── Inline edit state ── */
  const [editField, setEditField] = useState(null)
  const [editVal,   setEditVal]   = useState('')

  const startEdit  = (key, val) => { setEditField(key); setEditVal(val) }
  const cancelEdit = () => setEditField(null)
  const saveEdit   = () => {
    if (!editField) return
    const [grp, k] = editField.split('.')
    if (grp === 'company') setCompany(p => ({ ...p, [k]: editVal }))
    if (grp === 'region')  setRegion(p  => ({ ...p, [k]: editVal }))
    setEditField(null)
    showToast('Ndryshimi u ruajt ✓')
  }

  const fieldRowProps = {
    editField,
    editVal,
    onStart:     startEdit,
    onSave:      saveEdit,
    onCancel:    cancelEdit,
    onChangeVal: setEditVal,
  }

  /* ── Payment methods ── */
  const addMode    = () => {
    const v = newMode.trim()
    if (!v || paymentModes.includes(v)) return
    setPaymentModes(p => [...p, v]); setNewMode('')
    showToast(`Metoda "${v}" u shtua ✓`)
  }
  const removeMode = m => setPaymentModes(p => p.filter(x => x !== m))

  /* ── Deposit accounts ── */
  const addAccount = () => {
    const v = newAccount.trim()
    if (!v || depositAccounts.includes(v)) return
    setDepositAccounts(p => [...p, v]); setNewAccount('')
    showToast(`Llogaria "${v}" u shtua ✓`)
  }
  const removeAccount = a => setDepositAccounts(p => p.filter(x => x !== a))

  /* ── Toggles ── */
  const [toggles, setToggles] = useState({
    emailNotif: true, smsNotif: false, autoInvoice: true,
    twofa: false, darkReports: false, weeklyDigest: true,
  })
  const tog = k => setToggles(p => ({ ...p, [k]: !p[k] }))

  /* ── Toggle row ── */
  const ToggleRow = ({ label, sub, toggleKey }) => (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <Toggle on={toggles[toggleKey]} onToggle={() => tog(toggleKey)}/>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cilësimet</h2>
          <p className="text-sm text-gray-400 mt-0.5">Menaxho preferencat e llogarisë</p>
        </div>
        <button className="btn btn-primary" onClick={() => showToast('Ndryshimet u ruajtën ✓')}>
          <Save size={15}/> Ruaj ndryshimet
        </button>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* ── Profili i kompanisë ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Building2 size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profili i kompanisë</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <FieldRow {...fieldRowProps} fieldKey="company.name"  label="Emri i kompanisë" value={company.name}  />
            <FieldRow {...fieldRowProps} fieldKey="company.email" label="Email"            value={company.email} />
            <FieldRow {...fieldRowProps} fieldKey="company.phone" label="Telefon"          value={company.phone} />
          </div>
        </div>

        {/* ── Gjuha & Rajoni ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Globe size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gjuha &amp; Rajoni</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <FieldRow {...fieldRowProps} fieldKey="region.gjuha"   label="Gjuha"           value={region.gjuha}   />
            <FieldRow {...fieldRowProps} fieldKey="region.formati" label="Formati i datës" value={region.formati} />
            <FieldRow {...fieldRowProps} fieldKey="region.zona"    label="Zona kohore"     value={region.zona}    />
          </div>
        </div>

        {/* ── Njoftimet ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Bell size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Njoftimet</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <ToggleRow label="Njoftime me email"  sub="Merr email për fatura dhe pagesa"  toggleKey="emailNotif"  />
            <ToggleRow label="Njoftime SMS"        sub="SMS kur faturat janë pranë afatit"  toggleKey="smsNotif"    />
            <ToggleRow label="Fatura automatike"   sub="Dërgo fatura automatikisht"         toggleKey="autoInvoice" />
            <ToggleRow label="Raport javor"        sub="Merr përmbledhje javore me email"   toggleKey="weeklyDigest"/>
          </div>
        </div>

        {/* ── Siguria ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Shield size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Siguria</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <ToggleRow label="Autentifikim 2FA"    sub="Mbroje llogarinë me dy faktorë"   toggleKey="twofa"        />
            <ToggleRow label="Raportet dark mode"  sub="Shfaq raportet në temë të errët"  toggleKey="darkReports"  />
          </div>
        </div>

        {/* ── Metodat e Pagesës ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <CreditCard size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metodat e Pagesës</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {paymentModes.map(m => (
                <span key={m} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {m}
                  <button onClick={() => removeMode(m)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={11}/>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="form-control flex-1 text-sm"
                placeholder="Shto metodë të re pagese..."
                value={newMode}
                onChange={e => setNewMode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMode()}
              />
              <button className="btn btn-primary btn-sm gap-1.5" onClick={addMode}>
                <Plus size={14}/> Shto
              </button>
            </div>
          </div>
        </div>

        {/* ── Llogaritë e Depozitimit ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Wallet size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Llogaritë e Depozitimit</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {depositAccounts.map(a => (
                <span key={a} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {a}
                  <button onClick={() => removeAccount(a)} className="text-blue-300 hover:text-red-500 transition-colors">
                    <X size={11}/>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="form-control flex-1 text-sm"
                placeholder="p.sh. Revolut - Enndy"
                value={newAccount}
                onChange={e => setNewAccount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAccount()}
              />
              <button className="btn btn-primary btn-sm gap-1.5" onClick={addAccount}>
                <Plus size={14}/> Shto
              </button>
            </div>
          </div>
        </div>

        {/* ── Zona e rrezikshme ── */}
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
              <button className="btn btn-danger btn-sm flex items-center gap-1.5">
                <LogOut size={13}/> Dilni
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
