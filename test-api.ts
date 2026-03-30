import { API } from './services/api.js';

async function test() {
  try {
    const result = await API.attendance.save({
      employeeId: 'a894b781-317b-4a72-b298-7f12d316db87',
      date: '2026-03-30',
      status: 'HOLIDAY',
      notes: 'Public Holiday / Ciid'
    });
    console.log('Save result:', result);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
