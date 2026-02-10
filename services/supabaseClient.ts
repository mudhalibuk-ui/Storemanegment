
/**
 * SUPABASE CONNECTION CLIENT
 * Enhanced with better error handling and network resilience.
 */

export const SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'.trim(); 
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM'.trim();

export const isDbConnected = () => {
  const url = (SUPABASE_URL || '').trim();
  const key = (SUPABASE_ANON_KEY || '').trim();
  return url.startsWith('https://') && key.length > 50;
};

// Error listener callback
let errorListener: (msg: string) => void = () => {};
export const onDbError = (callback: (msg: string) => void) => {
  errorListener = callback;
};

// Return type is now dynamic or an object with error info
export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDbConnected()) {
    console.warn("Database connection credentials not found.");
    return { error: "No connection credentials" };
  }

  const method = options.method || 'GET';
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...((options.headers as any) || {}),
  };

  // Merge with existing Prefer header if present (needed for UPSERTs)
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const existingPrefer = headers['Prefer'];
    const returnRep = 'return=representation';
    
    if (existingPrefer) {
      if (!existingPrefer.includes('return=')) {
        headers['Prefer'] = `${existingPrefer},${returnRep}`;
      }
    } else {
      headers['Prefer'] = returnRep;
    }
  }

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, { 
        ...options, 
        headers, 
        signal: controller.signal,
        mode: 'cors' 
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          // If deleting and 404, it's already gone, so success.
          if (method === 'DELETE') return [];
          errorListener("Resource not found (404).");
          return { error: "Not Found" };
        }
        
        // Return explicit error details
        const errorText = await response.text();
        console.error(`API Error [${response.status}]: ${errorText}`);
        
        if (response.status === 409) {
           return { error: "Conflict/Duplicate Key", details: errorText };
        }

        // For 5xx errors or 429, we throw to trigger retry
        if (response.status >= 500 || response.status === 429) {
           throw new Error(`Server Error: ${response.status}`);
        }
        
        return { error: `API Error ${response.status}`, details: errorText };
      }
      
      if (response.status === 204) return [];
      
      const text = await response.text();
      if (!text) return [];
      
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON response:", text);
        return { error: "Invalid JSON response" };
      }
    } catch (err: any) {
      attempt++;
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? 'Timeout' : err.message;
      
      console.warn(`Supabase request attempt ${attempt}/${MAX_RETRIES} failed: ${errorMsg}`);

      if (attempt >= MAX_RETRIES) {
        return { error: "Network Error", details: errorMsg };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { error: "Request Failed" };
};
