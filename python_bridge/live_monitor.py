
import time
import sys
import uuid
from datetime import datetime
from zk import ZK, const
from supabase import create_client, Client
import threading

# ==========================================
# CONFIGURATION
# ==========================================
ZK_IP = '192.168.100.201'  # IP-ga ZKTeco u280
ZK_PORT = 4370

SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM'

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def log_message(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")

# Global Device UUID
DEVICE_UUID = None

def init_device_uuid():
    global DEVICE_UUID
    try:
        res = supabase.table('devices').select('id').eq('ip_address', ZK_IP).execute()
        if res.data:
            DEVICE_UUID = res.data[0]['id']
            log_message(f"📍 Device UUID resolved: {DEVICE_UUID}")
    except Exception as e:
        log_message(f"⚠️ Could not resolve device UUID: {e}")

def get_default_xarun():
    """Gets valid Xarun ID or creates one if missing."""
    try:
        res = supabase.table('xarumo').select('id').limit(1).execute()
        if res.data:
            return res.data[0]['id']
        
        supabase.table('xarumo').insert({"id": "x1", "name": "Main HQ", "location": "Default"}).execute()
        return "x1"
    except:
        return None

def get_or_create_employee_info(zk_user_id):
    """
    Finds the Supabase UUID and Shift info for a given ZK User ID.
    If not found, AUTO-CREATES the user to ensure attendance is captured.
    """
    str_user_id = str(zk_user_id)
    
    try:
        # 1. Try to find existing user via shift view
        response = supabase.table('employee_shift_view') \
            .select("*") \
            .eq("employee_id_code", str_user_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        
        # 2. If not found, Auto-Register (Self-Healing)
        log_message(f"🆕 User ID {zk_user_id} not found in DB. Auto-registering...")
        
        xarun_id = get_default_xarun()
        
        new_uuid = str(uuid.uuid4())
        new_emp = {
            "id": new_uuid,
            "name": f"Scanner User {zk_user_id}", # Placeholder Name
            "employee_id_code": str_user_id,
            "position": "STAFF",
            "status": "ACTIVE",
            "joined_date": datetime.now().strftime("%Y-%m-%d"),
            "xarun_id": xarun_id,
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={str_user_id}",
            "salary": 0
        }
        
        supabase.table('employees').insert(new_emp).execute()
        log_message(f"✅ Created new employee profile for ID {zk_user_id}")
        
        # Fetch again from view to get shift info
        res = supabase.table('employee_shift_view').select("*").eq('employee_id_code', str_user_id).execute()
        return res.data[0] if res.data else None

    except Exception as e:
        log_message(f"❌ Database Error (User Lookup/Create): {e}")
        return None

def push_attendance_to_cloud(zk_user_id, timestamp):
    """
    Pushes the attendance record to Supabase.
    """
    emp = get_or_create_employee_info(zk_user_id)
    
    if not emp:
        log_message(f"⚠️ CRITICAL: Could not resolve info for User {zk_user_id}. Log skipped.")
        return

    emp_uuid = emp['employee_id']
    log_date = timestamp.strftime("%Y-%m-%d")
    iso_timestamp = timestamp.isoformat()

    try:
        # Check if record exists for today to prevent duplicate 'PRESENT' entries
        check = supabase.table('attendance') \
            .select("id") \
            .eq("employee_id", emp_uuid) \
            .eq("date", log_date) \
            .execute()

        if not check.data:
            # Create NEW record (Clock In)
            check_in_time = timestamp.strftime("%H:%M:%S")
            status = 'PRESENT'
            notes = 'Live Fingerprint Scan'
            
            # Dynamic Thresholds
            late_time = emp.get('late_threshold', '08:00:00')
            absent_time = emp.get('absent_threshold', '09:00:00')

            if check_in_time >= absent_time:
                status = 'LATE'
                notes = 'Very Late (After Absent Threshold)'
            elif check_in_time >= late_time:
                status = 'LATE'
                notes = 'Late Arrival'

            new_record = {
                "id": str(uuid.uuid4()),
                "employee_id": emp_uuid,
                "date": log_date,
                "status": status,
                "clock_in": iso_timestamp,
                "device_id": f"ZK-U280-REALTIME ({ZK_IP})",
                "device_uuid": DEVICE_UUID,
                "notes": notes
            }
            try:
                supabase.table('attendance').insert(new_record).execute()
                log_message(f"✅ CLOCK IN SAVED: User {zk_user_id} -> Cloud.")
            except Exception as e:
                log_message(f"❌ Error saving clock-in: {e}")
        else:
            # Update EXISTING record (Clock Out)
            record = check.data[0]
            record_id = record['id']
            
            # Prevent rapid duplicate scans (debounce 2 mins)
            current_clock_in = record.get('clock_in')
            current_clock_out = record.get('clock_out')
            
            should_update = False
            if current_clock_in:
                if iso_timestamp > current_clock_in:
                    if not current_clock_out or iso_timestamp > current_clock_out:
                        should_update = True
            
            if should_update:
                try:
                    update_data = {
                        "clock_out": iso_timestamp,
                        "device_id": f"ZK-U280-REALTIME ({ZK_IP})",
                        "device_uuid": DEVICE_UUID
                    }
                    supabase.table('attendance').update(update_data).eq('id', record_id).execute()
                    log_message(f"👋 CLOCK OUT UPDATED: User {zk_user_id} at {timestamp.strftime('%H:%M')}")
                except Exception as e:
                    log_message(f"❌ Error updating clock-out: {e}")
            else:
                log_message(f"ℹ️  User {zk_user_id} already clocked in today (Debounced).")

    except Exception as e:
        log_message(f"❌ Cloud Sync Error: {e}")

def monitor_device():
    """
    Main loop that connects to the device and listens for live events.
    """
    zk = ZK(ZK_IP, port=ZK_PORT, timeout=10, force_udp=False, ommit_ping=False)
    
    while True:
        conn = None
        try:
            log_message(f"🔌 Connecting to ZK Device at {ZK_IP}...")
            conn = zk.connect()
            log_message("✅ Connected successfully! Waiting for fingerprints...")
            
            # This generator yields live events
            for event in conn.live_capture():
                if event is None:
                    continue # Keep-alive
                
                # Check if it's an attendance event
                if event.user_id:
                    log_message(f"⚡ Fingerprint Detected! User ID: {event.user_id}")
                    
                    # Push to cloud in a separate thread to not block the listener
                    threading.Thread(target=push_attendance_to_cloud, args=(event.user_id, event.timestamp)).start()

        except Exception as e:
            log_message(f"❌ Connection Lost/Error: {e}")
            log_message("🔄 Reconnecting in 10 seconds...")
        finally:
            if conn:
                try:
                    conn.disconnect()
                except:
                    pass
        
        time.sleep(10)

if __name__ == "__main__":
    init_device_uuid()
    print("------------------------------------------------")
    print("   SMARTSTOCK PRO - REAL-TIME MONITOR (AUTO-REG)")
    print(f"   Target: {ZK_IP} -> Supabase")
    print("------------------------------------------------")
    try:
        monitor_device()
    except KeyboardInterrupt:
        print("\nStopping Monitor...")
        sys.exit()
