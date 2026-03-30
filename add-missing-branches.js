const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const XARUN_ID = 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10';

const NEW_BRANCHES = [
  { name: 'Cumar Awowo', location: 'Mogadishu' },
  { name: 'Bakharka Iskoolka', location: 'Mogadishu' },
  { name: 'Ramadan Paint', location: 'Mogadishu' }
];

async function addMissingBranches() {
  const branchesToAdd = NEW_BRANCHES.map(b => ({
    id: crypto.randomUUID(),
    name: b.name,
    location: b.location,
    total_shelves: 10,
    total_sections: 5,
    custom_sections: {},
    xarun_id: XARUN_ID,
    created_at: new Date().toISOString()
  }));

  console.log(`Adding ${branchesToAdd.length} missing branches...`);

  const r = await fetch(`${baseUrl}/branches`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(branchesToAdd)
  });

  console.log('Response:', await r.text());
}

addMissingBranches();
