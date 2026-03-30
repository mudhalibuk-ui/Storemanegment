import crypto from 'crypto';

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

const BARIRE_XAMAR_WEYNE_BRANCH_ID = 'c7f7291b-3e5e-4a1b-a7d7-fa8b65d44ae5';
const CUMAR_AWOWO_BRANCH_ID = 'a80dfe91-2f0f-4805-9f16-42e26e1055f8';

const RAMADAN_ZOOPE_BRANCH_ID = '52d06939-7d81-4c9e-9b18-033e62bc17a1';
const RAMADAN_PAINT_BRANCH_ID = '65babd79-9792-4082-a008-b345d4bffdb3';
const BIN_RAMADAN_BRANCH_ID = '9109876c-e7dc-45db-8865-8b0267eb0f30';

async function reorganize() {
  try {
    // 1. Create Xarun: Bariire Xamar weyne
    const xarunXamarWeyneId = crypto.randomUUID();
    console.log(`Creating Xarun: Bariire Xamar weyne (${xarunXamarWeyneId})...`);
    const r1 = await fetch(`${baseUrl}/xarumo`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: xarunXamarWeyneId,
        name: 'Bariire Xamar weyne',
        location: 'Xamar weyne',
        created_at: new Date().toISOString()
      })
    });
    console.log('Xarun Xamar weyne created:', r1.status);

    // 2. Create Xarun: Ramadan
    const xarunRamadanId = crypto.randomUUID();
    console.log(`Creating Xarun: Ramadan (${xarunRamadanId})...`);
    const r2 = await fetch(`${baseUrl}/xarumo`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: xarunRamadanId,
        name: 'Ramadan',
        location: 'Mogadishu',
        created_at: new Date().toISOString()
      })
    });
    console.log('Xarun Ramadan created:', r2.status);

    // 3. Move branches to Bariire Xamar weyne
    console.log('Moving branches to Bariire Xamar weyne...');
    const xamarWeyneBranches = [BARIRE_XAMAR_WEYNE_BRANCH_ID, CUMAR_AWOWO_BRANCH_ID];
    for (const id of xamarWeyneBranches) {
      const rb = await fetch(`${baseUrl}/branches?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ xarun_id: xarunXamarWeyneId })
      });
      console.log(`Branch ${id} moved:`, rb.status);
      
      const ri = await fetch(`${baseUrl}/inventory_items?branch_id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ xarun_id: xarunXamarWeyneId })
      });
      console.log(`Items in branch ${id} moved:`, ri.status);
    }

    // 4. Move branches to Ramadan
    console.log('Moving branches to Ramadan...');
    const ramadanBranches = [RAMADAN_ZOOPE_BRANCH_ID, RAMADAN_PAINT_BRANCH_ID, BIN_RAMADAN_BRANCH_ID];
    for (const id of ramadanBranches) {
      const rb = await fetch(`${baseUrl}/branches?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ xarun_id: xarunRamadanId })
      });
      console.log(`Branch ${id} moved:`, rb.status);
      
      const ri = await fetch(`${baseUrl}/inventory_items?branch_id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ xarun_id: xarunRamadanId })
      });
      console.log(`Items in branch ${id} moved:`, ri.status);
    }

    console.log('Reorganization complete.');
  } catch (e) {
    console.error('Error during reorganization:', e);
  }
}

reorganize();
