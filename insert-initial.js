const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const INITIAL_ITEMS = [
  {
    id: 'i1',
    name: 'Industrial Generator X5',
    category: 'Hardware',
    sku: 'GEN-001',
    shelves: 4,
    sections: 2,
    quantity: 12,
    branch_id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8',
    last_updated: new Date().toISOString(),
    min_threshold: 5,
    xarun_id: 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10'
  },
  {
    id: 'i2',
    name: 'Solar Panel 400W',
    category: 'Energy',
    sku: 'SOL-400',
    shelves: 10,
    sections: 5,
    quantity: 45,
    branch_id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8',
    last_updated: new Date().toISOString(),
    min_threshold: 20,
    xarun_id: 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10'
  },
  {
    id: 'i3',
    name: 'Water Pump Heavy Duty',
    category: 'Machinery',
    sku: 'PMP-88',
    shelves: 3,
    sections: 3,
    quantity: 4,
    branch_id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8',
    last_updated: new Date().toISOString(),
    min_threshold: 10,
    xarun_id: 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10'
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: 't1',
    item_id: 'i1',
    item_name: 'Industrial Generator X5',
    type: 'IN',
    quantity: 5,
    branch_id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8',
    timestamp: new Date().toISOString(),
    notes: 'Restock from supplier',
    status: 'APPROVED',
    requested_by: 'u1',
    xarun_id: 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10'
  }
];

async function insertData() {
  for (const item of INITIAL_ITEMS) {
    const r = await fetch(`${baseUrl}/inventory_items`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(item)
    });
    console.log('Item:', await r.text());
  }

  for (const trans of INITIAL_TRANSACTIONS) {
    const r = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(trans)
    });
    console.log('Transaction:', await r.text());
  }
}

insertData();
