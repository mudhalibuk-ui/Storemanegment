import fs from 'fs';
const file = 'services/api.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/crypto\.randomUUID\(\)/g, 'generateId()');
fs.writeFileSync(file, content);
console.log('Replaced crypto.randomUUID() with generateId()');
