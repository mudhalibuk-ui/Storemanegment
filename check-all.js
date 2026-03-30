const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function checkAll() {
  const tables = ['inventory_items', 'transactions', 'branches', 'xarumo', 'employees', 'users_registry'];
  for (const table of tables) {
    try {
      const r = await fetch(`${baseUrl}/${table}?select=*`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      const data = await r.json();
      console.log(`Table ${table} has ${data.length} entries.`);
      if (data.length > 0) {
        console.log(`Sample ${table}:`, JSON.stringify(data[0], null, 2));
      }
    } catch (e) {
      console.log(`Table ${table} error: ${e.message}`);
    }
  }
}

checkAll();
