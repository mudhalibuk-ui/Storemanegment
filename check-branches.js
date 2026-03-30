const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function checkData() {
  const rBranches = await fetch(`${baseUrl}/branches`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('Branches:', await rBranches.json());

  const rXarumo = await fetch(`${baseUrl}/xarumo`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('Xarumo:', await rXarumo.json());
}

checkData();
