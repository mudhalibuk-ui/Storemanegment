import { API } from './services/api.js';

async function testAll() {
  try {
    const employees = await API.employees.getAll();
    console.log(`Found ${employees.length} employees`);
    
    const selectedDate = '2026-03-30';
    const attendanceData = await API.attendance.getByDate(selectedDate);
    console.log(`Found ${attendanceData.length} attendance records for ${selectedDate}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const emp of employees) {
      const existingRecord = attendanceData.find(a => a.employeeId === emp.id);
      const newRecord: any = {
          id: existingRecord?.id,
          employeeId: emp.id,
          date: selectedDate,
          status: 'HOLIDAY',
          notes: 'Public Holiday / Ciid',
          deviceId: existingRecord?.deviceId || 'SYSTEM-HOLIDAY'
      };
      
      try {
        await API.attendance.save(newRecord);
        successCount++;
      } catch (e) {
        console.error(`Failed for employee ${emp.id}:`, (e as Error).message);
        failCount++;
      }
    }
    
    console.log(`Success: ${successCount}, Fail: ${failCount}`);
  } catch (e) {
    console.error('Fatal Error:', e);
  }
}

testAll();
