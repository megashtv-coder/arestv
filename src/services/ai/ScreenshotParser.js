/**
 * ScreenshotParser.js
 * Reads a contact-card screenshot (WhatsApp, phone contacts, any chat app) and
 * pulls out customer fields — no paid AI/vision API involved. OCR (Tesseract.js,
 * MIT-licensed, runs entirely client-side via WebAssembly) turns the image into
 * text; the rest is regex, same style as EntityExtractor.js's text-command
 * parsing. First use downloads Tesseract's small English model from its public
 * CDN (a few MB, then cached by the browser) — no API key, no per-request cost.
 *
 * The layout varies between apps, but the fields always sit close together:
 * name, phone number, then the note holding "MAC (/ device key) + app name".
 * So the parser anchors on the phone line and the MAC line and reads their
 * neighbours instead of relying on a fixed line order.
 */

import { createWorker } from 'tesseract.js'
import { detectCountryFromPhone } from './PhoneCountry'

// Chrome/WhatsApp-Web UI labels that show up on a contact card but are never
// the contact's name (or the app name) — skip these when guessing either.
const UI_NOISE = [
  'voice', 'video', 'search', 'contact info', 'media, links, and docs',
  'mute notifications', 'disappearing messages', 'encryption', 'block',
  'report contact', 'add to favourites', 'add to favorites', 'share contact',
  'starred messages', 'chat lock', 'export chat', 'clear chat', 'delete chat',
]
// Single-word UI labels — matched against the whole line only, so a real name
// that merely contains one of these letters never gets dropped.
const EXACT_NOISE = new Set([
  'mobile', 'notes', 'note', 'home', 'work', 'phone', 'whatsapp', 'message',
  'call', 'email', 'edit', 'share', 'about', 'details', 'contact', 'voce',
])

// Strict MAC: six hex pairs, ":" or "-" separated.
// (No lookbehind in these patterns — older iOS Safari refuses to even parse it;
// the token is capture group 1 and `grab` gives its text and position.)
const MAC_RE = /(?:^|[^0-9A-Za-z])((?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2})(?![0-9A-Za-z])/
// Loose MAC: six alphanumeric pairs, ":" or ";" separated (OCR often misreads
// a hex digit as a letter, and some devices show non-hex ids in this format).
const MAC_LOOSE_RE = /(?:^|[^0-9A-Za-z])((?:[0-9A-Za-z]{2}\s?[:;]\s?){5}[0-9A-Za-z]{2})(?![0-9A-Za-z])/
// Some notes carry a device key after the MAC: "20:72:a9:29:19:2e / 309971"
const DEVICE_KEY_RE = /^\s*[/|]\s*(\d{4,8})\b/
const PHONE_RE = /(?:\+|00)\d[\d\s().-]{6,}\d/
// No "+"/"00" prefix: a long digit run on its own (never inside a MAC/time).
const PHONE_BARE_RE = /(?:^|[^\d:])(\d[\d\s().-]{7,}\d)(?![\d:])/

function grab(re, line) {
  const m = line.match(re)
  if (!m) return null
  const text = m[1] ?? m[0]
  return { text, index: m.index + m[0].indexOf(text) }
}
// "Updated today at 9:27 PM" — WhatsApp's edit-timestamp line, sits right
// next to the MAC/app note and would otherwise get mistaken for the app name.
const TIMESTAMP_LINE_RE = /\b(updated|edited)\b|\b(today|yesterday)\s+at\b/i

// Apps already used in the customer list, with the spelling to write back.
const KNOWN_APPS = [
  'Ibo Player', 'Smart IPTV', 'Netiptv', 'Ibo Predator', 'Ibo Pro', 'SS IPTV',
  'MAG', 'Predator', 'm3u', 'Bob Player', 'Set IPTV', 'STB', 'Smart ONE',
  'Tivimate', 'Smarters IPTV', 'IPTV Extreme', 'VU Player Pro', 'X Player',
  'Flix IPTV', 'Smarters',
]

const appKey = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function editDistanceAtMost1(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  const [long, short] = a.length > b.length ? [a, b] : [b, a]
  return long.slice(i + 1) === short.slice(i)
}

// Returns the known app's spelling when the text IS that app (OCR slips of one
// character tolerated for names of 6+ letters), otherwise ''.
function matchKnownApp(text) {
  const key = appKey(text)
  if (!key) return ''
  const exact = KNOWN_APPS.find(a => appKey(a) === key)
  if (exact) return exact
  const near = KNOWN_APPS.filter(a => {
    const k = appKey(a)
    return k.length >= 6 && editDistanceAtMost1(k, key)
  })
  return near.length === 1 ? near[0] : ''
}

function isUiNoise(line) {
  const lower = line.trim().toLowerCase()
  return EXACT_NOISE.has(lower) || UI_NOISE.some(noise => lower.includes(noise))
}

// A line the app-name guess should never land on — reused for whichever
// line ends up adjacent to the MAC address.
function isAppNameNoise(line) {
  if (!line) return true
  const trimmed = line.trim()
  if (!trimmed) return true
  if (isMacLine(trimmed) || findPhone(trimmed)) return true
  if (TIMESTAMP_LINE_RE.test(trimmed)) return true
  if (!/[\p{L}\p{N}]{2,}/u.test(trimmed)) return true // icon glyphs: "% [m] Q"
  return isUiNoise(trimmed)
}

const isMacLine = line => MAC_RE.test(line) || MAC_LOOSE_RE.test(line)

function findPhone(line) {
  const m = grab(PHONE_RE, line) || grab(PHONE_BARE_RE, line)
  if (!m) return ''
  const phone = m.text.trim().replace(/[\s().-]+$/, '')
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? phone : ''
}

// OCR often turns hex digits into look-alike letters (O→0, l→1, S→5...). Repair
// only when the result is a valid hex MAC — otherwise keep what the screen says.
const LOOKALIKE = { O: '0', Q: '0', I: '1', L: '1', S: '5', Z: '2', G: '6' }
function normalizeMac(raw) {
  const groups = raw.toUpperCase().replace(/[-;\s]/g, ':').split(':').filter(Boolean)
  if (groups.every(g => /^[0-9A-F]{2}$/.test(g))) return { mac: groups.join(':'), valid: true, repaired: false }
  const fixed = groups.map(g => g.split('').map(c => LOOKALIKE[c] || c).join(''))
  if (fixed.every(g => /^[0-9A-F]{2}$/.test(g))) return { mac: fixed.join(':'), valid: true, repaired: true }
  return { mac: groups.join(':'), valid: false, repaired: false }
}

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

  // Phone number — first line holding a number (the "+49 …" / "0049 …" form wins
  // over a bare digit run).
  let phoneLineIndex = lines.findIndex(l => PHONE_RE.test(l) && findPhone(l))
  if (phoneLineIndex === -1) phoneLineIndex = lines.findIndex(l => !isMacLine(l) && !TIMESTAMP_LINE_RE.test(l) && findPhone(l))
  let phone = phoneLineIndex !== -1 ? findPhone(lines[phoneLineIndex]) : ''
  if (phone.startsWith('00')) phone = '+' + phone.slice(2).trim()
  if (!phone) warnings.push('S\'u gjet numri i telefonit.')
  else if (!phone.startsWith('+')) warnings.push('Numri s\'ka kod shteti — kontrolloje.')

  // Country from the phone's calling code
  const countryMatch = phone.startsWith('+') ? detectCountryFromPhone(phone) : null
  const country = countryMatch?.country || ''

  // Name — the line closest to the phone (above it first, that's where every
  // contact card puts it); skips the phone, the MAC line, UI text, the app
  // name and the avatar's initials ("AD").
  const isNameCandidate = l => {
    if (isMacLine(l) || findPhone(l) || isUiNoise(l) || TIMESTAMP_LINE_RE.test(l)) return false
    if (matchKnownApp(l)) return false
    if (/^[A-Z]{1,3}$/.test(l)) return false
    return /[\p{L}]{2,}/u.test(l)
  }
  const candidates = lines.map((l, i) => ({ l, i })).filter(({ l }) => isNameCandidate(l))
  const above = phoneLineIndex === -1 ? [] : candidates.filter(c => c.i < phoneLineIndex)
  const picked = above.length ? above[above.length - 1] : candidates[0]
  const name = picked ? picked.l.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').trim() : ''
  if (!name) warnings.push('S\'u gjet emri — plotësoje dorazi.')

  // MAC address + app name. Layouts seen in practice:
  //  1) same line, dash-separated: "64:1C:B0:A0:DA:38 - Ibo Player"
  //  2) separate lines, order not guaranteed: the app name can be the line
  //     right before OR right after the MAC line, e.g.:
  //       6b:bc:a6:2f:6f:75
  //       Ibo Player
  //       Updated today at 9:27 PM   <- must not be mistaken for the app name
  //  3) MAC followed by a device key: "20:72:a9:29:19:2e / 309971"
  let macAddress = ''
  let app = ''
  const strictIndex = lines.findIndex(l => MAC_RE.test(l))
  const macLineIndex = strictIndex !== -1 ? strictIndex : lines.findIndex(l => MAC_LOOSE_RE.test(l))
  if (macLineIndex !== -1) {
    const macLine = lines[macLineIndex]
    const macMatch = grab(strictIndex !== -1 ? MAC_RE : MAC_LOOSE_RE, macLine)
    const { mac, valid, repaired } = normalizeMac(macMatch.text)
    macAddress = mac
    if (!valid) warnings.push('MAC adresa ka shkronja jashtë A–F — kontrolloje foton.')
    else if (repaired) warnings.push('MAC adresa u korrigjua nga OCR — kontrolloje.')

    let afterMac = macLine.slice(macMatch.index + macMatch.text.length)
    const keyMatch = afterMac.match(DEVICE_KEY_RE)
    if (keyMatch) {
      macAddress += ` / ${keyMatch[1]}`
      afterMac = afterMac.slice(keyMatch[0].length)
    }

    // WhatsApp's pencil/✓ icons sit far to the right — a wide gap, or (if OCR
    // reads them tight) a trailing "V4"-style token that is not a word.
    const tail = afterMac.split(/\s{2,}/)[0]
    const dashMatch = tail.match(/[-–—]\s*(.+)/)
    const tokens = (dashMatch ? dashMatch[1] : tail).replace(/[^\p{L}\p{N}]+$/u, '').trim().split(/\s+/)
    while (tokens.length > 1 && tokens[tokens.length - 1].length <= 2) tokens.pop() // icon read as "V4"
    const sameLine = tokens.join(' ')
    if (dashMatch ? /\p{L}{2,}/u.test(sameLine) : (matchKnownApp(sameLine) || /\p{L}{3,}/u.test(sameLine))) {
      app = sameLine
    }

    if (!app) {
      const around = [lines[macLineIndex + 1], lines[macLineIndex - 1]]
      app = around.find(l => !isAppNameNoise(l) && matchKnownApp(l)) ||
            around.find(l => !isAppNameNoise(l) && l !== name) || ''
      app = app.trim()
    }
  } else {
    warnings.push('S\'u gjet MAC adresa — kontrollo foton ose plotësoje dorazi.')
  }

  // No MAC (or nothing next to it): a line that IS a known app is still the app.
  if (!app) {
    app = lines.find((l, i) => i !== phoneLineIndex && l !== name && !isMacLine(l) && matchKnownApp(l)) || ''
  }
  if (app) app = matchKnownApp(app) || app
  else if (macLineIndex !== -1) warnings.push('S\'u gjet emri i aplikacionit — plotësoje dorazi.')

  return { name, phone, country, app, macAddress, warnings }
}
