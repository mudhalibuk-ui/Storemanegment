const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function testInsert() {
  const payload = {
    id: 'test-trans-1',
    item_id: 'i1',
    item_name: 'Industrial Generator X5',
    type: 'IN',
    quantity: 5,
    branch_id: '257bf762-6bb0-4cc8-8aed-4a4108f360c8',
    timestamp: new Date().toISOString(),
    unit_cost: 100, // This column doesn't exist!
    xarun_id: 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10'
  };

  const r = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await r.json();
  console.log('Response:', data);
}

testInsert();
