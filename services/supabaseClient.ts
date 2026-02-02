
/**
 * SUPABASE CONNECTION CLIENT
 * --------------------------
 * URL: https://htmrapyxzfhvooxqacjd.supabase.co
 */

export const SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'; 
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';

export const isDbConnected = () => {
  const url = (SUPABASE_URL as string || '').trim();
  const key = (SUPABASE_ANON_KEY as string || '').trim();
  
  const isUrlValid = url.startsWith('https://') && url.includes('.supabase.co');
  const isKeyValid = key.startsWith('eyJ') && key.length > 50;
  
  return isUrlValid && isKeyValid;
};

/**
 * Helper function si loola hadlo Supabase REST API
 */
export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDbConnected()) {
    console.warn("Supabase is not connected. Check environment variables.");
    return null;
  }

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorDetail = await response.text();
      console.error(`Supabase API Error [${response.status}] for ${endpoint}:`, errorDetail);
      
      // Handle PGRST205 specifically by suggesting a schema reload
      if (errorDetail.includes('PGRST205')) {
        console.error("CRITICAL: Schema cache error detected. Please run 'NOTIFY pgrst, \"reload schema\";' in your Supabase SQL editor.");
      }
      
      return null;
    }
    
    if (response.status === 204) {
      return {};
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('Supabase Network/Fetch Error:', err);
    return null;
  }
};
