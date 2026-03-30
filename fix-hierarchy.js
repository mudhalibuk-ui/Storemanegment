import crypto from 'crypto';

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

// Current IDs from check-branches.js
const XARUN_BARIIRE_ID = 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10';
const XARUN_XAMAR_WEYNE_ID = '6f4a203e-9871-4168-8959-700aeaf3957f';
const XARUN_RAMADAN_ID = '95c89517-36fb-46ec-afe7-1b4ab5028554';

const BRANCH_BAKAARO_ID = '257bf762-6bb0-4cc8-8aed-4a4108f360c8';
const BRANCH_ISKOOLKA_ID = 'fd6f3768-42fc-4885-9f1d-475e98758453';
const BRANCH_CUMAR_AWOWO_ID = 'a80dfe91-2f0f-4805-9f16-42e26e1055f8';
const BRANCH_RAMADAN_PAINT_ID = '65babd79-9792-4082-a008-b345d4bffdb3';
const BRANCH_BIN_RAMADAN_ID = '9109876c-e7dc-45db-8865-8b0267eb0f30';
const BRANCH_RAMADAN_ZOOPE_ID = '52d06939-7d81-4c9e-9b18-033e62bc17a1';

async function fixHierarchy() {
  try {
    // 1. Create/Update Xarumo
    console.log('Updating Xarumo...');
    
    // Rename Bariire to Bariire Bakaaro
    await fetch(`${baseUrl}/xarumo?id=eq.${XARUN_BARIIRE_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bariire Bakaaro' })
    });

    // Rename Ramadan to Ramadan Zoope
    await fetch(`${baseUrl}/xarumo?id=eq.${XARUN_RAMADAN_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ramadan Zoope' })
    });

    // Create Bin Ramadan Xarun
    const xarunBinRamadanId = crypto.randomUUID();
    await fetch(`${baseUrl}/xarumo`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: xarunBinRamadanId,
        name: 'Bin Ramadan',
        location: 'Xamar weyne',
        created_at: new Date().toISOString()
      })
    });

    // 2. Reorganize Branches
    console.log('Reorganizing Branches...');

    // Under Bariire Xamar weyne (XARUN_XAMAR_WEYNE_ID)
    const xamarWeyneWarehouses = [BRANCH_ISKOOLKA_ID, BRANCH_CUMAR_AWOWO_ID, BRANCH_RAMADAN_PAINT_ID];
    for (const id of xamarWeyneWarehouses) {
      await fetch(`${baseUrl}/branches?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ xarun_id: XARUN_XAMAR_WEYNE_ID })
      });
      await fetch(`${baseUrl}/inventory_items?branch_id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ xarun_id: XARUN_XAMAR_WEYNE_ID })
      });
    }

    // Create Bacadlaha under Bariire Xamar weyne
    const branchBacadlahaId = crypto.randomUUID();
    await fetch(`${baseUrl}/branches`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: branchBacadlahaId,
        name: 'Bacadlaha',
        location: 'Mogadishu',
        xarun_id: XARUN_XAMAR_WEYNE_ID,
        total_shelves: 10,
        total_sections: 5,
        created_at: new Date().toISOString()
      })
    });

    // Under Bariire Bakaaro (XARUN_BARIIRE_ID)
    await fetch(`${baseUrl}/branches?id=eq.${BRANCH_BAKAARO_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ xarun_id: XARUN_BARIIRE_ID })
    });

    // Under Bin Ramadan (xarunBinRamadanId)
    await fetch(`${baseUrl}/branches?id=eq.${BRANCH_BIN_RAMADAN_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ xarun_id: xarunBinRamadanId })
    });
    await fetch(`${baseUrl}/inventory_items?branch_id=eq.${BRANCH_BIN_RAMADAN_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ xarun_id: xarunBinRamadanId })
    });

    // Under Ramadan Zoope (XARUN_RAMADAN_ID)
    await fetch(`${baseUrl}/branches?id=eq.${BRANCH_RAMADAN_ZOOPE_ID}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ xarun_id: XARUN_RAMADAN_ID })
    });

    console.log('Hierarchy fixed successfully.');
  } catch (e) {
    console.error('Error fixing hierarchy:', e);
  }
}

fixHierarchy();
