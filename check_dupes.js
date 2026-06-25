const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function check() {
  const r = await fetch(`${baseUrl}/inventory_items?select=sku,branch_id`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const items = await r.json();
  const counts = {};
  items.forEach(i => {
    counts[i.sku] = (counts[i.sku] || 0) + 1;
  });
  const dupes = Object.entries(counts).filter(([_, c]) => c > 1);
  console.log('Duplicates:', dupes);
}
check();
