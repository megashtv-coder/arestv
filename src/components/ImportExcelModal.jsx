import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react'

/* ─────────────────────────────────────────────
   Harta e kolonave për çdo entitet
───────────────────────────────────────────── */
const MAPS = {
  customers: {
    label: 'Klientë',
    fields: [
      { key: 'firstName',   aliases: ['emri', 'first name', 'firstname', 'emër'] },
      { key: 'lastName',    aliases: ['mbiemri', 'last name', 'lastname', 'mbiemër'] },
      { key: 'phone',       aliases: ['telefoni', 'phone', 'tel', 'nr telefoni'] },
      { key: 'email',       aliases: ['email', 'e-mail', 'email adresa'] },
      { key: 'country',     aliases: ['shteti', 'country', 'vendi'] },
      { key: 'app',         aliases: ['app', 'aplikacioni', 'aplikacion'] },
      { key: 'macAddress',  aliases: ['mac', 'mac address', 'mac adresa'] },
      { key: 'referredBy',  aliases: ['referuar nga', 'referred by', 'referral'] },
    ],
    template: [['Emri','Mbiemri','Telefoni','Email','Shteti','App','MAC Address','Referuar nga'],
               ['Ardit','Krasniqi','+38344123456','ardit@email.com','Kosovë','Predator','00:1A:79:28:2D:16',''],
               ['Blerim','Hyseni','+38345678901','blerim@email.com','Kosovë','Predator','00:1A:79:28:2D:17','Ardit Krasniqi'],
               ['Driton','Morina','+38346789012','driton@email.com','Shqipëri','Predator','00:1A:79:28:2D:18',''],
               ['Aleksander','Dushku','+38347890123','aleksander@email.com','Kosovë','Predator','00:1A:79:28:2D:19','Blerim Hyseni'],
               ['Mimoza','Salihu','+38348901234','mimoza@email.com','Shqipëri','Predator','00:1A:79:28:2D:20','Driton Morina']],
    build: (row, idx) => ({
      id:         `CUS-${String(Date.now() + idx).slice(-6)}`,
      firstName:  row.firstName || '',
      lastName:   row.lastName  || '',
      name:       [row.firstName, row.lastName].filter(Boolean).join(' ') || `Klient ${idx+1}`,
      phone:      row.phone      || '',
      email:      row.email      || '',
      country:    row.country    || '',
      app:        row.app        || '',
      macAddress: row.macAddress || '',
      referredBy: row.referredBy || '',
      type:       'individual',
      username:   '',
      panel:      '',
      total:      0,
      invoices:   0,
      color:      COLORS[idx % COLORS.length],
    }),
  },

  invoices: {
    label: 'Fatura',
    fields: [
      { key: 'invoiceId',         aliases: ['numri i fatures', 'invoice id', 'invoice number', 'id faturës', 'nr faturës', 'fatura'] },
      { key: 'customer',          aliases: ['klienti', 'customer', 'emri'] },
      { key: 'date',              aliases: ['data', 'date', 'data faturës'] },
      { key: 'due',               aliases: ['skadenca', 'due', 'due date', 'data skadencës', 'data per pagese'] },
      { key: 'amount',            aliases: ['shuma', 'amount', 'total', 'vlera'] },
      { key: 'status',            aliases: ['statusi', 'status', 'gjendje'] },
      { key: 'referent',          aliases: ['referenti', 'referent', 'sales person', 'person referues', 'salesperson'] },
      { key: 'item',              aliases: ['produkti', 'shërbimi', 'item', 'përshkrimi', 'sherbimi'] },
      { key: 'qty',               aliases: ['sasia', 'qty', 'quantity', 'sasi'] },
      { key: 'price',             aliases: ['çmimi', 'price', 'cmimi'] },
      { key: 'subscriptionExpiry',aliases: ['skadimi abonimit', 'subscription expiry', 'skadim'] },
      { key: 'notifyDate',        aliases: ['data njoftimit', 'notify date', 'njoftim'] },
    ],
    template: [
      ['Data','Numri i fatures','Klienti','Data per pagese:','Shuma','Produkti','Pershkrimi i produktit','Sasia','Çmimi','Skadimi abonimit','Data njoftimit','Statusi'],
      ['2026-01-15','','Ardit Krasniqi','2026-01-20','100','12 muaj abonim','','1','100','2027-01-15','2026-12-15','paid'],
      ['2026-01-16','','Blerim Hyseni','2026-01-25','200','6 muaj abonim','','1','200','2026-07-16','2026-06-16','pending'],
      ['2026-01-17','','Driton Morina','2026-02-05','150','3 muaj abonim','','1','150','2026-04-17','2026-04-10','pending'],
      ['2026-01-18','','Aleksander Dushku','2026-02-15','500','12 muaj abonim - Premium','Paket Premium me suport 24/7','1','500','2027-01-18','2026-12-18','paid'],
      ['','','','','','Setup fee','','1','100','','',''],
    ],
    build: (row, idx) => {
      const subscriptionExpiry = normalizeDate(row.subscriptionExpiry);
      let notifyDate = normalizeDate(row.notifyDate);

      // Default: set notifyDate to 7 days before subscriptionExpiry if not provided
      if (!notifyDate && subscriptionExpiry) {
        const date = new Date(subscriptionExpiry);
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() - 7);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          notifyDate = `${year}-${month}-${day}`;
        }
      }

      return {
        id:                  row.invoiceId && String(row.invoiceId).trim()
          ? String(row.invoiceId).trim().toUpperCase()
          : `INV-${String(Date.now() + idx).padStart(6,'0').slice(-6).padStart(6,'0')}`,
        customer:            row.customer || '',
        referent:            row.referent || '',
        country:             '',
        email:               '',
        amount:              parseFloat(row.amount) || 0,
        status:              normalizeStatus(row.status),
        date:                normalizeDate(row.date),
        due:                 normalizeDate(row.due),
        subscriptionExpiry:  subscriptionExpiry,
        notifyDate:          notifyDate,
        comments:            [],
        items:               row.items || [{
          desc:  row.item  || 'Shërbim',
          qty:   parseInt(row.qty)   || 1,
          price: parseFloat(row.price) || parseFloat(row.amount) || 0,
        }],
      };
    },
  },

  payments: {
    label: 'Pagesa',
    fields: [
      { key: 'date',           aliases: ['data', 'date', 'payment date', 'data pageses', 'data pagesës'] },
      { key: 'invoiceId',      aliases: ['id faturës', 'id fature', 'invoice id', 'invoice number', 'fatura', 'nr fature', 'nr faturës', 'invoice no', 'invoice#'] },
      { key: 'customer',       aliases: ['klienti', 'customer', 'emri', 'customer name', 'emër'] },
      { key: 'amount',         aliases: ['shuma', 'amount', 'total', 'vlera', 'pagesa'] },
      { key: 'fee',            aliases: ['fee', 'komision', 'tarifë', 'tarifa', 'charge'] },
      { key: 'method',         aliases: ['metoda', 'method', 'payment method', 'menyra', 'mënyra', 'payment mode'] },
      { key: 'depositAccount', aliases: ['llogaria', 'account', 'deposit account', 'llogaria e depozitimit'] },
      { key: 'depositedTo',    aliases: ['tek', 'deposited to', 'depozituar tek', 'partner'] },
      { key: 'reference',      aliases: ['referenca', 'reference', 'transaction id', 'id transaksionit', 'ref'] },
      { key: 'notes',          aliases: ['shenime', 'shënime', 'notes', 'komente', 'comment'] },
    ],
    template: [
      ['Data','ID Faturës','Klienti','Shuma','Fee','Metoda','Llogaria','Depozituar tek','Referenca','Shënime'],
      ['2026-01-15','INV-001','Ardit Krasniqi','100','0','PayPal','PayPal - Megaenndy','Enndy','TXN-001-123456',''],
      ['2026-01-16','INV-002','Blerim Hyseni','200','0','Transfer Bankar','Llogaria Banka','Belti','REF-002-789','Depozitim në llogari Belti'],
      ['2026-01-17','INV-003','Driton Morina','150','5','Stripe','Stripe - Megaenndy','Enndy','stripe_ch_123','Komisioni 5%'],
      ['2026-01-18','INV-004','Aleksander Dushku','500','10','PayPal','PayPal - Megaenndy','Enndy','TXN-004-654321','Premium payment'],
      ['2026-01-20','INV-001','Ardit Krasniqi','50','0','Kesh','Kesh - Enndy','Enndy','','Pagesa e dytë'],
    ],
    build: (row, idx) => {
      const amount = parseFloat(row.amount) || 0
      const fee    = parseFloat(row.fee)    || 0
      return {
        id:             `PAY-${String(Date.now() + idx).slice(-8)}`,
        invoiceId:      (row.invoiceId  || '').toString().trim(),
        customer:       (row.customer   || '').toString().trim(),
        amount,
        fee,
        net:            amount - fee,
        date:           normalizeDate(row.date),
        method:         normalizeMethod(row.method),
        depositAccount: (row.depositAccount  || '').toString().trim(),
        depositedTo:    normalizeDepositedTo(row.depositedTo),
        reference:      (row.reference       || '').toString().trim(),
        notes:          (row.notes           || '').toString().trim(),
      }
    },
  },

  expenses: {
    label: 'Shpenzime',
    fields: [
      { key: 'date',     aliases: ['data', 'date', 'data shpenzimit'] },
      { key: 'category', aliases: ['kategoria', 'category'] },
      { key: 'type',     aliases: ['lloji', 'type', 'tipi'] },
      { key: 'vendor',   aliases: ['furnitori', 'vendor', 'klienti', 'te'] },
      { key: 'paidFrom', aliases: ['paguaj nga', 'paid from', 'llogaria', 'nga'] },
      { key: 'reference',aliases: ['referenca', 'reference', 'pershkrimi', 'përshkrimi'] },
      { key: 'paidBy',   aliases: ['paguar nga', 'paid by', 'nga perdoruesi'] },
      { key: 'amount',   aliases: ['shuma', 'amount', 'vlera', 'total'] },
    ],
    template: [
      ['Data','Kategoria','Lloji','Furnitori','Paguaj nga','Referenca','Paguar nga','Shuma'],
      ['2026-01-15','Software','Blerje Krediti Predator','Predator','Kesh - Enndy','500 kredit','Enndy','800'],
      ['2026-01-16','Internet','Abonimit Internet','Albtelecom','Llogaria Bank','Pagesë mujore','Enndy','50'],
      ['2026-01-17','Zyre','Qira e zyrës','Pronari i zyrës','Kesh - Enndy','Qira janar','Belti','600'],
      ['2026-01-18','Hardware','Blerjë router','TP-Link','Kesh - Belti','Router wifi','Belti','120'],
      ['2026-01-19','Marketing','Reklama Google','Google Ads','Llogaria Bank','Google Ads campaign','Enndy','250'],
    ],
    build: (row, idx) => ({
      id:            `EXP-${String(Date.now() + idx).slice(-6)}`,
      date:          normalizeDate(row.date),
      category:      row.category   || 'Tjera',
      type:          row.type       || '',
      vendor:        row.vendor     || '',
      paidFrom:      row.paidFrom   || '',
      reference:     row.reference  || '',
      paidBy:        row.paidBy     || '',
      recurring:     false,
      recurringFreq: '',
      amount:        parseFloat(row.amount) || 0,
    }),
  },
}

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

/* ─── helpers ─── */
function normalizeDepositedTo(v) {
  if (!v) return 'Enndy'
  const s = String(v).toLowerCase().trim()
  if (s.includes('belti')) return 'Belti'
  if (s.includes('enndy') || s.includes('endy')) return 'Enndy'
  return String(v).trim()
}

function normalizeMethod(v) {
  if (!v) return 'Kesh'
  const s = String(v).toLowerCase().trim()
  if (s.includes('paypal'))                             return 'PayPal'
  if (s.includes('stripe'))                             return 'Stripe'
  if (s.includes('bank') || s.includes('transfer') || s.includes('bankar')) return 'Transfer Bankar'
  if (s.includes('western'))                            return 'Western Union'
  if (s.includes('moneygram') || s.includes('money gram')) return 'Money Gram'
  if (s.includes('ria'))                                return 'Ria'
  if (s.includes('crypto') || s.includes('bitcoin'))   return 'Crypto'
  if (s.includes('cash') || s.includes('kesh') || s.includes('online')) return 'Kesh'
  return String(v).trim()
}

function normalizeStatus(v) {
  if (!v) return 'pending'
  const s = String(v).toLowerCase().trim()
  if (s === 'paid' || s === 'paguar' || s === 'i paguar') return 'paid'
  if (s === 'overdue' || s === 'vonuar' || s === 'i vonuar') return 'overdue'
  if (s === 'draft' || s === 'skicë' || s === 'skice') return 'draft'
  if (s === 'void' || s === 'anuluar') return 'void'
  return 'pending'
}

function normalizeDate(v) {
  if (!v) return ''
  // Excel serial date number
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  // DD/MM/YYYY → YYYY-MM-DD
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  // DD.MM.YYYY
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  return s  // assume ISO or leave as-is
}

function matchHeader(header, aliases) {
  const h = String(header).toLowerCase().trim()
  return aliases.some(a => h === a || h.includes(a))
}

function parseSheet(worksheet, entity) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  if (raw.length < 2) return []
  const headers = raw[0].map(String)
  const fields = MAPS[entity].fields

  // Gjej kolonën për çdo fushë
  const colMap = {}
  fields.forEach(f => {
    const idx = headers.findIndex(h => matchHeader(h, f.aliases))
    if (idx !== -1) colMap[f.key] = idx
  })

  const parsed = raw.slice(1)
    .filter(row => row.some(c => c !== ''))
    .map((row, idx) => {
      const obj = {}
      fields.forEach(f => {
        if (colMap[f.key] !== undefined) obj[f.key] = row[colMap[f.key]]
      })
      return { ...obj, _rowIdx: idx }
    })

  // Special handling for invoices: merge rows that belong to same invoice
  if (entity === 'invoices') {
    return mergeInvoiceRows(parsed)
  }

  return parsed.map((obj, idx) => MAPS[entity].build(obj, idx))
}

function mergeInvoiceRows(rows) {
  console.log('[mergeInvoiceRows] Started with', rows.length, 'rows')
  const invoiceMap = {}

  for (const row of rows) {
    const invoiceId = row.invoiceId ||
      (row.customer && String(row.customer).trim() ? `${row.date}-${row.customer}` : null)

    if (!invoiceId) continue

    if (!invoiceMap[invoiceId]) {
      // Create new invoice - store row data for later build
      invoiceMap[invoiceId] = {
        invoiceId: row.invoiceId,
        customer: row.customer,
        date: row.date,
        due: row.due,
        amount: row.amount,
        status: row.status,
        referent: row.referent,
        subscriptionExpiry: row.subscriptionExpiry,
        notifyDate: row.notifyDate,
        items: row.item ? [{
          desc: row.item || 'Shërbim',
          qty: parseInt(row.qty) || 1,
          price: parseFloat(row.price) || parseFloat(row.amount) || 0,
        }] : []
      }
    } else if (row.item) {
      // Add item to existing invoice
      invoiceMap[invoiceId].items.push({
        desc: row.item || 'Shërbim',
        qty: parseInt(row.qty) || 1,
        price: parseFloat(row.price) || parseFloat(row.amount) || 0,
      })
    }
  }

  const invoices = Object.values(invoiceMap)
  console.log('[mergeInvoiceRows] Created', invoices.length, 'invoices from', rows.length, 'rows')
  console.log('[mergeInvoiceRows] Building invoices now...')

  const built = invoices.map((inv, idx) => {
    try {
      const result = MAPS.invoices.build(inv, idx)
      return result
    } catch (err) {
      console.error('[mergeInvoiceRows] ERROR building invoice', idx, ':', err, 'Invoice:', inv)
      throw err
    }
  })

  console.log('[mergeInvoiceRows] Returning', built.length, 'built invoices')
  return built
}

export function downloadTemplate(entity) {
  const map = MAPS[entity]
  const ws  = XLSX.utils.aoa_to_sheet(map.template)
  const wb  = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, map.label)
  XLSX.writeFile(wb, `template_${entity}.xlsx`)
}

/* ══════════════════════════════════════════════
   Komponenti kryesor
══════════════════════════════════════════════ */
export default function ImportExcelModal({ entity, onImport, onClose }) {
  const [rows,   setRows]   = useState(null)   // rreshtat e parsed
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)
  const fileRef = useRef()

  const map = MAPS[entity]

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setLoading(true)
    try {
      console.log('[handleFile] Starting file import:', file.name)
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      console.log('[handleFile] Sheet loaded, parsing...')
      const parsed = parseSheet(ws, entity)
      console.log('[handleFile] parseSheet returned:', parsed.length, 'items')
      console.log('[handleFile] First item:', parsed[0])
      console.log('[handleFile] Last item:', parsed[parsed.length - 1])
      if (!parsed.length) { setError('Nuk u gjet asnjë rresht i vlefshëm në file.'); setLoading(false); return }
      console.log('[handleFile] Calling setRows with', parsed.length, 'items')
      setRows(parsed)
      console.log('[handleFile] setRows called - state will update')
    } catch (err) {
      console.error('[handleFile] ERROR:', err)
      setError('Gabim gjatë leximit të file-it: ' + err.message)
    }
    setLoading(false)
  }

  function handleImport() {
    if (!rows?.length) return

    // SUPER VISIBLE ERROR LOG
    console.error('🔴 IMPORT DEBUG: rows.length = ' + rows.length)
    console.error('🔴 IMPORT DEBUG: rows array = ', rows)
    console.error('🔴 IMPORT DEBUG: First row ID = ' + rows[0]?.id)
    console.error('🔴 IMPORT DEBUG: Last row ID = ' + rows[rows.length-1]?.id)

    alert(`[IMPORT] Merr rreshta: ${rows.length}`)

    try {
      onImport(rows)
    } catch (err) {
      console.error('[IMPORT ERROR]', err)
      alert(`[ERROR] ${err.message}`)
      throw err
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Import nga Excel</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{map.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-800/20 rounded-xl border border-red-100 dark:border-red-700">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Shkarko modelin Excel</p>
              <p className="text-xs text-red-500 dark:text-red-400">Plotëso modelin me të dhënat tuaja, pastaj ngarko</p>
            </div>
            <button
              onClick={() => downloadTemplate(entity)}
              className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
            >
              <Download size={15} />
              Shkarko
            </button>
          </div>

          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-red-400 dark:hover:border-red-500 transition-colors"
          >
            <Upload size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Kliko për të zgjedhur file Excel</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">.xlsx, .xls, .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {rows && (
            <div>
              {console.error('🔴🔴🔴 ROWS STATE UPDATED! Length = ' + rows.length + ', First ID = ' + rows[0]?.id + ', Last ID = ' + rows[rows.length-1]?.id)}
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-green-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  U lexuan <span className="text-green-600 font-semibold">{rows.length}</span> regjistrime
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 max-h-48">
                <table className="w-full text-xs">
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                        {entity === 'customers' && (
                          <>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{r.name}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.phone}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.country}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.app}</td>
                          </>
                        )}
                        {entity === 'invoices' && (
                          <>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{r.customer}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.date}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">€{r.amount}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                r.status === 'paid' ? 'bg-green-50 text-green-700' :
                                r.status === 'overdue' ? 'bg-red-50 text-red-700' :
                                'bg-yellow-50 text-yellow-700'
                              }`}>{r.status}</span>
                            </td>
                          </>
                        )}
                        {entity === 'expenses' && (
                          <>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{r.date}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.category}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.vendor}</td>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">€{r.amount}</td>
                          </>
                        )}
                        {entity === 'payments' && (
                          <>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{r.date}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.customer}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.invoiceId || '—'}</td>
                            <td className="px-3 py-2 font-medium text-green-700">€{r.amount}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr>
                        <td colSpan="4" className="px-3 py-2 text-center text-gray-400 dark:text-gray-500 italic">
                          ... dhe {rows.length - 5} të tjera
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Anulo
          </button>
          <button
            onClick={() => {
              alert(`Button clicked! rows.length = ${rows?.length || 0}`)
              console.log('[BUTTON] onClick fired, rows:', rows?.length)
              handleImport()
            }}
            disabled={!rows?.length || loading}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? 'Duke lexuar...' : `Importo ${rows ? rows.length : ''} regjistrime`}
          </button>
        </div>
      </div>
    </div>
  )
}
