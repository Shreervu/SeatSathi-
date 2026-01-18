/**
 * Script to export all college data to JSON
 * Run with: npx tsx exportData.ts
 */

import { KCET_DATA } from './KCETcutoffdata/collegeData';
import * as fs from 'fs';

const outputPath = './public/collegeData.json';

// Export the data
const jsonData = JSON.stringify(KCET_DATA, null, 2);
fs.writeFileSync(outputPath, jsonData);

console.log(`Exported ${Object.keys(KCET_DATA.colleges).length} colleges to ${outputPath}`);
console.log(`File size: ${(jsonData.length / 1024).toFixed(2)} KB`);
