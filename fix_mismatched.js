import fs from 'fs';

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM';
const baseUrl = 'https://htmrapyxzfhvooxqacjd.supabase.co/rest/v1';

function toSnakeCase(obj) {
  const sc = {};
  for(let k in obj) {
    sc[k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = obj[k];
  }
  return sc;
}

async function fix() {
  const tr = await fetch(`${baseUrl}/transactions`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const trans = await tr.json();
  
  const ir = await fetch(`${baseUrl}/inventory_items`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  let items = await ir.json();
  
  const itemMap = new Map(items.map(i => [i.id, i]));
  
  const mismatched = trans.filter(t => {
    if (t.type === 'TRANSFER') return false; 
    const i = itemMap.get(t.item_id);
    return i && t.branch_id !== i.branch_id;
  });
  
  console.log(`Found ${mismatched.length} mismatched transactions.`);
  
  for (const t of mismatched) {
    const sourceItem = itemMap.get(t.item_id);
    if (!sourceItem) continue;
    
    console.log(`Fixing transaction ${t.id} for ${t.item_name} (${t.type})`);
    
    // 1. Find or create correct item
    let correctItem = items.find(i => i.sku === sourceItem.sku && i.branch_id === t.branch_id);
    
    if (!correctItem) {
      const newId = crypto.randomUUID();
      const newItem = {
        ...sourceItem,
        id: newId,
        branch_id: t.branch_id,
        quantity: 0,
        shelves: 0,
        sections: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      
      const r = await fetch(`${baseUrl}/inventory_items`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (!r.ok) {
         console.error('Failed to create item', await r.text());
         continue;
      }
      correctItem = newItem;
      items.push(correctItem); // keep track
      itemMap.set(correctItem.id, correctItem);
      console.log(`  -> Created new target item ${newId}`);
    } else {
      console.log(`  -> Found existing target item ${correctItem.id}`);
    }
    
    // 2. Adjust quantities
    if (t.type === 'IN') {
      sourceItem.quantity -= t.quantity;
      if (sourceItem.quantity < 0) sourceItem.quantity = 0;
      correctItem.quantity += t.quantity;
    } else if (t.type === 'OUT' || t.type === 'MOVE') {
      sourceItem.quantity += t.quantity; // reverse the out
      correctItem.quantity -= t.quantity;
      if (correctItem.quantity < 0) correctItem.quantity = 0;
    }
    
    // Update source item in DB
    await fetch(`${baseUrl}/inventory_items?id=eq.${sourceItem.id}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: sourceItem.quantity, last_updated: new Date().toISOString() })
    });
    
    // Update correct item in DB
    await fetch(`${baseUrl}/inventory_items?id=eq.${correctItem.id}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: correctItem.quantity, last_updated: new Date().toISOString() })
    });
    
    // 3. Update transaction
    await fetch(`${baseUrl}/transactions?id=eq.${t.id}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: correctItem.id })
    });
    
    console.log(`  -> Fixed.`);
  }
  
  console.log('Done!');
}

fix();
