
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

// Error listener callback
let errorListener: (msg: string) => void = () => {};
export const onDbError = (callback: (msg: string) => void) => {
  errorListener = callback;
};

export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDbConnected()) {
    errorListener("Cilad: Database URL ama Key lama helin!");
    return null;
  }

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers,
  };

  try {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    // Timeout logic si looga hortago sugitaan dheer
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        const msg = "DATABASE 404: Miiska (Table) aad rabto lama helin. Fadlan hubi inaad SQL Schema-da marisay.";
        errorListener(msg);
        return []; // Return empty array to avoid crashes
      }
      
      const errorMsg = await response.text();
      let detailedError = `DATABASE ERROR [${response.status}]: ${errorMsg}`;
      console.error(detailedError);
      errorListener(detailedError);
      return null;
    }
    
    if (response.status === 204) return [];
    
    const text = await response.text();
    if (!text) return [];
    
    try {
      return JSON.parse(text);
    } catch (e) {
      return [];
    }
  } catch (err: any) {
    let msg = 'Network Connection Error';
    if (err.name === 'AbortError') msg = 'Database connection timed out. Hubi internet-kaaga.';
    else msg = err.message || msg;
    
    console.error('Supabase Fetch/Network Error:', msg);
    errorListener(msg);
    return null;
  }
};
