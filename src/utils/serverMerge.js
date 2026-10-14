/**
 * Bashkon ndryshimet që erdhën nga serveri (bërë nga një pajisje tjetër) me gjendjen lokale, PA humbur
 * asnjë ndryshim lokal që s'është ruajtur ende.
 *
 *  local     — vargu aktual në gjendjen e aplikacionit
 *  base      — `prevRef.current` i diffSync (çka dihet se është në databazë; referenca të njëjta me `local`
 *              për objektet e pandryshuara — diffSync krahason me referencë, jo me përmbajtje)
 *  changed   — rreshtat e serverit të ndryshuar kohët e fundit (data._synced > koha e fundit)
 *  remoteIds — (opsionale) bashkësia e TË GJITHA id-ve në server; vetëm kur kontrollohen edhe fshirjet
 *
 * Kthen null nëse s'ka asgjë për të ndryshuar, ose { merged, newBase, added, updated, removed }:
 *   • merged  → gjendja e re lokale
 *   • newBase → vlera e re e `prevRef.current` — e ndërtuar që diffSync të ngarkojë NJË herë më shumë
 *               vetëm ndryshimet lokale ende të paruajtura (dhe të fshijë vetëm fshirjet lokale të paruajtura).
 */
const IGNORED = new Set(['_synced'])

// JSON me çelësa të renditur dhe pa _synced — Postgres jsonb i rendit çelësat ndryshe nga objekti lokal
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter(k => !IGNORED.has(k)).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}
export const sameContent = (a, b) => stable(a) === stable(b)

export function mergeServerChanges({ local, base, changed, remoteIds = null }) {
  const baseById    = new Map(base.map(i => [i.id, i]))
  const localIds    = new Set(local.map(i => i.id))
  const changedById = new Map(changed.map(i => [i.id, i]))

  const merged  = []
  const newBase = []
  let added = 0, updated = 0, removed = 0

  for (const l of local) {
    const b = baseById.get(l.id)
    const c = changedById.get(l.id)

    // U fshi nga një pajisje tjetër? (vetëm kur kemi listën e plotë të id-ve)
    if (remoteIds && !remoteIds.has(l.id)) {
      if (b && l === b) { removed++; continue }   // e ruajtur më parë dhe e paprekur lokalisht → hiqe
      merged.push(l)                              // e re/ndryshuar lokalisht, ende e paruajtur → mbaje (do ngarkohet)
      continue
    }

    if (c && !sameContent(c, l)) {
      if (b && l === b) { merged.push(c); newBase.push(c); updated++ }   // lokalisht e paprekur → merr versionin e serverit
      else { merged.push(l); newBase.push(c) }                            // ndryshim lokal i paruajtur → fiton lokali (do ngarkohet)
      continue
    }

    merged.push(l)
    if (b) newBase.push(b)   // bazë e pandryshuar (e njëjta referencë me l nëse s'ka ndryshim lokal)
  }

  // Rreshta që ekzistojnë në server por jo lokalisht
  const fresh = []
  for (const c of changed) {
    if (localIds.has(c.id)) continue
    if (baseById.has(c.id)) { newBase.push(c); continue }   // e fshirë lokalisht (e paruajtur) → lëre në bazë që fshirja të ngarkohet
    fresh.push(c); newBase.push(c); added++
  }
  fresh.sort((x, y) => String(y._synced || '').localeCompare(String(x._synced || '')))
  merged.unshift(...fresh)

  // Fshirjet lokale të paruajtura që s'janë prekur nga serveri mbeten në bazë (përveç nëse serveri i ka fshirë vetë)
  for (const b of base) {
    if (localIds.has(b.id) || changedById.has(b.id)) continue
    if (remoteIds && !remoteIds.has(b.id)) continue
    newBase.push(b)
  }

  if (!added && !updated && !removed) return null
  return { merged, newBase, added, updated, removed }
}
