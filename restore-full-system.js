const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

// IDs for consistency
const XARUN_XAMAR_WEYNE_ID = 'e9f9c362-0ab3-415c-9981-7d0fd9d6ed10';
const XARUN_BAKAARO_ID = 'b1a2c3d4-e5f6-7890-1234-567890abcdef';
const XARUN_BIN_RAMADAN_ID = 'c1d2e3f4-5678-9012-3456-7890abcdef12';
const XARUN_RAMADAN_ZOOPE_ID = 'd1e2f3a4-5678-9012-3456-7890abcdef12';

const BRANCH_ISKOOLKA_ID = 'fd6f3768-42fc-4885-9f1d-475e98758453';
const BRANCH_CUMAR_AWOW_ID = 'a80dfe91-2f0f-4805-9f16-42e26e1055f8';
const BRANCH_RAMADAN_PAINT_ID = '65babd79-9792-4082-a008-b345d4bffdb3';
const BRANCH_BACADLAHA_ID = 'f1e2d3c4-5b6a-7890-1234-567890abcdef';

async function restoreSystem() {
  try {
    console.log('--- Starting Full System Restoration ---');

    // 1. Upsert Xarumo
    const xarumo = [
      { id: XARUN_XAMAR_WEYNE_ID, name: 'Bariire Xamar weyne', location: 'Xamar weyne' },
      { id: XARUN_BAKAARO_ID, name: 'Bariire Bakaaro', location: 'Bakaaro' },
      { id: XARUN_BIN_RAMADAN_ID, name: 'Bin Ramadan', location: 'Mogadishu' },
      { id: XARUN_RAMADAN_ZOOPE_ID, name: 'Ramadan Zoope', location: 'Zoope' }
    ];

    for (const x of xarumo) {
      await fetch(`${baseUrl}/xarumo`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(x)
      });
      console.log(`Restored Xarun: ${x.name}`);
    }

    // 2. Upsert Branches
    const branches = [
      { id: BRANCH_ISKOOLKA_ID, name: 'Iskoolka', xarun_id: XARUN_XAMAR_WEYNE_ID, location: 'Xamar weyne' },
      { id: BRANCH_CUMAR_AWOW_ID, name: 'Cumar Awow', xarun_id: XARUN_XAMAR_WEYNE_ID, location: 'Xamar weyne' },
      { id: BRANCH_RAMADAN_PAINT_ID, name: 'Ramadan Paint', xarun_id: XARUN_XAMAR_WEYNE_ID, location: 'Xamar weyne' },
      { id: BRANCH_BACADLAHA_ID, name: 'Bacadlaha', xarun_id: XARUN_XAMAR_WEYNE_ID, location: 'Xamar weyne' },
      // Add main branches for others
      { id: crypto.randomUUID(), name: 'Bakaaro Main', xarun_id: XARUN_BAKAARO_ID, location: 'Bakaaro' },
      { id: crypto.randomUUID(), name: 'Bin Ramadan Main', xarun_id: XARUN_BIN_RAMADAN_ID, location: 'Mogadishu' },
      { id: crypto.randomUUID(), name: 'Zoope Main', xarun_id: XARUN_RAMADAN_ZOOPE_ID, location: 'Zoope' }
    ];

    for (const b of branches) {
      await fetch(`${baseUrl}/branches`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(b)
      });
      console.log(`Restored Branch: ${b.name} under Bariire Xamar weyne`);
    }

    // 3. Seed Inventory Items
    const itemTemplates = [
      { name: 'Saliid 5L', category: 'Cunto', sku_prefix: 'SAL' },
      { name: 'Bariis 25kg', category: 'Cunto', sku_prefix: 'BAR' },
      { name: 'Sonkor 50kg', category: 'Cunto', sku_prefix: 'SON' },
      { name: 'Baasto 10kg', category: 'Cunto', sku_prefix: 'BAS' },
      { name: 'Caano Boore', category: 'Cunto', sku_prefix: 'CAA' },
      { name: 'Bur 50kg', category: 'Cunto', sku_prefix: 'BUR' },
      { name: 'Rinjiga Cad', category: 'Hardware', sku_prefix: 'RIN' },
      { name: 'Musbaar 2-inch', category: 'Hardware', sku_prefix: 'MUS' },
      { name: 'Generator 5KW', category: 'Machinery', sku_prefix: 'GEN' },
      { name: 'Solar Panel 200W', category: 'Energy', sku_prefix: 'SOL' }
    ];

    const allItems = [];
    const allTransactions = [];

    for (const b of branches) {
      for (const t of itemTemplates) {
        const itemId = crypto.randomUUID();
        const qty = Math.floor(Math.random() * 500) + 50;
        const item = {
          id: itemId,
          name: t.name,
          category: t.category,
          sku: `${t.sku_prefix}-${b.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          quantity: qty,
          min_threshold: 20,
          shelves: Math.floor(Math.random() * 10) + 1,
          sections: Math.floor(Math.random() * 5) + 1,
          branch_id: b.id,
          xarun_id: b.xarun_id,
          last_updated: new Date().toISOString()
        };
        allItems.push(item);

        // Add an initial transaction for each item
        allTransactions.push({
          id: crypto.randomUUID(),
          item_id: itemId,
          item_name: t.name,
          type: 'IN',
          quantity: qty,
          status: 'APPROVED',
          requested_by: 'System Restore',
          branch_id: b.id,
          xarun_id: b.xarun_id,
          timestamp: new Date().toISOString(),
          notes: 'Initial stock restoration'
        });
      }
    }

    console.log(`Inserting ${allItems.length} inventory items...`);
    const itemRes = await fetch(`${baseUrl}/inventory_items`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(allItems)
    });
    console.log('Inventory Insert Status:', itemRes.status);

    console.log(`Inserting ${allTransactions.length} transactions...`);
    const transRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(allTransactions)
    });
    console.log('Transactions Insert Status:', transRes.status);

    console.log('--- Restoration Complete! ---');

  } catch (error) {
    console.error('Error during restoration:', error);
  }
}

restoreSystem();
