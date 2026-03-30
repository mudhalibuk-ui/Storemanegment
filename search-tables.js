const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function searchTables() {
  const tables = ['inventory_items', 'items', 'products', 'stock', 'branches', 'xarumo', 'transactions'];
  for (const table of tables) {
    try {
      const r = await fetch(`${baseUrl}/${table}?select=count`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'count=exact'
        }
      });
      const count = r.headers.get('Content-Range');
      console.log(`Table ${table}: ${count}`);
    } catch (e) {
      console.log(`Table ${table} error or not found`);
    }
  }
}

searchTables();
