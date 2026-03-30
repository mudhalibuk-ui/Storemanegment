
import os
import sys
import uuid
from datetime import datetime, timedelta
from zk import ZK
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# 1. SETUP & CONFIGURATION
base_dir = Path(__file__).resolve().parent
env_path = base_dir / '.env'
load_dotenv(dotenv_path=env_path)

ZK_IP = os.getenv('ZK_IP', '192.168.100.201')
ZK_PORT = int(os.getenv('ZK_PORT', 4370))
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Fadlan hubi file-ka .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_employee_map():
    """
    Soo qaado shaqaalaha oo dhan si loo helo ID-ga saxda ah (UUID) iyo Shift info.
    Returns: Dictionary { 'ZK_ID': employee_info_dict }
    """
    print("⏳ Soo aqrinaya shaqaalaha database-ka...")
    try:
        response = supabase.table('employee_shift_view').select("*").execute()
        return {e['employee_id_code']: e for e in response.data}
    except Exception as e:
        print(f"❌ Cilad Database: {e}")
        return {}

def get_date_range(choice):
    today = datetime.now()
    if choice == '1': # Bishan (Current Month)
        start_date = today.replace(day=1, hour=0, minute=0, second=0)
        return start_date
    elif choice == '2': # Bishii Hore (Last Month)
        first_day_this_month = today.replace(day=1)
        last_month_end = first_day_this_month - timedelta(days=1)
        start_date = last_month_end.replace(day=1, hour=0, minute=0, second=0)
        return start_date
    elif choice == '3': # Dhamaan (All Time)
        return datetime(2000, 1, 1) # Taariikh hore oo fog
    return None

def sync_device_logs():
    print("\n========================================")
    print("   SMARTSTOCK - HISTORY SYNC MANAGER")
    print("========================================")
    print(" 1. Soo qaad xogta BISHAN (Current Month)")
    print(" 2. Soo qaad xogta BISHII HORE (Last Month)")
    print(" 3. Soo qaad DHAMAAN xogta (All Data)")
    print("========================================")
    
    choice = input("Dooro (1/2/3): ").strip()
    start_filter_date = get_date_range(choice)
    
    if not start_filter_date:
        print("❌ Doorasho qaldan.")
        return

    # 1. Connect to ZK
    zk = ZK(ZK_IP, port=ZK_PORT, timeout=20, force_udp=False, ommit_ping=False)
    conn = None
    
    try:
        print(f"🔌 Ku xirmaya aaladda {ZK_IP}...")
        conn = zk.connect()
        conn.disable_device() # Device-ka xir inta aqrinta socoto
        
        print("📥 Soo dajinaya logs-ka (wuu yara daahi karaa)...")
        logs = conn.get_attendance()
        print(f"✅ Lasoo helay {len(logs)} record aaladda gudaheeda.")

        # 2. Get Employee Map
        emp_map = get_employee_map()
        if not emp_map:
            print("⚠️ Lama helin shaqaale diiwaangashan. Fadlan marka hore 'Sync Users' samee.")
            return

        # Get Device UUID
        device_uuid = None
        try:
            dev_res = supabase.table('devices').select('id').eq('ip_address', ZK_IP).execute()
            if dev_res.data:
                device_uuid = dev_res.data[0]['id']
        except: pass

        print(f"🔍 Sifeynaya wixii ka dambeeyay: {start_filter_date.strftime('%Y-%m-%d')}")
        
        # Sort logs by timestamp for Smart In/Out
        sorted_logs = sorted(logs, key=lambda x: x.timestamp)
        
        count_inserted = 0
        count_updated = 0
        count_skipped = 0
        
        for log in sorted_logs:
            # Filter by Date
            if log.timestamp < start_filter_date:
                continue
                
            user_id_str = str(log.user_id)
            
            # Check if user exists in Supabase
            if user_id_str not in emp_map:
                continue

            emp = emp_map[user_id_str]
            emp_uuid = emp['employee_id']
            log_date_str = log.timestamp.strftime("%Y-%m-%d")
            log_time_iso = log.timestamp.isoformat()
            
            # Logic: Check Duplicate in DB for this day
            try:
                check = supabase.table('attendance') \
                    .select("*") \
                    .eq("employee_id", emp_uuid) \
                    .eq("date", log_date_str) \
                    .execute()

                if not check.data:
                    # === CLOCK IN ===
                    check_in_time = log.timestamp.strftime("%H:%M:%S")
                    status = "PRESENT"
                    notes = "Device History Sync"
                    
                    # Dynamic Thresholds
                    late_time = emp.get('late_threshold', '08:00:00')
                    absent_time = emp.get('absent_threshold', '09:00:00')

                    if check_in_time >= absent_time:
                        status = 'LATE'
                        notes = 'Very Late (History Sync)'
                    elif check_in_time >= late_time:
                        status = 'LATE'
                        notes = 'Late Arrival (History Sync)'

                    # Insert
                    new_record = {
                        "id": str(uuid.uuid4()),
                        "employee_id": emp_uuid,
                        "date": log_date_str,
                        "status": status,
                        "clock_in": log_time_iso,
                        "device_id": f"ZK-{ZK_IP} (History)",
                        "device_uuid": device_uuid,
                        "notes": notes
                    }
                    supabase.table('attendance').insert(new_record).execute()
                    count_inserted += 1
                    print(f"✅ Clock In: {user_id_str} @ {log.timestamp}")
                else:
                    # === CLOCK OUT (Update) ===
                    record = check.data[0]
                    record_id = record['id']
                    
                    current_clock_in = record.get('clock_in')
                    current_clock_out = record.get('clock_out')
                    
                    should_update = False
                    if current_clock_in:
                        if log_time_iso > current_clock_in:
                            if not current_clock_out or log_time_iso > current_clock_out:
                                should_update = True
                    
                    if should_update:
                        update_data = {
                            "clock_out": log_time_iso,
                            "device_id": f"ZK-{ZK_IP} (History)",
                            "device_uuid": device_uuid
                        }
                        supabase.table('attendance').update(update_data).eq('id', record_id).execute()
                        count_updated += 1
                        print(f"👋 Clock Out Updated: {user_id_str} @ {log.timestamp}")
                    else:
                        count_skipped += 1
            except Exception as db_err:
                print(f"❌ Error processing log: {db_err}")

        print("\n----------------------------------------")
        print(f"🎉 SHAQADU WAA DHAMAATAY!")
        print(f"📥 Lagu daray (Inserted): {count_inserted}")
        print(f"🔄 Lagu daray (Updated):  {count_updated}")
        print(f"⏭️  Laga booday (Exists): {count_skipped}")
        print("----------------------------------------")

    except Exception as e:
        print(f"❌ Cilad culus: {e}")
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()
            print("🔌 Device Disconnected.")

if __name__ == "__main__":
    sync_device_logs()
