const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const NEW_BRANCH_IDS = [
  'a80dfe91-2f0f-4805-9f16-42e26e1055f8', // Cumar Awowo
  'fd6f3768-42fc-4885-9f1d-475e98758453', // Bakharka Iskoolka
  '65babd79-9792-4082-a008-b345d4bffdb3'  // Ramadan Paint
];

const XARUN_ID = 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10';

const ITEMS_TEMPLATE = [
  { name: 'Saliid 5L', category: 'Cunto', sku: 'SAL-005', quantity: 100 },
  { name: 'Bariis 25kg', category: 'Cunto', sku: 'BAR-025', quantity: 50 },
  { name: 'Sonkor 50kg', category: 'Cunto', sku: 'SON-050', quantity: 30 },
  { name: 'Baasto 10kg', category: 'Cunto', sku: 'BAS-010', quantity: 80 },
  { name: 'Caano Boore', category: 'Cunto', sku: 'CAA-001', quantity: 200 }
];

async function seedNewInventory() {
  const allItems = [];
  
  for (const branchId of NEW_BRANCH_IDS) {
    for (const template of ITEMS_TEMPLATE) {
      allItems.push({
        id: crypto.randomUUID(),
        name: template.name,
        category: template.category,
        sku: `${template.sku}-${branchId.substring(0, 4).toUpperCase()}`,
        shelves: Math.floor(Math.random() * 10) + 1,
        sections: Math.floor(Math.random() * 5) + 1,
        quantity: template.quantity + Math.floor(Math.random() * 20),
        min_threshold: 10,
        branch_id: branchId,
        xarun_id: XARUN_ID,
        last_updated: new Date().toISOString()
      });
    }
  }

  console.log(`Inserting ${allItems.length} items for new branches...`);

  const r = await fetch(`${baseUrl}/inventory_items`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(allItems)
  });

  console.log('Response:', await r.text());
}

seedNewInventory();
