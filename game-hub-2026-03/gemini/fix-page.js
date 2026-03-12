const fs = require('fs');
const file = './app/page.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  "export function cn(...inputs: ClassValue[]) {",
  "function cn(...inputs: ClassValue[]) {"
);
fs.writeFileSync(file, code);
