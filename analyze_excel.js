const XLSX = require('xlsx');
const file = 'C:\\Users\\enndy\\Downloads\\Telegram Desktop\\template_invoices (4).xlsx';

try {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  console.log('=== HEADER ROW (Columns A-L) ===');
  const headers = raw[0];
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    console.log(`${col}: "${h}"`);
  });

  console.log('\n=== FIRST 5 DATA ROWS ===');
  for (let i = 1; i <= 5 && i < raw.length; i++) {
    console.log(`\nRow ${i + 1}:`);
    raw[i].forEach((val, j) => {
      const col = String.fromCharCode(65 + j);
      if (val !== '') console.log(`  ${col}: "${val}"`);
    });
  }

  console.log(`\n=== TOTAL ROWS: ${raw.length} ===`);
} catch (err) {
  console.error('Error:', err.message);
}
