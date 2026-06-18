/**
 * Backup Service
 * Handles export and import of all application data
 */

export function exportAllData(appState) {
  // Prepare backup data with timestamp and version
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      invoices: appState.invoices || [],
      customers: appState.customers || [],
      items: appState.items || [],
      payments: appState.payments || [],
      expenses: appState.expenses || [],
      users: appState.users || [],
    },
  }

  return backup
}

export function downloadBackup(appState) {
  try {
    const backup = exportAllData(appState)
    const jsonString = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // Create download link
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `arestv-backup-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, message: 'Backup u shkarko me sukses' }
  } catch (error) {
    console.error('Backup download error:', error)
    return { success: false, message: 'Gabim gjatë shkarkimit të backup-it' }
  }
}

export function validateBackupFile(jsonData) {
  // Check if it's a valid backup file
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
    // Validate the backup file
    const validation = validateBackupFile(jsonData)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    // Return the imported data
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

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result)
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Fichier-i nuk është JSON i vlefshëm'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Gabim në leximin e fichierit'))
    }

    reader.readAsText(file)
  })
}

// Auto-backup functions
const AUTOBACKUP_KEY = 'arestv_autobackups'
const MAX_AUTOBACKUPS = 5 // Keep last 5 auto-backups

export function createAutoBackup(appState) {
  try {
    const backup = exportAllData(appState)
    backup.isAutoBackup = true

    // Get existing auto-backups
    const backups = getAutoBackups()

    // Add new backup to the list
    backups.push(backup)

    // Keep only the last MAX_AUTOBACKUPS
    if (backups.length > MAX_AUTOBACKUPS) {
      backups.shift() // Remove oldest
    }

    // Save to localStorage
    localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify(backups))

    // Also download to disk automatically
    downloadAutoBackupToDisk(backup)

    return { success: true, message: 'Auto-backup u kriju me sukses' }
  } catch (error) {
    console.error('Auto-backup creation error:', error)
    return { success: false, message: 'Gabim në krijimin e auto-backup-it' }
  }
}

export function downloadAutoBackupToDisk(backup) {
  try {
    const jsonString = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // Create timestamp for filename
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: YYYY-MM-DDTHH-mm-ss
    const filename = `arestv-autobackup-${timestamp}.json`

    // Create and trigger download
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
  exportAllData,
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
