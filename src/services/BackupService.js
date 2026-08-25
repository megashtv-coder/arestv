/**
 * Backup Service
 * Handles export and import of all application data
 */

import { supabase } from '../lib/supabase'

const BACKUP_VERSION = '2.0'

/* ══════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════ */

function readLocalJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// 'tasks' jetojnë vetëm në Supabase, jo në AppContext — merren drejtpërdrejt
async function fetchTasks() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from('tasks').select('*')
    if (error) {
      console.error('Backup: gabim gjatë marrjes së detyrave:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Backup: exception gjatë marrjes së detyrave:', error)
    return []
  }
}

// Gzip me native CompressionStream — nëse browser-i s'e mbështet, kthehet JSON i pakompresuar
async function compressToBlob(obj) {
  const jsonString = JSON.stringify(obj)
  if (typeof CompressionStream === 'undefined') {
    return { blob: new Blob([jsonString], { type: 'application/json' }), compressed: false }
  }
  const stream = new Blob([jsonString], { type: 'application/json' }).stream().pipeThrough(new CompressionStream('gzip'))
  const blob = await new Response(stream).blob()
  return { blob, compressed: true }
}

/* ══════════════════════════════════════════════════════════
   Export
══════════════════════════════════════════════════════════ */

// Mbledh ÇDO të dhënë të vendosur në app: entitetet e biznesit (Supabase),
// 'tasks' (Supabase, e veçantë nga AppContext), dhe cilësimet/log-jet lokale
// (localStorage) që s'kalonin fare në backup më parë.
export async function buildBackupPayload(appState) {
  const tasks = await fetchTasks()

  return {
    version: BACKUP_VERSION,
    exportDate: new Date().toISOString(),
    data: {
      invoices:        appState.invoices        || [],
      customers:       appState.customers       || [],
      items:           appState.items           || [],
      payments:        appState.payments        || [],
      expenses:        appState.expenses        || [],
      vendors:         appState.vendors         || [],
      transfers:       appState.transfers       || [],
      users:           appState.users           || [],
      organizations:   appState.organizations   || [],
      activityLog:     appState.activityLog     || [],
      representatives: appState.representatives || [],
      paymentModes:    appState.paymentModes    || [],
      depositAccounts: appState.depositAccounts || [],
      tasks,
      companyData:      readLocalJSON('arestv_company_data', null),
      notifAdvanceDays: readLocalJSON('arestv_notif_advance_days', null),
      messageLogs:      readLocalJSON('arestv_message_logs', []),
    },
  }
}

export async function downloadBackup(appState) {
  try {
    const backup = await buildBackupPayload(appState)
    const { blob, compressed } = await compressToBlob(backup)
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `arestv-backup-${timestamp}.json${compressed ? '.gz' : ''}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, message: 'Backup u shkarko me sukses', backup }
  } catch (error) {
    console.error('Backup download error:', error)
    return { success: false, message: 'Gabim gjatë shkarkimit të backup-it' }
  }
}

/* ══════════════════════════════════════════════════════════
   Import
══════════════════════════════════════════════════════════ */

export function validateBackupFile(jsonData) {
  if (!jsonData.version) {
    return { valid: false, error: 'Format i pavlefshëm - mungon versioni' }
  }

  if (!jsonData.data) {
    return { valid: false, error: 'Format i pavlefshëm - mungon data' }
  }

  const requiredFields = ['invoices', 'customers', 'items', 'payments', 'expenses']
  const missingFields = requiredFields.filter(field => !(field in jsonData.data))

  if (missingFields.length > 0) {
    return { valid: false, error: `Mungojnë fushat: ${missingFields.join(', ')}` }
  }

  return { valid: true }
}

export function importBackup(jsonData) {
  try {
    const validation = validateBackupFile(jsonData)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    return {
      success: true,
      data: jsonData.data,
      message: 'Backup u importua me sukses',
    }
  } catch (error) {
    console.error('Backup import error:', error)
    return { success: false, message: 'Gabim gjatë importimit të backup-it' }
  }
}

// Lexon file-in e backup-it — mbështet edhe .json të thjeshtë edhe .json.gz
// (detektim automatik nga magic bytes të gzip, jo nga emri i file-it)
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const buffer = event.target.result
        const bytes = new Uint8Array(buffer)
        const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b

        let text
        if (isGzip) {
          if (typeof DecompressionStream === 'undefined') {
            reject(new Error('Ky browser nuk mbështet dekompresimin e backup-eve .gz'))
            return
          }
          const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
          text = await new Response(stream).text()
        } else {
          text = new TextDecoder('utf-8').decode(buffer)
        }

        resolve(JSON.parse(text))
      } catch (error) {
        reject(new Error('Fichier-i nuk është JSON i vlefshëm ose backup i dëmtuar'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Gabim në leximin e fichierit'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/* ══════════════════════════════════════════════════════════
   Auto-backup (çdo 48 orë, shih App.jsx)
══════════════════════════════════════════════════════════ */

const AUTOBACKUP_KEY = 'arestv_autobackups'
const MAX_AUTOBACKUPS = 3 // Mban vetëm 3 të fundit në localStorage (backup i plotë tashmë përfshin çdo entitet, kështu zë më shumë vend)

export async function createAutoBackup(appState) {
  try {
    const backup = await buildBackupPayload(appState)
    backup.isAutoBackup = true

    const backups = getAutoBackups()
    backups.push(backup)
    if (backups.length > MAX_AUTOBACKUPS) {
      backups.shift()
    }

    try {
      localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify(backups))
    } catch (quotaError) {
      // localStorage plot (backup-et e plota mund të jenë disa MB) — mbaj vetëm më të fundit
      console.error('Auto-backup: localStorage plot, po ruaj vetëm backup-in më të fundit:', quotaError)
      try {
        localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify([backup]))
      } catch (fallbackError) {
        console.error('Auto-backup: s\'mund të ruhet as edhe një backup në localStorage:', fallbackError)
      }
    }

    // Shkarkim automatik në disk — kopja kryesore, e pavarur nga localStorage
    await downloadAutoBackupToDisk(backup)

    return { success: true, message: 'Auto-backup u kriju me sukses' }
  } catch (error) {
    console.error('Auto-backup creation error:', error)
    return { success: false, message: 'Gabim në krijimin e auto-backup-it' }
  }
}

export async function downloadAutoBackupToDisk(backup) {
  try {
    const { blob, compressed } = await compressToBlob(backup)
    const url = URL.createObjectURL(blob)

    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // YYYY-MM-DDTHH-mm-ss
    const filename = `arestv-autobackup-${timestamp}.json${compressed ? '.gz' : ''}`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log(`✅ Auto-backup downloaded: ${filename}`)
    return { success: true, filename }
  } catch (error) {
    console.error('Auto-backup download error:', error)
    return { success: false, error }
  }
}

export function getAutoBackups() {
  try {
    const stored = localStorage.getItem(AUTOBACKUP_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error retrieving auto-backups:', error)
    return []
  }
}

export function getLatestAutoBackup() {
  const backups = getAutoBackups()
  return backups.length > 0 ? backups[backups.length - 1] : null
}

export function restoreFromAutoBackup(index) {
  try {
    const backups = getAutoBackups()
    if (index < 0 || index >= backups.length) {
      return { success: false, message: 'Backup-i nuk u gjet' }
    }

    const backup = backups[index]
    const validation = validateBackupFile(backup)

    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    return {
      success: true,
      data: backup.data,
      backup: backup,
      message: 'Auto-backup u ngarkua me sukses',
    }
  } catch (error) {
    console.error('Auto-backup restore error:', error)
    return { success: false, message: 'Gabim në ngarkimin e auto-backup-it' }
  }
}

export function deleteAutoBackup(index) {
  try {
    const backups = getAutoBackups()
    if (index < 0 || index >= backups.length) {
      return { success: false, message: 'Backup-i nuk u gjet' }
    }

    backups.splice(index, 1)
    localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify(backups))

    return { success: true, message: 'Backup-i u fshi me sukses' }
  } catch (error) {
    console.error('Auto-backup delete error:', error)
    return { success: false, message: 'Gabim në fshirjen e backup-it' }
  }
}

export function clearAllAutoBackups() {
  try {
    localStorage.removeItem(AUTOBACKUP_KEY)
    return { success: true, message: 'Të gjithë auto-backup-et u fshin' }
  } catch (error) {
    console.error('Error clearing auto-backups:', error)
    return { success: false, message: 'Gabim në fshirjen e auto-backup-ave' }
  }
}

export default {
  buildBackupPayload,
  downloadBackup,
  validateBackupFile,
  importBackup,
  parseBackupFile,
  createAutoBackup,
  downloadAutoBackupToDisk,
  getAutoBackups,
  getLatestAutoBackup,
  restoreFromAutoBackup,
  deleteAutoBackup,
  clearAllAutoBackups,
}
