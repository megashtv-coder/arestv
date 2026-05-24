# FinanceFlow — Menaxhimi Financiar

Aplikacion modern i menaxhimit të financave personale dhe biznesit, i ndërtuar me React + Vite + TailwindCSS.

## Teknologjitë

- **React 18** — UI framework
- **Vite** — build tool (ultra i shpejtë)
- **TailwindCSS** — utility-first styling
- **Recharts** — grafike interaktive
- **Lucide React** — ikona moderne
- **Context API** — state management

## Si të ekzekutosh projektin

### 1. Hyr në dosje
```bash
cd financeflow
```

### 2. Instalo varësitë
```bash
npm install
```

### 3. Ekzekuto serverin e zhvillimit
```bash
npm run dev
```

### 4. Hap në browser
```
http://localhost:5173
```

## Kredencialet demo

```
Email:      demo@financeflow.ks
Fjalëkalimi: demo1234
```

## Struktura e projektit

```
financeflow/
├── src/
│   ├── components/
│   │   ├── Header.jsx       — Header me search, valuta, notifications
│   │   ├── Sidebar.jsx      — Navigimi anësor (responsive)
│   │   └── UI.jsx           — Komponentët e ripërdorshëm
│   ├── context/
│   │   └── AppContext.jsx   — State management global
│   ├── data/
│   │   └── mockData.js      — Të dhënat demo
│   ├── pages/
│   │   ├── Login.jsx        — Faqja e kyçjes
│   │   ├── Dashboard.jsx    — Paneli kryesor
│   │   ├── Invoices.jsx     — Menaxhimi i faturave
│   │   ├── InvoiceModal.jsx — Modal për faturë të re
│   │   ├── Customers.jsx    — Menaxhimi i klientëve
│   │   ├── Expenses.jsx     — Gjurmimi i shpenzimeve
│   │   ├── Reports.jsx      — Raportet financiare
│   │   └── Settings.jsx     — Cilësimet
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Modulet

| Moduli      | Përshkrimi |
|-------------|-----------|
| **Dashboard** | KPI cards, Cash flow chart, Pie chart, Transaksionet e fundit, Quick actions |
| **Faturat** | Lista me pagination, filter, status badges, preview PDF-style, krijoni/fshini |
| **Klientët** | Grid me karta, shto klient me validim, avatar me ngjyrë |
| **Shpenzimet** | Lista, kategori, filter, shto/fshi, progress bars |
| **Raportet** | BarChart interaktiv, KPI cards, breakdown sipas statusit, Top 5 klientë |
| **Cilësimet** | Toggles, profil kompanie, siguria, zona e rrezikshme |

## Build për prodhim

```bash
npm run build
```

Outputi gjendet në dosjen `dist/`.

---

Made with ❤️ in Prishtinë, Kosovë
