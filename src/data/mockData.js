export { mockInvoices } from './mockInvoices.js'

export const countries = [
  'Kosovë', 'Shqipëri', 'Maqedoni e Veriut', 'Serbi', 'Mali i Zi',
  'Bosnjë dhe Hercegovinë', 'Kroaci', 'Slloveni', 'Bullgari', 'Rumani',
  'Austri', 'Gjermani', 'Zvicër', 'Mbretëri e Bashkuar', 'Itali',
  'Francë', 'Spanjë', 'Portugali', 'Belgjikë', 'Holandë',
  'Suedi', 'Norvegji', 'Danimarkë', 'Finlandë', 'Poloni',
  'Çeki', 'Hungari', 'Sllovaki', 'Greqi', 'Turqi',
  'SHBA', 'Kanada', 'Australi', 'Zelandë e Re',
  'Emirate Arabe të Bashkuara', 'Arabi Saudite', 'Katar', 'Gjibraltar', 'Tjera',
]

export { mockCustomers } from './mockCustomers.js'

export { mockExpenses } from './mockExpensesCSV.js'

export const mockTransfers = []


export const mockExpenseByCategory = [
  { name: 'Shërbime', value: 530,  color: '#2563eb' },
  { name: 'Software',  value: 207,  color: '#7c3aed' },
  { name: 'Tjera',     value: 45,   color: '#d97706' },
]

export const currencies = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
]

export const expenseCategories = ['Qira', 'Software', 'Marketing', 'Ushqim', 'Shërbime', 'Pajisje', 'Udhëtime', 'Tjera']

export const expenseTypes = [
  'Blerje krediti Predator',
  'Blerje Krediti Strong',
  'Blerje Krediti Trex',
  'Blerje krediti IBO Player',
  'Blerje Krediti Ibo Pro',
  'Blerje krediti Netiptv',
  'Blerje Krediti Smart ONE',
  'Blerje Krediti Hot IPTV',
  'Blerje Krediti Set IPTV',
  'Blerje Krediti Smarters Player',
  'Pagese Aplikacioni',
  'Pagese per HOST',
  'Pagese per Domain',
  'Pagese per Zoho',
  'Pagese per telefon',
  'Pagese per Internet',
  'Pagese per Server',
  'Pagese per Proxy',
  'Pagesa per licenca',
  'Pagesa tjera',
]

export const paymentModes = [
  'PayPal', 'Transfer Bankar', 'Kesh', 'Western Union',
  'Ria', 'Money Gram', 'Crypto', 'Stripe',
]

export const depositAccounts = [
  'Kesh - Enndy',
  'Kesh - Belti',
  'PayPal - Bledar',
  'PayPal - Shpend.be',
  'Wise - Belti',
  'TEB - Enndy',
  'Paysera - Enndy',
  'OneFor - Enndy',
  'Stripe - X',
  'Paysera - Belti',
  'PayPal - Me-Xhanin',
  'PayPal - Megaenndy',
  'Binance Enndy',
]

export const depositedToOptions = ['Enndy', 'Belti']

export const mockOrganizations = [
  {
    id: 'ORG-001',
    name: 'MEGA SH TV',
    shortName: 'MEGA SH',
    description: 'Shërbime',
    plan: 'pro',
    status: 'active',
    createdAt: '2026-01-01',
    color: '#7c3aed',
  },
]

export const mockUsers = [
  { id: 'USR-001', name: 'Enndy', username: 'xpmx',  password: 'enndy123', role: 'admin',  orgId: 'ORG-001', isSuperAdmin: true, active: true, createdAt: '2026-01-01', color: '#7c3aed' },
  { id: 'USR-002', name: 'Belti', username: 'belti', password: 'belti123', role: 'editor', orgId: 'ORG-001', active: true, createdAt: '2026-02-01', color: '#2563eb' },
  { id: 'USR-003', name: 'Belti', username: 'belti', password: 'belti123', role: 'editor', orgId: 'ORG-001', active: true, createdAt: '2026-03-01', color: '#059669' },
  { id: 'USR-004', name: 'Test',  username: 'test',  password: 'test',     role: 'tester', orgId: 'ORG-001', active: true, createdAt: '2026-01-01', color: '#6b7280' },
]

export const mockActivityLog = []

export { mockPayments } from './mockPayments.js'

export const mockVendors = [
  { id: 'VEN-001', name: 'Predator',        phone: '',  panelLink: '' },
  { id: 'VEN-002', name: 'Strong - 8K',     phone: '',  panelLink: '' },
  { id: 'VEN-003', name: 'Trex',            phone: '',  panelLink: '' },
  { id: 'VEN-004', name: 'Ibosol',          phone: '',  panelLink: '' },
  { id: 'VEN-005', name: 'Ibo Pro',         phone: '',  panelLink: '' },
  { id: 'VEN-006', name: 'Netiptv',         phone: '',  panelLink: '' },
  { id: 'VEN-007', name: 'Set IPTV',        phone: '',  panelLink: '' },
  { id: 'VEN-008', name: 'Smart ONE',       phone: '',  panelLink: '' },
  { id: 'VEN-009', name: 'Smarters Player', phone: '',  panelLink: '' },
  { id: 'VEN-010', name: 'Hot IPTV',        phone: '',  panelLink: '' },
  { id: 'VEN-011', name: 'Tikeys',          phone: '',  panelLink: '' },
  { id: 'VEN-012', name: 'Amazon',          phone: '',  panelLink: '' },
  { id: 'VEN-013', name: 'VU Player',       phone: '',  panelLink: '' },
  { id: 'VEN-014', name: 'Smart IPTV',      phone: '',  panelLink: '' },
  { id: 'VEN-015', name: 'Proxypass',       phone: '',  panelLink: '' },
  { id: 'VEN-016', name: 'X',               phone: '',  panelLink: '' },
  { id: 'VEN-017', name: 'STB',             phone: '',  panelLink: '' },
]

export const salesAccounts = [
  { code: '7000', name: 'Të ardhura nga shitjet' },
  { code: '7010', name: 'Të ardhura nga shërbimet' },
  { code: '7020', name: 'Të ardhura nga konsultimet' },
  { code: '7030', name: 'Të ardhura nga licencat' },
  { code: '7040', name: 'Të ardhura nga mirëmbajtja' },
  { code: '7050', name: 'Të ardhura nga trajnimet' },
  { code: '7090', name: 'Të ardhura të tjera' },
]

export const mockItems = [
  { id: 'ITM-001', name: '1 muaj abonim',                                  salePrice: 10,  purchasePrice: 1.60,  account: '7010', vendor: 'Predator' },
  { id: 'ITM-002', name: '3 muaj abonim',                                  salePrice: 40,  purchasePrice: 2.56,  account: '7010', vendor: 'Predator' },
  { id: 'ITM-003', name: '2 muaj abonim',                                  salePrice: 20,  purchasePrice: 3.20,  account: '7010', vendor: 'Predator' },
  { id: 'ITM-004', name: '6 muaj abonim',                                  salePrice: 60,  purchasePrice: 9.60,  account: '7010', vendor: 'Predator' },
  { id: 'ITM-005', name: '12 muaj abonim',                                 salePrice: 100, purchasePrice: 19.20, account: '7010', vendor: 'Predator' },
  { id: 'ITM-006', name: '13 muaj abonim',                                 salePrice: 110, purchasePrice: 19.20, account: '7010', vendor: 'Predator' },
  { id: 'ITM-007', name: 'Ibo Player - Pagese e aplikacionit',             salePrice: 10,  purchasePrice: 0,     account: '7030', vendor: 'Ibosol' },
  { id: 'ITM-008', name: 'Netiptv - Pagese e aplikacionit per 2 vite',     salePrice: 10,  purchasePrice: 5.42,  account: '7030', vendor: 'Netiptv' },
  { id: 'ITM-009', name: 'Smart IPTV - Pagese e aplikacionit',             salePrice: 10,  purchasePrice: 5.49,  account: '7030', vendor: 'Smart IPTV' },
  { id: 'ITM-010', name: 'Set IPTV - Pagese e aplikacionit',               salePrice: 20,  purchasePrice: 15.40, account: '7030', vendor: 'Set IPTV' },
  { id: 'ITM-011', name: 'PREDATOR APK - Pagese e aplikacionit',           salePrice: 10,  purchasePrice: 0,     account: '7030', vendor: 'X' },
  { id: 'ITM-012', name: 'STB - Pagese e aplikacionit',                    salePrice: 20,  purchasePrice: 24,    account: '7030', vendor: 'STB' },
  { id: 'ITM-013', name: 'Hot IPTV - Pagese e aplikacionit',               salePrice: 15,  purchasePrice: 12,    account: '7030', vendor: 'Hot IPTV' },
  { id: 'ITM-014', name: 'Kredit - Predator',                              salePrice: 2.50, purchasePrice: 1.60, account: '7090', vendor: 'Predator' },
  { id: 'ITM-015', name: 'Kredit - Ibo Player',                            salePrice: 2,   purchasePrice: 1.50,  account: '7090', vendor: 'Ibosol' },
  { id: 'ITM-016', name: 'Netiptv - Pagese e aplikacionit lifetime',       salePrice: 20,  purchasePrice: 10.84, account: '7030', vendor: 'Netiptv' },
  { id: 'ITM-017', name: 'XIAOMI MI STICK 4K',                             salePrice: 90,  purchasePrice: 0,     account: '7000', vendor: 'Amazon' },
  { id: 'ITM-018', name: 'Amazon Firestick 4K',                            salePrice: 80,  purchasePrice: 0,     account: '7000', vendor: 'Amazon' },
  { id: 'ITM-019', name: 'XIAOMI MI BOX S',                                salePrice: 90,  purchasePrice: 0,     account: '7000', vendor: 'Amazon' },
  { id: 'ITM-020', name: '3 Muaj Test',                                    salePrice: 15,  purchasePrice: 4.80,  account: '7010', vendor: 'Predator' },
  { id: 'ITM-021', name: 'VU Player Pro',                                  salePrice: 10,  purchasePrice: 0,     account: '7030', vendor: 'VU Player' },
  { id: 'ITM-022', name: 'Kredit - VU Player PRO',                         salePrice: 2,   purchasePrice: 0,     account: '7090', vendor: 'VU Player' },
  { id: 'ITM-023', name: 'Spotify - 12 Muaj',                              salePrice: 50,  purchasePrice: 30,    account: '7030', vendor: 'Tikeys' },
  { id: 'ITM-024', name: 'Bob Player - Pagese e aplikacionit',             salePrice: 10,  purchasePrice: 3,     account: '7030', vendor: 'Ibosol' },
  { id: 'ITM-025', name: 'Oferta Black Friday x2',                         salePrice: 100, purchasePrice: 19.20, account: '7010', vendor: 'Predator' },
  { id: 'ITM-026', name: '12 Muaj Abonim X2',                              salePrice: 200, purchasePrice: 19.20, account: '7010', vendor: 'Predator' },
  { id: 'ITM-027', name: '8K - 12 muaj abonim',                            salePrice: 160, purchasePrice: 16.32, account: '7010', vendor: 'Strong - 8K' },
  { id: 'ITM-028', name: 'Trex - 6 muaj abonim',                           salePrice: 60,  purchasePrice: 10.20, account: '7010', vendor: 'Trex' },
  { id: 'ITM-029', name: 'Smart One Lifetime',                             salePrice: 20,  purchasePrice: 12.99, account: '7030', vendor: 'Smart ONE' },
  { id: 'ITM-030', name: 'Proxy',                                          salePrice: 10,  purchasePrice: 9.60,  account: '7010', vendor: 'Proxypass' },
  { id: 'ITM-031', name: '12+2 muaj abonim',                               salePrice: 100, purchasePrice: 19.20, account: '7010', vendor: 'Predator' },
  { id: 'ITM-032', name: 'Roku TV Express 4K',                             salePrice: 60,  purchasePrice: 40,    account: '7000', vendor: 'Amazon' },
  { id: 'ITM-033', name: 'TIP',                                            salePrice: 10,  purchasePrice: 0,     account: '7090', vendor: 'X' },
  { id: 'ITM-034', name: 'Smarters IPTV Player',                           salePrice: 10,  purchasePrice: 4.20,  account: '7030', vendor: 'Smarters IPTV' },
  { id: 'ITM-035', name: 'VIP - Trex',                                     salePrice: 50,  purchasePrice: 18.84, account: '7010', vendor: 'Trex' },
  { id: 'ITM-036', name: 'Netiptv - Pagese e aplikacionit per 1 vit',      salePrice: 5,   purchasePrice: 2.71,  account: '7030', vendor: 'Netiptv' },
  { id: 'ITM-037', name: '8K - 6 Muaj',                                    salePrice: 80,  purchasePrice: 8.10,  account: '7010', vendor: 'Strong - 8K' },
  { id: 'ITM-038', name: '8K - 3 Muaj abonim',                             salePrice: 40,  purchasePrice: 4.05,  account: '7010', vendor: 'Strong - 8K' },
]
