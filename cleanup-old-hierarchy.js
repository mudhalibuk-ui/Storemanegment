const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const OLD_XARUN_ID = '275d52c1-74b3-41c6-8c81-6945f4c25ce8';

async function cleanup() {
  try {
    console.log('--- Cleaning up old hierarchy ---');

    // Delete branches under old Xarun
    const res1 = await fetch(`${baseUrl}/branches?xarun_id=eq.${OLD_XARUN_ID}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Deleted old branches status:', res1.status);

    // Delete old Xarun
    const res2 = await fetch(`${baseUrl}/xarumo?id=eq.${OLD_XARUN_ID}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Deleted old Xarun status:', res2.status);

    console.log('--- Cleanup Complete ---');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanup();
