import fs from 'fs';
let content = fs.readFileSync('components/BulkTransactionModal.tsx', 'utf8');
content = content.replace(/value=\{row\.shelf \|\| ''\}/g, "value={row.shelf !== undefined ? row.shelf : ''}");
content = content.replace(/<option value="">Shelf<\/option>/g, "<option value=\"\">Shelf</option>\n                                <option value={0}>Eber (0)</option>");
content = content.replace(/value=\{row\.section \|\| ''\}/g, "value={row.section !== undefined ? row.section : ''}");
content = content.replace(/<option value="">Godka<\/option>/g, "<option value=\"\">Godka</option>\n                                <option value={0}>Eber (0)</option>");
fs.writeFileSync('components/BulkTransactionModal.tsx', content);
