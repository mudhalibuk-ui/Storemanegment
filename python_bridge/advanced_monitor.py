
import time
import sys
import os
import schedule
import threading
import uuid
import logging
from datetime import datetime, time as dtime
from pathlib import Path
from zk import ZK
from supabase import create_client, Client
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATION ---
LOG_FILE = "monitor_service.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(threadName)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
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

# --- SYNC ALL DATA: DEVICE -> DATABASE ---
@app.route('/sync-users', methods=['POST'])
def sync_device_data():
    """
    1. Connect to Device.
    2. Fetch USERS -> Save to DB.
    3. Fetch ATTENDANCE -> Save to DB.
    """
    data = request.json or {}
    ip = data.get('ip', '192.168.100.201')
    port = int(data.get('port', 4370))
    requested_xarun = data.get('default_xarun_id', 'x1')
    valid_xarun_id = ensure_valid_xarun(requested_xarun)

    logging.info(f"🔄 Starting Full Sync (Users + Logs) for {ip}...")

    # Lock Device
    device_locks[ip] = True
    if ip in active_zk_connections:
        try: active_zk_connections[ip].disconnect()
        except: pass
        time.sleep(1)

    zk = ZK(ip, port=port, timeout=30)
    conn = None
    
    stats = { "new_users": 0, "updated_users": 0, "new_logs": 0 }

    try:
        conn = zk.connect()
        conn.disable_device()
        
        # ==========================================
        # STEP 1: SYNC USERS
        # ==========================================
        device_users = conn.get_users()
        logging.info(f"👤 Found {len(device_users)} users on device.")

        # Get DB Map
        db_emps = supabase.table('employees').select("id, employee_id_code, name").execute()
        db_map = {e['employee_id_code']: e for e in db_emps.data}
        zk_id_to_uuid = {} # Map ZK ID to DB UUID for attendance

        for user in device_users:
            zk_id = str(user.user_id)
            zk_name = user.name.strip() if user.name else f"Staff {zk_id}"
            
            if zk_id not in db_map:
                # INSERT
                new_uuid = str(uuid.uuid4())
                new_emp_payload = {
                    "id": new_uuid,
                    "name": zk_name,
                    "employee_id_code": zk_id,
                    "position": "STAFF",
                    "status": "ACTIVE",
                    "joined_date": datetime.now().strftime("%Y-%m-%d"),
                    "xarun_id": valid_xarun_id,
                    "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={zk_id}",
                    "salary": 0
                }
                supabase.table('employees').insert(new_emp_payload).execute()
                stats['new_users'] += 1
                zk_id_to_uuid[zk_id] = new_uuid
            else:
                # UPDATE
                existing = db_map[zk_id]
                zk_id_to_uuid[zk_id] = existing['id']
                if user.name and existing['name'] != zk_name:
                    supabase.table('employees').update({"name": zk_name}).eq('id', existing['id']).execute()
                    stats['updated_users'] += 1

        # ==========================================
        # STEP 2: SYNC ATTENDANCE LOGS
        # ==========================================
        logging.info("📝 Fetching Attendance Logs...")
        logs = conn.get_attendance()
        logging.info(f"📥 Found {len(logs)} total logs.")

        # Batch process logs to avoid timeouts
        # For simplicity, we check duplicates one by one or fetch recent ones
        # optimization: Fetch recent DB logs to memory to reduce API calls
        
        for log in logs:
            user_id_str = str(log.user_id)
            if user_id_str not in zk_id_to_uuid:
                continue # Skip unknown users (shouldn't happen as we just synced users)

            emp_uuid = zk_id_to_uuid[user_id_str]
            log_date = log.timestamp.strftime("%Y-%m-%d")
            log_time = log.timestamp.isoformat()

            # Determine Status
            # Need to get shift info from cache or default
            # For bulk sync, we default to 'PRESENT' or check time logic
            status = "PRESENT"
            if log.timestamp.hour >= 8: # Simple rule: After 8am is Late
                status = "LATE"

            # Check Duplicate in DB (Composite check: Employee + Exact Time)
            # This is slow but safe. 
            exists = supabase.table('attendance').select('id').eq('employee_id', emp_uuid).eq('clock_in', log_time).execute()
            
            if not exists.data:
                # Insert
                new_record = {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_uuid,
                    "date": log_date,
                    "status": status,
                    "clock_in": log_time,
                    "device_id": f"Device {ip}",
                    "notes": "Bulk Sync"
                }
                supabase.table('attendance').insert(new_record).execute()
                stats['new_logs'] += 1

        conn.enable_device()
        refresh_employee_cache()
        
        msg = f"Sync Complete!\nUsers: +{stats['new_users']} New, {stats['updated_users']} Updated.\nLogs: +{stats['new_logs']} Records added to Database."
        logging.info(msg)
        
        return jsonify({ "success": True, "message": msg })

    except Exception as e:
        logging.error(f"❌ Sync Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            try: conn.disconnect()
            except: pass
        device_locks[ip] = False

# --- ATTENDANCE MONITOR (REAL TIME) ---
def push_attendance(user_id, timestamp, device_info):
    """
    Real-time: Finger Scan -> Database
    """
    zk_id = str(user_id)
    if zk_id not in employee_cache:
        refresh_employee_cache()
    
    if zk_id not in employee_cache:
        # Auto Create user if missing
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

    check_in_time = timestamp.time()
    date_str = timestamp.strftime("%Y-%m-%d")
    status = 'PRESENT'
    notes = 'On Time'
    
    if check_in_time > emp['shift']['late']:
        status = 'LATE'
        notes = 'Late Arrival'

    try:
        # Check duplicate for THIS DAY (Realtime logic usually allows 1 check-in per day or per shift)
        check = supabase.table('attendance').select("id").eq("employee_id", emp['uuid']).eq("date", date_str).execute()
        if not check.data:
            data = {
                "id": str(uuid.uuid4()),
                "employee_id": emp['uuid'],
                "date": date_str,
                "status": status,
                "clock_in": timestamp.isoformat(),
                "device_id": f"{device_info['name']} ({device_info['ip']})",
                "notes": f"Auto: {notes}"
            }
            supabase.table('attendance').insert(data).execute()
            logging.info(f"✅ REALTIME SAVED: {emp['name']}")
    except Exception as e:
        logging.error(f"DB Error: {e}")

def refresh_employee_cache():
    global employee_cache
    try:
        response = supabase.table('employee_shift_view').select("*").execute()
        new_cache = {}
        for row in response.data:
            key_code = str(row.get('employee_id_code'))
            def parse_time(t_str, default):
                try: return datetime.strptime(t_str, "%H:%M:%S").time()
                except: return default
            data = {
                'uuid': row['employee_id'],
                'name': row['name'],
                'shift': {
                    'late': parse_time(row.get('late_threshold'), dtime(8,0)),
                }
            }
            new_cache[key_code] = data
        employee_cache = new_cache
    except Exception as e:
        logging.error(f"Cache Error: {e}")

def monitor_single_device(device):
    ip = device['ip_address']
    port = device.get('port', 4370)
    zk = ZK(ip, port=port, timeout=10, force_udp=False, ommit_ping=False)
    
    while True:
        if device_locks.get(ip, False):
            time.sleep(2)
            continue

        conn = None
        try:
            conn = zk.connect()
            active_zk_connections[ip] = conn
            logging.info(f"✅ Connected to {ip}")
            
            for event in conn.live_capture():
                if device_locks.get(ip, False): break
                if event and event.user_id:
                    threading.Thread(target=push_attendance, args=(event.user_id, event.timestamp, device)).start()
        except Exception as e:
            logging.error(f"Connection lost {ip}: {e}")
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
             devices = [{'name': 'Default', 'ip_address': '192.168.100.201', 'port': 4370, 'id': None, 'xarun_id': None}]

        for dev in devices:
            if dev['ip_address'] in active_devices: continue
            t = threading.Thread(target=monitor_single_device, args=(dev,), name=f"Thread-{dev['ip_address']}")
            t.daemon = True
            t.start()
            active_devices[dev['ip_address']] = t
            
    except Exception as e:
        logging.error(f"Failed to fetch devices: {e}")

def main():
    print("SMARTSTOCK PRO - UNIFIED SERVICE")
    logging.info("Service Started on Port 5050")
    
    refresh_employee_cache()
    schedule.every(30).minutes.do(refresh_employee_cache)
    threading.Thread(target=run_flask_api, daemon=True).start()
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
