/* ── Kolonat e tabelës kryesore të Faturave — të editueshme nga çdo user (shih
   useColumnPrefs). Në një file të vetin (jo brenda Invoices.jsx) që Header.jsx ta
   përdorë pa tërhequr krejt Invoices.jsx në bundle-in kryesor (Invoices ngarkohet
   lazy, Header jo). ── */
export const INVOICE_TABLE_COLUMNS = [
  { key: 'date',     label: 'Data' },
  { key: 'id',       label: 'ID' },
  { key: 'customer', label: 'Klienti' },
  { key: 'referent', label: 'Referenti' },
  { key: 'expiry',   label: 'Skadimi Abonimit' },
  { key: 'amount',   label: 'Shuma' },
  { key: 'due',      label: 'Afati' },
  { key: 'status',   label: 'Statusi' },
]
