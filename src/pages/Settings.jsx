import { useState, useRef, useEffect } from 'react'
import { Save, LogOut, Shield, Building2, Globe, MessageCircle, Download, Upload, Clock, Trash2 } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'
import BackupService from '../services/BackupService'

const TIMEZONE_OPTIONS = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5',
  'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3',
  'UTC+4', 'UTC+5', 'UTC+5:30', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+9:30',
  'UTC+10', 'UTC+11', 'UTC+12', 'UTC+13', 'UTC+14',
]

export default function Settings() {
  const {
    showToast, logout, currentUser,
    invoices, customers, items, payments, expenses, users, vendors, transfers, activityLog, representatives, organizations,
    paymentModes, setPaymentModes, depositAccounts, setDepositAccounts,
    setInvoices, setCustomers, setItems, setPayments, setExpenses, setUsers, setVendors, setTransfers, setActivityLog, setRepresentatives,
  } = useApp()
  const fileInputRef = useRef(null)
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
    <div>
      {/* Titulli "Cilësimet" tani jeton te header-i global (Header.jsx, kur page === 'settings'). */}
      <div className="flex items-center justify-end mb-6">
        <button className="btn btn-primary" onClick={() => showToast('Ndryshimet u ruajtën ✓')}>
          <Save size={15}/>Ruaj ndryshimet
        </button>
      </div>

      <div className="max-w-2xl space-y-5">
        {sections.map(({ title, icon: Icon, rows }) => {
          const isLockedSection = title === 'Profili i kompanisë' || title === 'Gjuha & Rajoni'
          const isAdmin = currentUser?.role === 'admin' || currentUser?.isSuperAdmin
          return (
          <div key={title}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon size={14} className="text-gray-400"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {rows.map((row, i) => {
                const fieldKey = row.label.toLowerCase().replace(/\s+/g, '')
                const isEditing = editingField === `${title}-${i}`
                return (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{row.label}</p>
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
                      <p className="text-xs text-gray-400 mt-0.5">{companyData[fieldKey] || row.sub}</p>
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

        {/* Backup & Restore */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Download size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Backup & Rivendosje</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Shkarko Backup</p>
                <p className="text-xs text-gray-400 mt-0.5">Çdo të dhënë (fatura, klientë, furnitorë, detyra, cilësime...) si file i kompresuar</p>
              </div>
              <button
                onClick={handleDownloadBackup}
                disabled={isBackingUp}
                className="btn btn-outline btn-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={13}/>{isBackingUp ? 'Duke shkarkuar...' : 'Shkarko'}
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Krijo Backup Tani</p>
                <p className="text-xs text-gray-400 mt-0.5">Shkarko + shto në listën e auto-backup-eve, pa pritur ciklin periodik</p>
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
                <p className="text-sm font-semibold text-gray-800">Rivendos Backup</p>
                <p className="text-xs text-gray-400 mt-0.5">Importo nga file .json ose .json.gz</p>
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
        {showRestoreConfirm && restoreData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Konfirmo Rivendosjen</p>
              <p className="text-xs text-amber-800 mb-3">
                Kjo do të zëvendësojë të gjitha të dhënat e tanishme me të dhënat nga backup-i:
              </p>
              <ul className="text-xs text-amber-800 space-y-1 mb-4">
                <li>• Faturat: {restoreData.invoices?.length || 0}</li>
                <li>• Klientët: {restoreData.customers?.length || 0}</li>
                <li>• Produktet: {restoreData.items?.length || 0}</li>
                <li>• Pagesat: {restoreData.payments?.length || 0}</li>
                <li>• Shpenzimet: {restoreData.expenses?.length || 0}</li>
                <li>• Furnitorët: {restoreData.vendors?.length || 0}</li>
                <li>• Përdoruesit: {restoreData.users?.length || 0}</li>
              </ul>
              {restoreData.tasks?.length > 0 && (
                <p className="text-xs text-amber-700 mb-3">
                  ℹ️ Backup-i ka {restoreData.tasks.length} detyra — ato NUK rivendosen automatikisht (kërkojnë rivendosje të veçantë, kontakto zhvilluesin).
                </p>
              )}
              <p className="text-xs text-blue-600 font-semibold">Kjo nuk mund të rikthehej!</p>
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
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Clock size={14} className="text-gray-400"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auto-backup-et (çdo 3 ore, {autoBackups.length}/3 të fundit)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {autoBackups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-500">Nuk ka auto-backup-e ende</p>
                <p className="text-xs text-gray-400 mt-1">Auto-backup-et do të krijohen automatikisht çdo 3 ore (edhe u shkarkojnë vetë si file .gz)</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {autoBackups.map((backup, idx) => (
                  <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        Backup #{autoBackups.length - idx}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatBackupTime(backup.exportDate)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
                        className="btn btn-outline btn-sm text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1"
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
        {showAutoBackupConfirm && restoreData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Konfirmo Rivendosjen e Auto-Backup-it</p>
              <p className="text-xs text-amber-800 mb-3">
                Kjo do të zëvendësojë të gjitha të dhënat e tanishme:
              </p>
              <ul className="text-xs text-amber-800 space-y-1 mb-4">
                <li>• Faturat: {restoreData.invoices?.length || 0}</li>
                <li>• Klientët: {restoreData.customers?.length || 0}</li>
                <li>• Produktet: {restoreData.items?.length || 0}</li>
                <li>• Pagesat: {restoreData.payments?.length || 0}</li>
                <li>• Shpenzimet: {restoreData.expenses?.length || 0}</li>
                <li>• Furnitorët: {restoreData.vendors?.length || 0}</li>
                <li>• Përdoruesit: {restoreData.users?.length || 0}</li>
              </ul>
              {restoreData.tasks?.length > 0 && (
                <p className="text-xs text-amber-700 mb-3">
                  ℹ️ Backup-i ka {restoreData.tasks.length} detyra — ato NUK rivendosen automatikisht.
                </p>
              )}
              <p className="text-xs text-blue-600 font-semibold">Kjo nuk mund të rikthehej!</p>
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
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Zona e rrezikshme</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
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
