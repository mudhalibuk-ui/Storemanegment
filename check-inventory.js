const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

async function checkInventory() {
  try {
    const r = await fetch(`${baseUrl}/inventory_items?select=id,name,sku,quantity,branch_id,xarun_id`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    const items = await r.json();
    console.log(`Total Inventory Items: ${items.length}`);
    
    const branchCounts = {};
    items.forEach(item => {
      branchCounts[item.branch_id] = (branchCounts[item.branch_id] || 0) + 1;
    });
    
    console.log('Items per Branch ID:', JSON.stringify(branchCounts, null, 2));

    const rb = await fetch(`${baseUrl}/branches?select=id,name,xarun_id`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    const branches = await rb.json();
    const branchMap = {};
    branches.forEach(b => branchMap[b.id] = b.name);
    
    console.log('Branch Names:', JSON.stringify(branchMap, null, 2));

    const rx = await fetch(`${baseUrl}/xarumo?select=id,name`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    const xarumo = await rx.json();
    const xarunMap = {};
    xarumo.forEach(x => xarunMap[x.id] = x.name);
    console.log('Xarun Names:', JSON.stringify(xarunMap, null, 2));

  } catch (e) {
    console.error('Error checking inventory:', e);
  }
}

checkInventory();
