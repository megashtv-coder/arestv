import { useState, useRef, useEffect } from 'react'
import { Save, LogOut, Shield, Bell, Building2, Globe, MessageCircle, Download, Upload, Clock, Trash2 } from 'lucide-react'
import { Toggle } from '../components/UI'
import { useApp } from '../context/AppContext'
import BackupService from '../services/BackupService'

export default function Settings() {
  const { showToast, paymentModes, setPaymentModes, depositAccounts, setDepositAccounts, logout, invoices, customers, items, payments, expenses, users, setInvoices, setCustomers, setItems, setPayments, setExpenses } = useApp()
  const fileInputRef = useRef(null)
  const [toggles, setToggles] = useState({
    emailNotif: true, smsNotif: false, autoInvoice: true,
    twofa: false, darkReports: false, weeklyDigest: true,
    autoWhatsApp: true,
  })
  const [advanceDays, setAdvanceDays] = useState(() => {
    const saved = localStorage.getItem('xflow_notif_advance_days')
    return saved ? parseInt(saved) : 7
  })
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [restoreData, setRestoreData] = useState(null)
  const [autoBackups, setAutoBackups] = useState([])
  const [showAutoBackupConfirm, setShowAutoBackupConfirm] = useState(false)
  const [selectedAutoBackup, setSelectedAutoBackup] = useState(null)
  const tog = k => setToggles(p => ({ ...p, [k]: !p[k] }))

  // Load auto-backups on mount
  useEffect(() => {
    const backups = BackupService.getAutoBackups()
    setAutoBackups(backups)
  }, [])

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

  const handleDownloadBackup = () => {
    const appState = {
      invoices,
      customers,
      items,
      payments,
      expenses,
      users,
    }
    const result = BackupService.downloadBackup(appState)
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

  const handleConfirmRestore = () => {
    if (!restoreData) return

    try {
      setInvoices(restoreData.invoices)
      setCustomers(restoreData.customers)
      setItems(restoreData.items)
      setPayments(restoreData.payments)
      setExpenses(restoreData.expenses)

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
      setInvoices(restoreData.invoices)
      setCustomers(restoreData.customers)
      setItems(restoreData.items)
      setPayments(restoreData.payments)
      setExpenses(restoreData.expenses)

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
                <p className="text-xs text-gray-400 mt-0.5">Shkarko të gjitha të dhënat si JSON file</p>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="btn btn-outline btn-sm flex items-center gap-1.5"
              >
                <Download size={13}/>Shkarko
              </button>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">Rivendos Backup</p>
                <p className="text-xs text-gray-400 mt-0.5">Importo të dhënat nga JSON file</p>
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
              accept=".json"
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
              </ul>
              <p className="text-xs text-red-600 font-semibold">Kjo nuk mund të rikthehej!</p>
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auto-backup-et (çdo 3 ore)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {autoBackups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-500">Nuk ka auto-backup-e ende</p>
                <p className="text-xs text-gray-400 mt-1">Auto-backup-et do të krijohen automatikisht çdo 3 ore</p>
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
                        className="btn btn-outline btn-sm text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"
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
              </ul>
              <p className="text-xs text-red-600 font-semibold">Kjo nuk mund të rikthehej!</p>
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
