/**
 * SUPABASE CONNECTION CLIENT
 * --------------------------
 * MUHIIM: URL-kaaga iyo Key-gaaga hadda waxay u muuqdaan kuwo isku dhex jira.
 * URL: Waa inuu ku bilaawdaa 'https://' kuna dhamaadaa '.supabase.co'
 * KEY: Waa inuu ka bilaawdaa 'eyJ' (waa mid aad u dheer)
 */

// URL-ka saxda ah ee mashruucaaga (laga soo saaray Key-gaaga)
export const SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'; 
// Key-gaaga (Hubi in uusan lahayn wax dabo ah oo 'sb_publishable' ah)
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';

export const isDbConnected = () => {
  const url = (SUPABASE_URL as string).trim();
  const key = (SUPABASE_ANON_KEY as string).trim();
  
  // Hubi in URL-ka uu yahay mid dhab ah
  const isUrlValid = url.startsWith('https://') && url.includes('.supabase.co');
  // Hubi in Key-ga uu yahay JWT Supabase ah
  const isKeyValid = key.startsWith('eyJ') && key.length > 50;
  
  return isUrlValid && isKeyValid;
};

/**
 * Helper function si loola hadlo Supabase REST API
 */
export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDbConnected()) return null;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      console.error('Supabase Error:', await response.text());
      return null;
    }
    
    // Xalinta: Unexpected end of JSON input
    if (response.status === 204) {
      return {};
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('Network Error:', err);
    return null;
  }
};