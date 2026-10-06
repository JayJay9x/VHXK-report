// Sinh history.csv từ history.json (chạy trong workflow deploy, hoặc tay: node scripts/export-csv.js).
// Google Sheets: =IMPORTDATA("https://jayjay9x.github.io/VHXK-report/history.csv")
const fs = require('fs');
const path = require('path');
const T = require('../trends.js');

const root = path.join(__dirname, '..');
const H = JSON.parse(fs.readFileSync(path.join(root, 'history.json'), 'utf8'));
const rows = T.csvRows(H);
fs.writeFileSync(path.join(root, 'history.csv'), T.toCSV(rows));
console.log(`history.csv: ${rows.length} dòng, ${Object.keys(H).length} ngày`);
