import { useEffect } from 'react'
import raw from './translations.txt?raw'

/* ══════════════════════════════════════════════════════════
   Ndërrimi i gjuhës së ndërfaqes (Cilësimet → Gjuha).
   Teksti origjinal është shqip; kur zgjidhet gjuhë tjetër, tekstet e shfaqura
   zëvendësohen sipas fjalorit te translations.txt (tekst i plotë → përkthim).
   Çfarë NUK përkthehet: emrat/të dhënat e përdoruesit (klientë, fatura...) dhe
   tekstet që s'janë në fjalor. Rikthimi te "Shqip" i kthen të gjitha siç ishin.
══════════════════════════════════════════════════════════ */

const LANG_INDEX = { Shqip: null, Anglisht: 0, Italisht: 1, Gjermanisht: 2, 'Frëngjisht': 3 }
const LANG_CODE  = { Shqip: 'sq', Anglisht: 'en', Italisht: 'it', Gjermanisht: 'de', 'Frëngjisht': 'fr' }
const ATTRS = ['placeholder', 'title', 'aria-label']

const norm = s => s.replace(/\s+/g, ' ').trim()

// sq → [en, it, de, fr]
const DICT = new Map()
for (const line of raw.split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  const parts = line.split(' | ').map(s => s.trim())
  if (parts.length < 5 || !parts[0]) continue
  if (!DICT.has(parts[0])) DICT.set(parts[0], parts.slice(1, 5))
}

function translateText(str, idx) {
  const m = str.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!m[2]) return null
  const entry = DICT.get(norm(m[2]))
  return entry && entry[idx] ? m[1] + entry[idx] + m[3] : null
}

function readLanguage(storageKey) {
  try {
    const d = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return LANG_INDEX[d.gjuha] !== undefined ? d.gjuha : 'Shqip'
  } catch { return 'Shqip' }
}

export default function AutoTranslate({ storageKey }) {
  useEffect(() => {
    let lang = readLanguage(storageKey)
    let idx = LANG_INDEX[lang]
    const textRec = new WeakMap()   // Text node  -> { orig, shown }
    const attrRec = new WeakMap()   // Element    -> { [attr]: { orig, shown } }

    const processText = (node) => {
      const cur = node.nodeValue
      const rec = textRec.get(node)
      if (rec && cur === rec.shown) {
        if (idx === null) { node.nodeValue = rec.orig; textRec.delete(node) }
        else {
          const t = translateText(rec.orig, idx)
          if (t !== null && t !== cur) { node.nodeValue = t; rec.shown = t }
        }
        return
      }
      if (rec) textRec.delete(node)   // React vendosi tekst të ri shqip
      if (idx === null) return
      const t = translateText(cur, idx)
      if (t !== null) { textRec.set(node, { orig: cur, shown: t }); node.nodeValue = t }
    }

    const processAttrs = (el) => {
      let recs = attrRec.get(el)
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue
        const cur = el.getAttribute(a)
        const rec = recs && recs[a]
        if (rec && cur === rec.shown) {
          if (idx === null) { el.setAttribute(a, rec.orig); delete recs[a] }
          else {
            const t = translateText(rec.orig, idx)
            if (t !== null && t !== cur) { el.setAttribute(a, t); rec.shown = t }
          }
          continue
        }
        if (rec) delete recs[a]
        if (idx === null) continue
        const t = translateText(cur, idx)
        if (t !== null) {
          if (!recs) { recs = {}; attrRec.set(el, recs) }
          recs[a] = { orig: cur, shown: t }
          el.setAttribute(a, t)
        }
      }
    }

    const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'])
    const walk = (root) => {
      if (root.nodeType === 3) { processText(root); return }
      if (root.nodeType !== 1 || SKIP.has(root.tagName)) return
      processAttrs(root)
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeType === 1 && SKIP.has(n.tagName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      })
      let n = tw.nextNode()
      while (n) {
        if (n.nodeType === 3) processText(n)
        else processAttrs(n)
        n = tw.nextNode()
      }
    }

    let pending = new Set()
    let raf = 0
    const flush = () => {
      raf = 0
      const items = pending; pending = new Set()
      items.forEach(n => { if (n.isConnected || n.nodeType === 3) walk(n) })
    }
    const schedule = (n) => { pending.add(n); if (!raf) raf = requestAnimationFrame(flush) }

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') schedule(m.target)
        else if (m.type === 'attributes') schedule(m.target)
        else m.addedNodes.forEach(schedule)
      }
    })

    const apply = () => {
      document.documentElement.lang = LANG_CODE[lang] || 'sq'
      walk(document.body)
    }

    const onLangChange = (e) => {
      const next = (e && e.detail) || readLanguage(storageKey)
      if (LANG_INDEX[next] === undefined) return
      lang = next; idx = LANG_INDEX[next]
      apply()
    }

    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    })
    window.addEventListener('app-language-change', onLangChange)
    apply()

    return () => {
      observer.disconnect()
      window.removeEventListener('app-language-change', onLangChange)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [storageKey])

  return null
}
