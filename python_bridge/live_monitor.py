
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

def get_or_create_employee_uuid(zk_user_id):
    """
    Finds the Supabase UUID for a given ZK User ID.
    If not found, AUTO-CREATES the user to ensure attendance is captured.
    """
    str_user_id = str(zk_user_id)
    
    try:
        # 1. Try to find existing user
        response = supabase.table('employees') \
            .select("id") \
            .eq("employee_id_code", str_user_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        
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
        
        insert_response = supabase.table('employees').insert(new_emp).execute()
        log_message(f"✅ Created new employee profile for ID {zk_user_id}")
        return new_uuid

    except Exception as e:
        log_message(f"❌ Database Error (User Lookup/Create): {e}")
        return None

def push_attendance_to_cloud(zk_user_id, timestamp):
    """
    Pushes the attendance record to Supabase.
    """
    emp_uuid = get_or_create_employee_uuid(zk_user_id)
    
    if not emp_uuid:
        log_message(f"⚠️ CRITICAL: Could not resolve UUID for User {zk_user_id}. Log skipped.")
        return

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
            new_record = {
                "employee_id": emp_uuid,
                "date": log_date,
                "status": "PRESENT",
                "clock_in": iso_timestamp,
                "device_id": "ZK-U280-REALTIME",
                "notes": "Live Fingerprint Scan"
            }
            supabase.table('attendance').insert(new_record).execute()
            log_message(f"✅ CLOCK IN SAVED: User {zk_user_id} -> Cloud.")
        else:
            log_message(f"ℹ️  User {zk_user_id} already clocked in today.")

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
    print("------------------------------------------------")
    print("   SMARTSTOCK PRO - REAL-TIME MONITOR (AUTO-REG)")
    print(f"   Target: {ZK_IP} -> Supabase")
    print("------------------------------------------------")
    try:
        monitor_device()
    except KeyboardInterrupt:
        print("\nStopping Monitor...")
        sys.exit()
