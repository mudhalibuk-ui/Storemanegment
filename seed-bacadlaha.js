const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const BRANCH_BACADLAHA_ID = '6878b5af-e97a-4ee5-9dbc-dac5fa100f42';
const XARUN_XAMAR_WEYNE_ID = '6f4a203e-9871-4168-8959-700aeaf3957f';

const ITEMS_TEMPLATE = [
  { name: 'Saliid 5L', category: 'Cunto', sku: 'SAL-005-BAC', quantity: 120 },
  { name: 'Bariis 25kg', category: 'Cunto', sku: 'BAR-025-BAC', quantity: 60 },
  { name: 'Sonkor 50kg', category: 'Cunto', sku: 'SON-050-BAC', quantity: 45 }
];

async function seedBacadlaha() {
  const allItems = ITEMS_TEMPLATE.map(template => ({
    id: crypto.randomUUID(),
    name: template.name,
    category: template.category,
    sku: template.sku,
    shelves: Math.floor(Math.random() * 10) + 1,
    sections: Math.floor(Math.random() * 5) + 1,
    quantity: template.quantity,
    min_threshold: 10,
    branch_id: BRANCH_BACADLAHA_ID,
    xarun_id: XARUN_XAMAR_WEYNE_ID,
    last_updated: new Date().toISOString()
  }));

  console.log(`Inserting items for Bacadlaha...`);
  const r = await fetch(`${baseUrl}/inventory_items`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(allItems)
  });
  console.log('Response:', await r.text());
}

seedBacadlaha();
