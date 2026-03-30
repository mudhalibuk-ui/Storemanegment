import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './python_bridge/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('attendance').insert([
    { employee_id: 'a894b781-317b-4a72-b298-7f12d316db87', date: '2026-03-30', status: 'HOLIDAY' }
  ]);
  console.log('Insert Result:', data, error);
}

test();
