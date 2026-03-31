import { API } from './services/api.js';

async function testAutoCheckout() {
  try {
    const mockRecord: any = {
      id: 'test-auto-checkout-id-123',
      employeeId: '8f07a22b-2f24-4bf1-8f49-af20c8cc4fb7',
      date: '2026-03-28', // two days ago
      status: 'PRESENT',
      clockIn: '2026-03-28T08:00:00',
      clockOut: null,
      notes: 'Test record'
    };
    
    await API.attendance.save(mockRecord);
    
    const data = await API.attendance.getByDate('2026-03-28');
    const record = data.find(r => r.id === mockRecord.id);
    console.log('Record for 2026-03-28 clockOut:', record?.clockOut); // should be 2026-03-28T17:00:00
    
    // Clean up
    await API.attendance.delete(mockRecord.id);
  } catch (e) {
    console.error(e);
  }
}

testAutoCheckout();
