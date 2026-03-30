
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('employees').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error("Connection Error:", error.message);
    process.exit(1);
  }
  
  console.log("Connection Successful!");
  console.log("Employee count:", data);
  
  const { data: employees, error: empError } = await supabase.from('employees').select('*').limit(5);
  if (empError) {
    console.error("Fetch Error:", empError.message);
  } else {
    console.log("Sample Employees:", employees);
  }
}

test();
