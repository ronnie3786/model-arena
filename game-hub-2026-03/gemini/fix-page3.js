const fs = require('fs');
const file = './src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /import { clsx, type ClassValue } from "clsx"[\s\S]*?function cn\(\.\.\.inputs: ClassValue\[\]\) \{\s*return twMerge\(clsx\(inputs\)\)\s*\}/m,
  "import { cn } from '@/lib/utils';"
);
fs.writeFileSync(file, code);
