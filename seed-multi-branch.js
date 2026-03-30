const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const BRANCHES = [
  { id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8', name: 'Bariire Bakaaro' },
  { id: '52d06939-7d81-4c9e-9b18-033e62bc17a1', name: 'Ramadan Zoope' },
  { id: '2ddd28fd-8eb3-4b4f-99e7-ae72bb8eda49', name: 'Bakharka x,jajab' },
  { id: '9109876c-e7dc-45db-8865-8b0267eb0f30', name: 'Bin Ramadan' },
  { id: 'c7f7291b-3e5e-4a1b-a7d7-fa8b65d44ae5', name: 'Bariire Xamar weyne' }
];

const XARUN_ID = 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10';

const ITEMS_TEMPLATE = [
  { name: 'Saliid 5L', category: 'Cunto', sku: 'SAL-005', quantity: 100 },
  { name: 'Bariis 25kg', category: 'Cunto', sku: 'BAR-025', quantity: 50 },
  { name: 'Sonkor 50kg', category: 'Cunto', sku: 'SON-050', quantity: 30 },
  { name: 'Baasto 10kg', category: 'Cunto', sku: 'BAS-010', quantity: 80 },
  { name: 'Caano Boore', category: 'Cunto', sku: 'CAA-001', quantity: 200 }
];

async function seedInventory() {
  const allItems = [];
  
  for (const branch of BRANCHES) {
    for (const template of ITEMS_TEMPLATE) {
      allItems.push({
        id: crypto.randomUUID(),
        name: template.name,
        category: template.category,
        sku: `${template.sku}-${branch.name.substring(0, 3).toUpperCase()}`, // Unique SKU per branch for testing, or same SKU if shared
        shelves: Math.floor(Math.random() * 10) + 1,
        sections: Math.floor(Math.random() * 5) + 1,
        quantity: template.quantity + Math.floor(Math.random() * 20),
        min_threshold: 10,
        branch_id: branch.id,
        xarun_id: XARUN_ID,
        last_updated: new Date().toISOString()
      });
    }
  }

  console.log(`Inserting ${allItems.length} items...`);

  const r = await fetch(`${baseUrl}/inventory_items`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(allItems)
  });

  console.log('Response:', await r.text());
}

seedInventory();
