import { useState, useRef, useEffect } from 'react'
import { Save, LogOut, Shield, Building2, Globe, MessageCircle, Download, Upload, Clock, Trash2, Bell, BellOff, AlertTriangle } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'
import BackupService from '../services/BackupService'
import { isPushSupported, getPushSubscriptionState, enablePushNotifications, disablePushNotifications } from '../utils/pushNotifications'

const TIMEZONE_OPTIONS = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
  'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
  'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+9:30',
  'UTC+10', 'UTC+11', 'UTC+12', 'UTC+13', 'UTC+14',
]

const SETTINGS_TABS = [
  { id: 'profile',  label: 'Profili & Rajoni',      icon: Building2 },
  { id: 'notif',    label: 'Njoftimet',             icon: MessageCircle },
  { id: 'security', label: 'Siguria',               icon: Shield },
  { id: 'backup',   label: 'Backup & Rivendosje',   icon: Download },
  { id: 'danger',   label: 'Zona e Rrezikshme',     icon: AlertTriangle },
]
const SECTION_TAB = {
  'Profili i kompanisë': 'profile',
  'Gjuha & Rajoni': 'profile',
  'Njoftimet automatike WhatsApp': 'notif',
  'Siguria': 'security',
}

export default function Settings() {
  const {
    showToast, logout, currentUser,
    invoices, customers, items, payments, expenses, users, vendors, transfers, activityLog, representatives, organizations,
    paymentModes, setPaymentModes, depositAccounts, setDepositAccounts,
    setInvoices, setCustomers, setItems, setPayments, setExpenses, setUsers, setVendors, setTransfers, setActivityLog, setRepresentatives,
  } = useApp()
  const fileInputRef = useRef(null)
  // Tab-et e brendshme: shfaqet vetëm seksioni i tab-it aktiv
  const [tab, setTab] = useState('profile')
  const show = id => tab === id
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [companyData, setCompanyData] = useState(() => {
    const saved = localStorage.getItem('arestv_company_data')
    return saved ? JSON.parse(saved) : {
      companyName: 'AresTV Flow Studio',
      email: 'info@arestv.ks',
      phone: '+383 44 100 200',
      address: 'Rruga Nënë Tereza 12, Prishtinë',
      gjuha: 'Shqip',
      formatiidatës: 'DD/MM/YYYY',
      zonakohore: 'UTC+1',
    }
  })
  const [toggles, setToggles] = useState({
    twofa: false,
    autoWhatsApp: true,
  })
  // Njoftime push në këtë pajisje — gjendja lexohet nga service worker-i
  // (jo nga localStorage), sepse i përket vetë pajisjes, jo llogarisë.
  const [pushState, setPushState] = useState('checking') // checking · unsupported · denied · unsubscribed · subscribed
  const [pushBusy, setPushBusy] = useState(false)
  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return }
    getPushSubscriptionState().then(setPushState)
  }, [])
  const togglePush = async () => {
    setPushBusy(true)
    try {
      if (pushState === 'subscribed') {
        await disablePushNotifications()
        setPushState('unsubscribed')
        showToast('Njoftimet push u çaktivizuan në këtë pajisje.')
      } else {
        await enablePushNotifications()
        setPushState('subscribed')
        showToast('Njoftimet push u aktivizuan ✓')
      }
    } catch (e) {
      showToast(e.message || "S'u aktivizuan njoftimet.", 'error')
      setPushState(await getPushSubscriptionState())
    } finally {
      setPushBusy(false)
    }
  }
  const [advanceDays, setAdvanceDays] = useState(() => {
    const saved = localStorage.getItem('arestv_notif_advance_days')
    return saved ? parseInt(saved) : 7
  })
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [restoreData, setRestoreData] = useState(null)
  const [autoBackups, setAutoBackups] = useState([])
  const [showAutoBackupConfirm, setShowAutoBackupConfirm] = useState(false)
  const [selectedAutoBackup, setSelectedAutoBackup] = useState(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const tog = k => setToggles(p => ({ ...p, [k]: !p[k] }))

  // Load auto-backups on mount
  useEffect(() => {
    const backups = BackupService.getAutoBackups()
    setAutoBackups(backups)
  }, [])

  // Save company data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('arestv_company_data', JSON.stringify(companyData))
  }, [companyData])

  const handleSaveAdvanceDays = () => {
    if (advanceDays < 0 || advanceDays > 90) {
      showToast('Numri i ditëve duhet të jetë ndërmjet 0 dhe 90', 'error')
      return
    }
    localStorage.setItem('arestv_notif_advance_days', advanceDays.toString())
    showToast('Cilësimet e njoftimeve u ruajtën ✓', 'success')
  }

  const handleLogout = () => {
    localStorage.removeItem('arestv_auth')
    window.location.reload()
  }

  const buildFullAppState = () => ({
    invoices, customers, items, payments, expenses, users,
    vendors, transfers, activityLog, representatives, paymentModes, depositAccounts, organizations,
  })

  const handleDownloadBackup = async () => {
    setIsBackingUp(true)
    const result = await BackupService.downloadBackup(buildFullAppState())
    setIsBackingUp(false)
    showToast(result.message, result.success ? 'success' : 'error')
  }

  // Backup i menjëhershëm — krijon një auto-backup tani (shkarkim + listë) pa pritur ciklin periodik
  const handleCreateBackupNow = async () => {
    setIsBackingUp(true)
    const result = await BackupService.createAutoBackup(buildFullAppState())
    if (result.success) {
      localStorage.setItem('arestv_last_backup_time', Date.now().toString())
      setAutoBackups(BackupService.getAutoBackups())
    }
    setIsBackingUp(false)
    showToast(result.message, result.success ? 'success' : 'error')
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const jsonData = await BackupService.parseBackupFile(file)
      const importResult = BackupService.importBackup(jsonData)

      if (!importResult.success) {
        showToast(importResult.message, 'error')
        return
      }

      setRestoreData(importResult.data)
      setShowRestoreConfirm(true)
    } catch (error) {
      showToast(error.message, 'error')
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Rivendos çdo entitet të pranishëm në backup — fushat e reja (vendors, transfers, ...)
  // mungojnë te backup-et e vjetra (v1.0), prandaj kontrollohen para se të shkruhen,
  // që një backup i vjetër të mos fshijë aksidentalisht të dhëna që s'i kishte kapur fare.
  const applyRestoreData = (data) => {
    if (data.invoices)   setInvoices(data.invoices)
    if (data.customers)  setCustomers(data.customers)
    if (data.items)      setItems(data.items)
    if (data.payments)   setPayments(data.payments)
    if (data.expenses)   setExpenses(data.expenses)
    if (data.users)      setUsers(data.users)
    if (data.vendors)    setVendors(data.vendors)
    if (data.transfers)  setTransfers(data.transfers)
    if (data.activityLog)     setActivityLog(data.activityLog)
    if (data.representatives) setRepresentatives(data.representatives)
    if (data.paymentModes)    setPaymentModes(data.paymentModes)
    if (data.depositAccounts) setDepositAccounts(data.depositAccounts)
    if (data.companyData) {
      localStorage.setItem('arestv_company_data', JSON.stringify(data.companyData))
      setCompanyData(data.companyData)
    }
    if (data.notifAdvanceDays != null) {
      localStorage.setItem('arestv_notif_advance_days', data.notifAdvanceDays.toString())
      setAdvanceDays(data.notifAdvanceDays)
    }
    if (data.messageLogs) {
      localStorage.setItem('arestv_message_logs', JSON.stringify(data.messageLogs))
    }
  }

  const handleConfirmRestore = () => {
    if (!restoreData) return

    try {
      applyRestoreData(restoreData)
      showToast('Të dhënat u rivendosën me sukses ✓', 'success')
      setShowRestoreConfirm(false)
      setRestoreData(null)
    } catch (error) {
      showToast('Gabim në rivendosjen e të dhënave', 'error')
    }
  }

  const handleRestoreAutoBackup = (index) => {
    const result = BackupService.restoreFromAutoBackup(index)
    if (!result.success) {
      showToast(result.message, 'error')
      return
    }

    setRestoreData(result.data)
    setSelectedAutoBackup(index)
    setShowAutoBackupConfirm(true)
  }

  const handleConfirmAutoBackupRestore = () => {
    if (!restoreData) return

    try {
      applyRestoreData(restoreData)
      showToast('Auto-backup-i u rivendos me sukses ✓', 'success')
      setShowAutoBackupConfirm(false)
      setRestoreData(null)
      setSelectedAutoBackup(null)
    } catch (error) {
      showToast('Gabim në rivendosjen e auto-backup-it', 'error')
    }
  }

  const handleDeleteAutoBackup = (index) => {
    const result = BackupService.deleteAutoBackup(index)
    if (result.success) {
      const backups = BackupService.getAutoBackups()
      setAutoBackups(backups)
      showToast(result.message, 'success')
    } else {
      showToast(result.message, 'error')
    }
  }

  const formatBackupTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('sq-AL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const sections = [
    {
      title: 'Profili i kompanisë', icon: Building2,
      rows: [
        { label: 'Emri i kompanisë', sub: 'AresTV Flow Studio', type: 'field' },
        { label: 'Email', sub: 'info@arestv.ks', type: 'field' },
        { label: 'Telefon', sub: '+383 44 100 200', type: 'field' },
        { label: 'Adresa', sub: 'Rruga Nënë Tereza 12, Prishtinë', type: 'field' },
      ]
    },
    {
      title: 'Gjuha & Rajoni', icon: Globe,
      rows: [
        { label: 'Gjuha', sub: 'Shqip', type: 'select', options: ['Shqip', 'Anglisht', 'Italisht', 'Gjermanisht', 'Frëngjisht'] },
        { label: 'Formati i datës', sub: 'DD/MM/YYYY', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'] },
        { label: 'Zona kohore', sub: 'UTC+1', type: 'select', options: TIMEZONE_OPTIONS },
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
      ]
    },
  ]

  return (
    <div className="rep">
      {/* Titulli "Cilësimet" tani jeton te header-i global (Header.jsx, kur page === 'settings'). */}
      <div className="flex items-center justify-end mb-6">
        <button className="btn btn-primary" onClick={() => showToast('Ndryshimet u ruajtën ✓')}>
          <Save size={15}/>Ruaj ndryshimet
        </button>
      </div>

      {/* Tab-et e brendshme */}
      <div className="w-full bg-gray-100 dark:bg-dk-low rounded-xl p-1.5 mb-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {SETTINGS_TABS.map(({ id, label, icon: TabIcon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === id
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-dk-card dark:text-white dark:shadow-black/30'
                  : id === 'danger'
                    ? 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-[#ffb4ab]/80 dark:hover:text-[#ffb4ab] dark:hover:bg-[#93000a]/20'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/60 dark:text-[#8b8e99] dark:hover:text-white dark:hover:bg-dk-card/50'
              }`}>
              <TabIcon size={16} className={tab === id && id !== 'danger' ? 'text-blue-500 dark:text-accent' : ''} />
              <span>{label}</span>
              {id === 'backup' && autoBackups.length > 0 && (
                <span className="px-1.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600 dark:bg-dk-high dark:text-gray-200">{autoBackups.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-2xl dark:max-w-none space-y-5">
        {sections.map(({ title, icon: Icon, rows }) => {
          const isLockedSection = title === 'Profili i kompanisë' || title === 'Gjuha & Rajoni'
          const isAdmin = currentUser?.role === 'admin' || currentUser?.isSuperAdmin
          return (
          <div key={title} hidden={!show(SECTION_TAB[title])}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon size={14} className="text-gray-400 dark:text-gray-500"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">{title}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              {rows.map((row, i) => {
                const fieldKey = row.label.toLowerCase().replace(/\s+/g, '')
                const isEditing = editingField === `${title}-${i}`
                return (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors dark:border-gray-700 dark:hover:bg-dk-card">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.label}</p>
                    {isEditing && isAdmin && row.type === 'field' ? (
                      <input
                        autoFocus
                        className="form-control text-xs mt-1.5 w-full"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => {
                          setCompanyData(p => ({ ...p, [fieldKey]: editValue }))
                          setEditingField(null)
                          showToast(`${row.label} u përditësua ✓`)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setCompanyData(p => ({ ...p, [fieldKey]: editValue }))
                            setEditingField(null)
                            showToast(`${row.label} u përditësua ✓`)
                          }
                        }}
                      />
                    ) : row.type !== 'select' ? (
                      <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">{companyData[fieldKey] || row.sub}</p>
                    ) : null}
                  </div>
                  {row.key ? (
                    <Toggle on={toggles[row.key]} onToggle={() => tog(row.key)}/>
                  ) : row.type === 'select' ? (
                    <select
                      className="form-control text-xs w-40 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={companyData[fieldKey] || row.sub}
                      disabled={isLockedSection && !isAdmin}
                      onChange={e => {
                        setCompanyData(p => ({ ...p, [fieldKey]: e.target.value }))
                        showToast(`${row.label} u përditësua ✓`)
                      }}
                    >
                      {row.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : isLockedSection && !isAdmin ? (
                    <button className="btn btn-outline btn-sm text-xs opacity-50 cursor-not-allowed" disabled>Nuk mund të ndryshohet</button>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm text-xs"
                      onClick={() => {
                        setEditingField(`${title}-${i}`)
                        setEditValue(companyData[fieldKey] || row.sub)
                      }}
                    >
                      {isEditing ? 'Duke redaktuar...' : 'Ndrysho'}
                    </button>
                  )}
                </div>
              )
              })}
            </div>
          </div>
        )
        })}

        {/* Auto-notification configuration */}
        {toggles.autoWhatsApp && show('notif') && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <MessageCircle size={14} className="text-gray-400 dark:text-gray-500"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">Konfigurimi i njoftimeve WhatsApp</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="px-5 py-3.5 border-b border-gray-50 dark:border-gray-700">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1 dark:text-gray-100">Dita më parë të dërgimit</p>
                  <p className="text-xs text-gray-400 mb-3 dark:text-gray-500">Dërgimi i njoftimit kur mbesin X ditë deri sa skadon abonimit</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={advanceDays}
                      onChange={(e) => setAdvanceDays(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-dk-card rounded-lg text-sm font-semibold text-gray-800 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">ditë më parë</span>
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

        {/* Njoftime Push — vetëm kjo pajisje */}
        <div hidden={!show('notif')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Bell size={14} className="text-gray-400 dark:text-gray-500"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">Njoftime Push</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-3.5 gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Njoftime për detyrat me afat sot</p>
                <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">
                  {pushState === 'unsupported' && 'Ky shfletues/pajisje nuk i mbështet njoftimet push.'}
                  {pushState === 'denied' && 'Leja për njoftime është refuzuar — aktivizoje te cilësimet e shfletuesit.'}
                  {pushState === 'checking' && 'Duke kontrolluar...'}
                  {pushState === 'unsubscribed' && 'Aktivizoje që kjo pajisje të marrë njoftim kur ka detyrë me afat sot.'}
                  {pushState === 'subscribed' && 'Kjo pajisje merr njoftim çdo mëngjes kur ka detyra me afat sot ✓'}
                </p>
              </div>
              {(pushState === 'subscribed' || pushState === 'unsubscribed') && (
                <button
                  onClick={togglePush}
                  disabled={pushBusy}
                  className={`btn btn-sm text-xs flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 ${pushState === 'subscribed' ? 'btn-outline' : 'btn-primary'}`}
                >
                  {pushState === 'subscribed' ? <><BellOff size={13}/>Çaktivizo</> : <><Bell size={13}/>Aktivizo</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Backup & Restore */}
        <div hidden={!show('backup')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Download size={14} className="text-gray-400 dark:text-gray-500"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">Backup & Rivendosje</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Shkarko Backup</p>
                <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">Çdo të dhënë (fatura, klientë, furnitorë, detyra, cilësime...) si file i kompresuar</p>
              </div>
              <button
                onClick={handleDownloadBackup}
                disabled={isBackingUp}
                className="btn btn-outline btn-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={13}/>{isBackingUp ? 'Duke shkarkuar...' : 'Shkarko'}
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Krijo Backup Tani</p>
                <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">Shkarko + shto në listën e auto-backup-eve, pa pritur ciklin periodik</p>
              </div>
              <button
                onClick={handleCreateBackupNow}
                disabled={isBackingUp}
                className="btn btn-outline btn-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Clock size={13}/>{isBackingUp ? 'Duke krijuar...' : 'Krijo tani'}
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rivendos Backup</p>
                <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">Importo nga file .json ose .json.gz</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline btn-sm flex items-center gap-1.5"
              >
                <Upload size={13}/>Importo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.gz"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Restore confirmation */}
        {showRestoreConfirm && restoreData && show('backup') && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-[#b45309]/10 dark:border-[#b45309]/30 rounded-xl p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">⚠️ Konfirmo Rivendosjen</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mb-3">
                Kjo do të zëvendësojë të gjitha të dhënat e tanishme me të dhënat nga backup-i:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 mb-4">
                <li>• Faturat: {restoreData.invoices?.length || 0}</li>
                <li>• Klientët: {restoreData.customers?.length || 0}</li>
                <li>• Produktet: {restoreData.items?.length || 0}</li>
                <li>• Pagesat: {restoreData.payments?.length || 0}</li>
                <li>• Shpenzimet: {restoreData.expenses?.length || 0}</li>
                <li>• Furnitorët: {restoreData.vendors?.length || 0}</li>
                <li>• Përdoruesit: {restoreData.users?.length || 0}</li>
              </ul>
              {restoreData.tasks?.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  ℹ️ Backup-i ka {restoreData.tasks.length} detyra — ato NUK rivendosen automatikisht (kërkojnë rivendosje të veçantë, kontakto zhvilluesin).
                </p>
              )}
              <p className="text-xs text-blue-600 dark:text-[#ffb4ab] font-semibold">Kjo nuk mund të rikthehej!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false)
                  setRestoreData(null)
                }}
                className="btn btn-outline btn-sm text-xs"
              >
                Anulo
              </button>
              <button
                onClick={handleConfirmRestore}
                className="btn btn-danger btn-sm text-xs"
              >
                Po, rivendos
              </button>
            </div>
          </div>
        )}

        {/* Auto-backups */}
        <div hidden={!show('backup')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Clock size={14} className="text-gray-400 dark:text-gray-500"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">Auto-backup-et (çdo 3 ore, {autoBackups.length}/3 të fundit)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            {autoBackups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Nuk ka auto-backup-e ende</p>
                <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Auto-backup-et do të krijohen automatikisht çdo 3 ore (edhe u shkarkojnë vetë si file .gz)</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {autoBackups.map((backup, idx) => (
                  <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors dark:hover:bg-gray-900/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Backup #{autoBackups.length - idx}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">
                        {formatBackupTime(backup.exportDate)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                        {backup.data?.invoices?.length || 0} fatura • {backup.data?.customers?.length || 0} klientë
                      </p>
                    </div>
                    <div className="flex gap-1.5 ml-3">
                      <button
                        onClick={() => handleRestoreAutoBackup(idx)}
                        className="btn btn-outline btn-sm text-xs flex items-center gap-1"
                      >
                        <Upload size={12}/>Rivendos
                      </button>
                      <button
                        onClick={() => handleDeleteAutoBackup(idx)}
                        className="btn btn-outline btn-sm text-xs text-blue-600 hover:bg-blue-50 dark:text-[#ffb4ab] dark:hover:bg-[#93000a]/25 flex items-center gap-1"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auto-backup restore confirmation */}
        {showAutoBackupConfirm && restoreData && show('backup') && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-[#b45309]/10 dark:border-[#b45309]/30 rounded-xl p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">⚠️ Konfirmo Rivendosjen e Auto-Backup-it</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mb-3">
                Kjo do të zëvendësojë të gjitha të dhënat e tanishme:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 mb-4">
                <li>• Faturat: {restoreData.invoices?.length || 0}</li>
                <li>• Klientët: {restoreData.customers?.length || 0}</li>
                <li>• Produktet: {restoreData.items?.length || 0}</li>
                <li>• Pagesat: {restoreData.payments?.length || 0}</li>
                <li>• Shpenzimet: {restoreData.expenses?.length || 0}</li>
                <li>• Furnitorët: {restoreData.vendors?.length || 0}</li>
                <li>• Përdoruesit: {restoreData.users?.length || 0}</li>
              </ul>
              {restoreData.tasks?.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  ℹ️ Backup-i ka {restoreData.tasks.length} detyra — ato NUK rivendosen automatikisht.
                </p>
              )}
              <p className="text-xs text-blue-600 dark:text-[#ffb4ab] font-semibold">Kjo nuk mund të rikthehej!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAutoBackupConfirm(false)
                  setRestoreData(null)
                  setSelectedAutoBackup(null)
                }}
                className="btn btn-outline btn-sm text-xs"
              >
                Anulo
              </button>
              <button
                onClick={handleConfirmAutoBackupRestore}
                className="btn btn-danger btn-sm text-xs"
              >
                Po, rivendos
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <div hidden={!show('danger')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Zona e rrezikshme</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden dark:bg-gray-800 dark:border-[#93000a]/40">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dilni nga sistemi</p>
                <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">Do të dilni nga paneli</p>
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
