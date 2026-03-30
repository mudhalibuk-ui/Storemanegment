import { API } from './services/api.js';

async function checkData() {
  try {
    const selectedDate = '2026-03-30';
    const attendanceData = await API.attendance.getByDate(selectedDate);
    console.log(`Found ${attendanceData.length} records for ${selectedDate}`);
    attendanceData.forEach(r => {
      console.log(`- ${r.employeeId}: ${r.status} (clockIn: ${r.clockIn})`);
    });
  } catch (e) {
    console.error(e);
  }
}

checkData();
