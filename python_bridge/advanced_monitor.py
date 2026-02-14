
import time
import sys
import os
import schedule
import threading
import uuid
import logging
from collections import deque
from datetime import datetime, time as dtime, timedelta
from pathlib import Path
from zk import ZK
from supabase import create_client, Client
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- PATH SETUP ---
# Ensure we use absolute paths relative to this script
base_dir = Path(__file__).resolve().parent
log_file_path = base_dir / "monitor_service.log"
env_path = base_dir / '.env'

# --- LOGGING SETUP (Robust for Windows/Docker/Background) ---
# In-memory log buffer for API access
log_buffer = deque(maxlen=50)

class ListHandler(logging.Handler):
    def emit(self, record):
        try:
            log_entry = self.format(record)
            log_buffer.appendleft(log_entry)
        except:
            pass

# Default to file logging + memory logging
handlers = [
    logging.FileHandler(str(log_file_path), encoding='utf-8', mode='a'),
    ListHandler()
]

# Only add console handler if stdout is available (avoids crashes in .pyw/.vbs)
if sys.stdout:
    try:
        if sys.platform.startswith('win'):
            # Attempt to fix Windows console encoding if attached
            try:
                import io
                if hasattr(sys.stdout, 'buffer'):
                    sys.stdout.reconfigure(encoding='utf-8')
                else:
                    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            except:
                pass 
        handlers.append(logging.StreamHandler(sys.stdout))
    except Exception:
        pass # Silently ignore console setup errors in background mode

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=handlers
)

logging.info(f"🚀 Service Initializing... Dir: {base_dir}")

# Load Env
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logging.info("✅ Loaded .env file")
else:
    logging.error("❌ .env file NOT found!")

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ Error: SUPABASE credentials missing.")
    # We don't exit immediately to keep the flask server alive for logs
    
# Initialize Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logging.info("✅ Supabase Client Initialized")
except Exception as e:
    logging.error(f"❌ Supabase Init Error: {e}")
    supabase = None

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

@app.route('/')
def status_check():
    return jsonify({"status": "online", "message": "Background Service is Running", "timestamp": datetime.now().isoformat()})

@app.route('/logs')
def get_logs():
    return jsonify({"logs": list(log_buffer)})

@app.route('/trigger-absent', methods=['POST'])
def manual_absent_check():
    logging.info("🔧 Manual Trigger: Running Auto-Absent Check...")
    threading.Thread(target=run_auto_absent_check).start()
    return jsonify({"message": "Absent check started in background.", "status": "running"})

# --- AUTO ABSENT CHECK (9:00 AM) ---
def run_auto_absent_check():
    if not supabase: return
    logging.info("⏰ Running Auto-Absent Check Logic...")
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
                    "clock_in": None,
                    "notes": "Auto-Absent: No show by cutoff time"
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
    if not supabase: return
    
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
                status = 'ABSENT' 
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
            
            # Debounce logic
            last_action_time = record.get('overtime_out') or record.get('overtime_in') or record.get('clock_out') or record.get('clock_in')

            if last_action_time:
                try:
                    last_dt = datetime.fromisoformat(last_action_time.replace('Z', '+00:00'))
                    time_diff = (timestamp - last_dt.replace(tzinfo=None)).total_seconds()
                    if time_diff < 60: 
                        return
                except: pass

            update_payload = {}
            action_type = ""

            if record.get('clock_in') is None:
                update_payload = {
                    "clock_in": iso_time,
                    "device_id": f"{dev_name} ({ip_addr})",
                    "notes": "Arrived after 9am (Auto-Absent Applied)"
                }
                action_type = "LATE ARRIVAL (Status: ABSENT)"
                
            elif not record.get('clock_out'):
                update_payload = {"clock_out": iso_time}
                action_type = "CHECK OUT"
            elif not record.get('overtime_in'):
                update_payload = {"overtime_in": iso_time}
                action_type = "OVERTIME IN"
            elif not record.get('overtime_out'):
                update_payload = {"overtime_out": iso_time}
                action_type = "OVERTIME OUT"
            else:
                return

            if update_payload:
                supabase.table('attendance').update(update_payload).eq('id', record_id).execute()
                logging.info(f"✅ {action_type}: {emp['name']}")

    except Exception as e:
        logging.error(f"DB Error processing attendance: {e}")

def refresh_employee_cache():
    if not supabase: return
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
            
            logging.info(f"📥 Syncing offline logs for {dev_name}...")
            try:
                logs = conn.get_attendance()
                today_str = datetime.now().strftime("%Y-%m-%d")
                sync_count = 0
                for log in logs:
                    if log.timestamp.strftime("%Y-%m-%d") == today_str:
                        push_attendance(log.user_id, log.timestamp, device)
                        sync_count += 1
                logging.info(f"✅ Sync complete. {sync_count} logs processed.")
            except Exception as e:
                logging.error(f"⚠️ Offline Sync Warning: {e}")

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
    if not supabase: return
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
    print("------------------------------------------------")
    logging.info("Service Started.")
    
    refresh_employee_cache()
    
    schedule.every(30).minutes.do(refresh_employee_cache)
    schedule.every().day.at("09:00").do(run_auto_absent_check)
    
    if datetime.now().hour >= 9:
        logging.info("Startup Check: It's past 9:00 AM. Running immediate Auto-Absent check...")
        threading.Thread(target=run_auto_absent_check).start()

    threading.Thread(target=run_flask_api, daemon=True, name="FlaskAPI").start()
    start_monitors()

    try:
        while True: 
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

def run_flask_api():
    try:
        app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False)
    except Exception as e:
        logging.critical(f"🔥 Flask API FAILED to start: {e}")

if __name__ == "__main__":
    main()
