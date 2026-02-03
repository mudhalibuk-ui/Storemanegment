
/**
 * SUPABASE CONNECTION CLIENT
 */

export const SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'; 
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';

export const isDbConnected = () => {
  const url = (SUPABASE_URL as string || '').trim();
  const key = (SUPABASE_ANON_KEY as string || '').trim();
  return url.startsWith('https://') && key.length > 50;
};

export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDbConnected()) return null;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers,
  };

  try {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`DATABASE ERROR [${response.status}]:`, errorMsg);
      throw new Error(errorMsg);
    }
    
    if (response.status === 204) return {};
    
    const text = await response.text();
    if (!text) return {};
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      return {};
    }
  } catch (err) {
    console.error('Supabase Fetch/Network Error:', err);
    return null;
  }
};
