import * as XLSX from 'xlsx';

const workbook = XLSX.readFile(
  'C:/Users/Janos/repos/expense-categorizer/example_data/CathyJaniExpenseTracking2025.xlsx'
);
console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log('Headers:', Object.keys(data[0] || {}));
  console.log('Sample rows (first 3):');
  data.slice(0, 3).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
  console.log('Total rows:', data.length);
  console.log(
    'Total columns:',
    data.length > 0 ? Object.keys(data[0]).length : 0
  );
});
