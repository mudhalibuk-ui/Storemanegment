import { API } from './services/api.js';

async function fixData() {
  try {
    const selectedDate = '2026-03-30';
    const attendanceData = await API.attendance.getByDate(selectedDate);
    console.log(`Found ${attendanceData.length} records for ${selectedDate}`);
    
    for (const record of attendanceData) {
      if (record.notes === 'HOLIDAY - Public Holiday / Ciid' || record.notes === 'Public Holiday / Ciid' || record.status === 'HOLIDAY') {
        if (record.clockIn) {
          // If they clocked in, they should be PRESENT or LATE
          const hour = new Date(record.clockIn).getUTCHours();
          const newStatus = hour >= 9 ? 'ABSENT' : (hour === 8 ? 'LATE' : 'PRESENT');
          
          console.log(`Fixing ${record.employeeId}: has clockIn ${record.clockIn}, setting to ${newStatus}`);
          await API.attendance.save({
            ...record,
            status: newStatus,
            notes: 'Fixed by system'
          });
        } else {
          // If no clock in, maybe delete the record? Or set to ABSENT?
          // Let's just delete the accidental holiday records that have no clock in
          console.log(`Deleting accidental holiday record for ${record.employeeId}`);
          // Wait, API doesn't have attendance.delete. We can use supabaseFetch directly.
          const { supabaseFetch } = await import('./services/supabaseClient.js');
          await supabaseFetch(`attendance?id=eq.${record.id}`, { method: 'DELETE' });
        }
      }
    }
    console.log('Fix complete.');
  } catch (e) {
    console.error(e);
  }
}

fixData();
