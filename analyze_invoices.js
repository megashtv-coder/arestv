const XLSX = require('xlsx');
const file = 'C:\\Users\\enndy\\Downloads\\Telegram Desktop\\template_invoices (4).xlsx';

const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Get invoiceIds and customers
const invoiceIds = new Map();
for (let i = 1; i < raw.length; i++) {
  const invId = raw[i][1]; // Column B
  const customer = raw[i][2]; // Column C

  if (!invoiceIds.has(invId)) {
    invoiceIds.set(invId, []);
  }
  invoiceIds.get(invId).push(customer);
}

console.log('=== INVOICE ID ANALYSIS ===');
console.log('Total unique invoiceIds:', invoiceIds.size);
console.log('Total data rows:', raw.length - 1);

// Find invoiceIds with multiple rows
const multiRow = Array.from(invoiceIds.entries())
  .filter(([id, customers]) => customers.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log('\n=== INVOICEIDS WITH MULTIPLE ROWS (TOP 15) ===');
multiRow.slice(0, 15).forEach(([id, customers]) => {
  console.log(`  ${id}: ${customers.length} rows`);
  customers.forEach(c => console.log(`    - ${c}`));
});

console.log(`\n=== SUMMARY ===`);
console.log(`InvoiceIds with multiple rows: ${multiRow.length}`);
console.log(`Single-row invoiceIds: ${invoiceIds.size - multiRow.length}`);
console.log(`Rows in multi-row invoices: ${multiRow.reduce((sum, [_, customers]) => sum + customers.length, 0)}`);
console.log(`Rows in single-row invoices: ${invoiceIds.size - multiRow.length}`);
