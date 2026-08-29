/**
 * PhoneCountry.js
 * Detects a country from a phone number's calling-code prefix. Pure lookup,
 * no network/API — sorted longest-prefix-first so e.g. "383" (Kosovë) isn't
 * shadowed by a shorter code that happens to also match its start.
 */

const CALLING_CODES = [
  ['383', 'Kosovë'], ['355', 'Shqipëri'], ['389', 'Maqedoni e Veriut'],
  ['382', 'Mal i Zi'], ['381', 'Serbi'], ['385', 'Kroaci'], ['386', 'Slloveni'],
  ['387', 'Bosnjë e Hercegovinë'], ['30', 'Greqi'], ['39', 'Itali'], ['49', 'Gjermani'],
  ['41', 'Zvicër'], ['43', 'Austri'], ['33', 'Francë'], ['32', 'Belgjikë'],
  ['31', 'Holandë'], ['44', 'Britani e Madhe'], ['46', 'Suedi'], ['47', 'Norvegji'],
  ['45', 'Danimarkë'], ['358', 'Finlandë'], ['34', 'Spanjë'], ['351', 'Portugali'],
  ['90', 'Turqi'], ['1', 'SHBA / Kanada'], ['61', 'Australi'], ['7', 'Rusi'],
  ['48', 'Poloni'], ['420', 'Republika Çeke'], ['36', 'Hungari'], ['40', 'Rumani'],
].sort((a, b) => b[0].length - a[0].length)

/**
 * @param {string} phone - any format, with or without leading "+"
 * @returns {{code: string, country: string} | null}
 */
export function detectCountryFromPhone(phone) {
  const digits = (phone || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const match = CALLING_CODES.find(([code]) => digits.startsWith(code))
  return match ? { code: match[0], country: match[1] } : null
}
