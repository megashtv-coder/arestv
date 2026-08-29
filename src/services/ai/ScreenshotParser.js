/**
 * ScreenshotParser.js
 * Reads a WhatsApp contact-card screenshot and pulls out customer fields —
 * no paid AI/vision API involved. OCR (Tesseract.js, MIT-licensed, runs
 * entirely client-side via WebAssembly) turns the image into text; the rest
 * is regex, same style as EntityExtractor.js's text-command parsing. First
 * use downloads Tesseract's small English model from its public CDN (a few
 * MB, then cached by the browser) — no API key, no per-request cost.
 */

import { createWorker } from 'tesseract.js'
import { detectCountryFromPhone } from './PhoneCountry'

// Chrome/WhatsApp-Web UI labels that show up on a contact card but are never
// the contact's name — skip these when guessing which line is the name.
const UI_NOISE = [
  'voice', 'video', 'search', 'contact info', 'media, links, and docs',
  'mute notifications', 'disappearing messages', 'encryption', 'block',
  'report contact', 'add to favourites', 'add to favorites', 'share contact',
  'starred messages', 'chat lock', 'export chat', 'clear chat', 'delete chat',
]

const MAC_RE = /\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/
const PHONE_RE = /\+\d[\d\s().-]{6,}\d/

/**
 * @param {File|Blob} imageFile
 * @param {(progress: {status: string, progress: number}) => void} [onProgress]
 * @returns {Promise<string>} raw OCR text
 */
export async function extractTextFromImage(imageFile, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: onProgress ? (m) => onProgress(m) : undefined,
  })
  try {
    const { data } = await worker.recognize(imageFile)
    return data.text || ''
  } finally {
    await worker.terminate()
  }
}

/**
 * @param {string} rawText - OCR output
 * @returns {{name: string, phone: string, country: string, app: string,
 *   macAddress: string, warnings: string[]}}
 */
export function parseContactFromText(rawText) {
  const lines = (rawText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const warnings = []

  // MAC address + app name ("64:1C:B0:A0:DA:38 - Ibo Player")
  let macAddress = ''
  let app = ''
  const macLine = lines.find(l => MAC_RE.test(l))
  if (macLine) {
    macAddress = macLine.match(MAC_RE)[0].toUpperCase().replace(/-/g, ':')
    const afterMac = macLine.slice(macLine.search(MAC_RE) + macAddress.length)
    const appMatch = afterMac.match(/[-–—]\s*(.+)/)
    if (appMatch) {
      app = appMatch[1]
        .split(/\s{2,}/)[0]              // WhatsApp's emoji/✓ icons sit far to
        .replace(/[^\p{L}\p{N}]+$/u, '') // the right — a wide gap, or (if OCR
        .trim()                          // reads them tight) trailing symbols
    }
  } else {
    warnings.push('S\'u gjet MAC adresa — kontrollo foton ose plotësoje dorazi.')
  }

  // Phone number — first "+..." token anywhere in the text
  const phoneMatch = rawText?.match(PHONE_RE)
  const phone = phoneMatch ? phoneMatch[0].trim() : ''
  if (!phone) warnings.push('S\'u gjet numri i telefonit.')

  // Country from the phone's calling code
  const countryMatch = phone ? detectCountryFromPhone(phone) : null
  const country = countryMatch?.country || ''

  // Name — first line that isn't the phone, the MAC line, or known WA UI text
  const name = lines.find(l => {
    if (MAC_RE.test(l) || PHONE_RE.test(l)) return false
    const lower = l.toLowerCase()
    if (UI_NOISE.some(noise => lower.includes(noise))) return false
    return /[a-zA-ZëçÇË]{2,}/.test(l)
  }) || ''
  if (!name) warnings.push('S\'u gjet emri — plotësoje dorazi.')

  return { name, phone, country, app, macAddress, warnings }
}
