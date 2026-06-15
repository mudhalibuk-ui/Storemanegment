import fs from 'fs';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function runSql() {
  const sql = `ALTER TABLE public.users_registry ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;`;
  const r = await fetch(`${baseUrl}/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await r.text();
  console.log('Response:', text);
}
runSql();
