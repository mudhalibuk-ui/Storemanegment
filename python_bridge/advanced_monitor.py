
import time
import sys
import os
import schedule
import threading
import uuid
import logging
from datetime import datetime, time as dtime, timedelta
from pathlib import Path
from zk import ZK
from supabase import create_client, Client
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATION ---
LOG_FILE = "monitor_service.log"

# --- LOGGING SETUP (Robust for Windows/Docker) ---
handlers = [
    logging.FileHandler(LOG_FILE, encoding='utf-8')
]

try:
    if sys.platform.startswith('win'):
        import io
        console_stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        handlers.append(logging.StreamHandler(console_stream))
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except AttributeError:
            sys.stdout = console_stream
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    else:
        handlers.append(logging.StreamHandler(sys.stdout))
except Exception as e:
    print(f"Warning: Could not configure UTF-8 logging: {e}")
    handlers.append(logging.StreamHandler(sys.stdout))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(threadName)s - %(message)s',
    handlers=handlers
)

base_dir = Path(__file__).resolve().parent
env_path = base_dir / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ Error: .env file missing or incomplete.")
    sys.exit(1)

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global Cache & Locks
employee_cache = {}
active_devices = {}
active_zk_connections = {} 
device_locks = {}

# --- FLASK API APP (Port 5050) ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def ensure_valid_xarun(target_id):
    try:
        if target_id:
            res = supabase.table('xarumo').select('id').eq('id', target_id).execute()
            if res.data: return target_id
        
        res = supabase.table('xarumo').select('id').limit(1).execute()
        if res.data: return res.data[0]['id']
            
        supabase.table('xarumo').insert({"id": "x1", "name": "Main HQ", "location": "Default"}).execute()
        return "x1"
    except Exception as e:
        logging.error(f"Xarun Validation Error: {e}")
        return None

# --- AUTO ABSENT CHECK (9:00 AM) ---
def run_auto_absent_check():
    logging.info("⏰ Running Auto-Absent Check (No-show by 9:00 AM)...")
    try:
        # 1. Get all active employees
        emps_res = supabase.table('employees').select("id, name").eq("status", "ACTIVE").execute()
        if not emps_res.data: 
            logging.info("No active employees found.")
            return

        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # 2. Get today's attendance
        atts_res = supabase.table('attendance').select("employee_id").eq("date", today_str).execute()
        present_ids = {a['employee_id'] for a in atts_res.data}

        absent_payloads = []
        for emp in emps_res.data:
            if emp['id'] not in present_ids:
                absent_payloads.append({
                    "id": str(uuid.uuid4()),
                    "employee_id": emp['id'],
                    "date": today_str,
                    "status": "ABSENT",
                    "clock_in": None, # IMPORTANT: Null indicates they haven't arrived yet
                    "notes": "Auto-Absent: No show by 9:00am"
                })
        
        if absent_payloads:
            supabase.table('attendance').insert(absent_payloads).execute()
            logging.info(f"❌ Marked {len(absent_payloads)} employees as ABSENT.")
        else:
            logging.info("✅ Everyone has clocked in or already accounted for.")
            
    except Exception as e:
        logging.error(f"Auto-Absent Error: {e}")

# --- ATTENDANCE MONITOR (REAL TIME) ---
def push_attendance(user_id, timestamp, device_info):
    """
    Real-time Logic:
    1. Checks if record exists for TODAY.
    2. If NO: Creates 'Check In' with Status Logic (Present/Late/Absent).
    3. If YES: Updates 'Check Out', 'Overtime In', or 'Overtime Out' sequentially.
    """
    zk_id = str(user_id)
    if zk_id not in employee_cache:
        refresh_employee_cache()
    
    # Auto Create user if missing
    if zk_id not in employee_cache:
        try:
            new_uuid = str(uuid.uuid4())
            supabase.table('employees').insert({
                "id": new_uuid,
                "name": f"Auto User {zk_id}",
                "employee_id_code": zk_id,
                "status": "ACTIVE",
                "joined_date": datetime.now().strftime("%Y-%m-%d"),
                "xarun_id": device_info.get('xarun_id'),
                "salary": 0
            }).execute()
            refresh_employee_cache()
        except: return

    emp = employee_cache.get(zk_id)
    if not emp: return

    date_str = timestamp.strftime("%Y-%m-%d")
    iso_time = timestamp.isoformat()
    ip_addr = device_info.get('ip_address', device_info.get('ip', 'Unknown'))
    dev_name = device_info.get('name', 'Device')

    try:
        # Fetch existing record for THIS EMPLOYEE on THIS DAY
        existing = supabase.table('attendance').select("*").eq("employee_id", emp['uuid']).eq("date", date_str).execute()
        
        if not existing.data:
            # === SCENARIO 1: CHECK IN (First Scan) ===
            
            # Logic: 7-8am (Present), 8-9am (Late), >9am (Absent)
            check_in_hour = timestamp.hour
            status = 'PRESENT'
            notes = 'On Time'

            if 7 <= check_in_hour < 8:
                status = 'PRESENT'
                notes = 'On Time (7am-8am)'
            elif 8 <= check_in_hour < 9:
                status = 'LATE'
                notes = 'Late Arrival (8am-9am)'
            elif check_in_hour >= 9:
                status = 'ABSENT' # As requested: Absent without excuse if > 9am
                notes = 'Auto-Absent (Arrived after 9am)'
            elif check_in_hour < 7:
                status = 'PRESENT'
                notes = 'Early Arrival'

            data = {
                "id": str(uuid.uuid4()),
                "employee_id": emp['uuid'],
                "date": date_str,
                "status": status,
                "clock_in": iso_time,
                "device_id": f"{dev_name} ({ip_addr})",
                "notes": notes
            }
            supabase.table('attendance').insert(data).execute()
            logging.info(f"✅ CHECK IN: {emp['name']} - Status: {status}")

        else:
            # === SCENARIO 2: UPDATE EXISTING ===
            record = existing.data[0]
            record_id = record['id']
            
            # Debounce: Prevent double scanning within 1 minute
            last_action_time = None
            if record.get('overtime_out'): last_action_time = record['overtime_out']
            elif record.get('overtime_in'): last_action_time = record['overtime_in']
            elif record.get('clock_out'): last_action_time = record['clock_out']
            elif record.get('clock_in'): last_action_time = record['clock_in']

            if last_action_time:
                last_dt = datetime.fromisoformat(last_action_time.replace('Z', '+00:00'))
                try:
                    time_diff = (timestamp - last_dt.replace(tzinfo=None)).total_seconds()
                except:
                    time_diff = 60 

                if time_diff < 60: 
                    logging.info(f"⏳ Ignored rapid scan for {emp['name']}")
                    return

            # Determine which field to update
            update_payload = {}
            action_type = ""

            # Case: Auto-Absent Record (Clock In is missing)
            if record.get('clock_in') is None:
                # They arrived late (after 9am auto-check)
                # We update clock_in but KEEP status as ABSENT (as per rule)
                update_payload = {
                    "clock_in": iso_time,
                    "device_id": f"{dev_name} ({ip_addr})",
                    "notes": "Arrived after 9am (Auto-Absent Applied)"
                }
                action_type = "LATE ARRIVAL (Status: ABSENT)"
                
            elif not record.get('clock_out'):
                # First exit -> Check Out
                update_payload = {"clock_out": iso_time}
                action_type = "CHECK OUT"
            elif not record.get('overtime_in'):
                # Second entry -> Overtime In
                update_payload = {"overtime_in": iso_time}
                action_type = "OVERTIME IN"
            elif not record.get('overtime_out'):
                # Second exit -> Overtime Out
                update_payload = {"overtime_out": iso_time}
                action_type = "OVERTIME OUT"
            else:
                logging.info(f"ℹ️ {emp['name']} has completed all cycle steps for today.")
                return

            if update_payload:
                supabase.table('attendance').update(update_payload).eq('id', record_id).execute()
                logging.info(f"✅ {action_type}: {emp['name']}")

    except Exception as e:
        logging.error(f"DB Error processing attendance: {e}")

def refresh_employee_cache():
    global employee_cache
    try:
        response = supabase.table('employee_shift_view').select("*").execute()
        new_cache = {}
        for row in response.data:
            key_code = str(row.get('employee_id_code'))
            data = {
                'uuid': row['employee_id'],
                'name': row['name']
            }
            new_cache[key_code] = data
        employee_cache = new_cache
        logging.info(f"🔄 Cache Refreshed: {len(employee_cache)} employees loaded.")
    except Exception as e:
        logging.error(f"Cache Error: {e}")

def monitor_single_device(device):
    ip = device['ip_address']
    port = device.get('port', 4370)
    zk = ZK(ip, port=port, timeout=10, force_udp=False, ommit_ping=False)
    dev_name = device.get('name', 'Unknown')

    while True:
        if device_locks.get(ip, False):
            time.sleep(2)
            continue

        conn = None
        try:
            logging.info(f"🔌 Monitor Connecting to {dev_name} ({ip})...")
            conn = zk.connect()
            active_zk_connections[ip] = conn
            
            # --- CATCH UP LOGIC (OFFLINE SYNC) ---
            logging.info(f"📥 Checking offline logs for today from {dev_name}...")
            try:
                logs = conn.get_attendance()
                today_str = datetime.now().strftime("%Y-%m-%d")
                sync_count = 0
                for log in logs:
                    if log.timestamp.strftime("%Y-%m-%d") == today_str:
                        # Process sequentially to ensure IN -> OUT -> OT logic holds
                        push_attendance(log.user_id, log.timestamp, device)
                        sync_count += 1
                logging.info(f"✅ Offline Sync Checked. Processed {sync_count} logs for today.")
            except Exception as e:
                logging.error(f"⚠️ Offline Sync Warning: {e}")
            # -------------------------------------

            logging.info(f"✅ MONITOR ACTIVE: {dev_name} - Waiting for live scans...")
            
            for event in conn.live_capture():
                if device_locks.get(ip, False): break
                if event and event.user_id:
                    threading.Thread(target=push_attendance, args=(event.user_id, event.timestamp, device)).start()
        except Exception as e:
            if not device_locks.get(ip, False):
                logging.error(f"Connection lost {dev_name} ({ip}): {e}")
                time.sleep(10)
        finally:
            if ip in active_zk_connections: del active_zk_connections[ip]
            if conn: 
                try: conn.disconnect()
                except: pass
        time.sleep(2)

def start_monitors():
    try:
        res = supabase.table('devices').select("*").eq('is_active', True).execute()
        devices = res.data or []
        if not devices:
             logging.info("No devices found in DB. Defaulting to local config.")
             devices = [{'name': 'Default', 'ip_address': '192.168.100.201', 'port': 4370, 'id': None, 'xarun_id': None}]

        for dev in devices:
            if dev['ip_address'] in active_devices: continue
            t = threading.Thread(target=monitor_single_device, args=(dev,), name=f"Thread-{dev['name']}")
            t.daemon = True
            t.start()
            active_devices[dev['ip_address']] = t
            
    except Exception as e:
        logging.error(f"Failed to fetch devices: {e}")

def main():
    print("------------------------------------------------")
    print("   SMARTSTOCK PRO - UNIFIED SERVICE")
    print("   [1] Flask API: http://localhost:5050")
    print("   [2] Real-time Monitors: Active (With Offline Sync)")
    print("   [3] Auto-Absent Scheduler: Active (09:00 AM)")
    print("------------------------------------------------")
    logging.info("Service Started.")
    
    refresh_employee_cache()
    
    # Schedule Tasks
    schedule.every(30).minutes.do(refresh_employee_cache)
    schedule.every().day.at("09:00").do(run_auto_absent_check) # Run absent check at 9am
    
    threading.Thread(target=run_flask_api, daemon=True, name="FlaskAPI").start()
    start_monitors()

    try:
        while True: 
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

def run_flask_api():
    app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False)

if __name__ == "__main__":
    main()
