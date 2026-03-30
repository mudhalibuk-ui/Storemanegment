const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function fetchTable(table) {
  const r = await fetch(`${baseUrl}/${table}?select=*`, { 
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } 
  });
  const data = await r.json();
  console.log(`--- ${table} ---`);
  console.log(`Count: ${data.length || 0}`);
  if (data.length > 0) {
    console.log('Sample:', JSON.stringify(data[0]).substring(0, 150) + '...');
  }
}

async function test() {
  await fetchTable('xarumo');
  await fetchTable('branches');
  await fetchTable('users_registry');
  await fetchTable('inventory_items');
  await fetchTable('transactions');
  await fetchTable('employees');
}
test();
