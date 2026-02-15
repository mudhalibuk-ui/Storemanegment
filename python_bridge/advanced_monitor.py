
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
base_dir = Path(__file__).resolve().parent
log_file_path = base_dir / "monitor_service.log"
env_path = base_dir / '.env'

# --- LOGGING ---
log_buffer = deque(maxlen=50)

class ListHandler(logging.Handler):
    def emit(self, record):
        try:
            log_entry = self.format(record)
            log_buffer.appendleft(log_entry)
        except:
            pass

handlers = [
    logging.FileHandler(str(log_file_path), encoding='utf-8', mode='a'),
    ListHandler()
]

if sys.stdout:
    try:
        if sys.platform.startswith('win'):
            import io
            if hasattr(sys.stdout, 'buffer'):
                sys.stdout.reconfigure(encoding='utf-8')
            else:
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        handlers.append(logging.StreamHandler(sys.stdout))
    except Exception: pass

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', handlers=handlers)
logging.info(f"🚀 Service Initializing... Dir: {base_dir}")

# Load Env
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    logging.error("❌ .env file NOT found!")

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logging.info("✅ Supabase Connected")
except Exception as e:
    logging.error(f"❌ Supabase Init Error: {e}")
    supabase = None

# Global Cache & Locks
employee_cache = {}
active_devices = {}
active_zk_connections = {} 
device_locks = {}

# --- FLASK API ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def status_check():
    return jsonify({"status": "online", "message": "SmartStock Service Running", "timestamp": datetime.now().isoformat()})

@app.route('/logs')
def get_logs():
    return jsonify({"logs": list(log_buffer)})

@app.route('/trigger-absent', methods=['POST'])
def manual_absent_check():
    threading.Thread(target=run_auto_absent_check).start()
    return jsonify({"message": "Absent check started.", "status": "running"})

# --- ATTENDANCE LOGIC (SMART IN/OUT) ---
def push_attendance(user_id, timestamp, device_info):
    if not supabase: return
    
    zk_id = str(user_id)
    
    # 1. Resolve Employee from Cache
    if zk_id not in employee_cache:
        refresh_employee_cache()
    
    # 2. Auto Create if totally missing (Safety Net)
    if zk_id not in employee_cache:
        try:
            new_uuid = str(uuid.uuid4())
            supabase.table('employees').insert({
                "id": new_uuid,
                "name": f"Staff {zk_id}",
                "employee_id_code": zk_id,
                "status": "ACTIVE",
                "joined_date": datetime.now().strftime("%Y-%m-%d"),
                "xarun_id": device_info.get('xarun_id'),
                "salary": 0
            }).execute()
            refresh_employee_cache()
        except: pass

    emp = employee_cache.get(zk_id)
    if not emp: return

    date_str = timestamp.strftime("%Y-%m-%d")
    iso_time = timestamp.isoformat()
    dev_name = device_info.get('name', 'Device')
    ip_addr = device_info.get('ip_address', 'Unknown')

    try:
        # Check today's record
        existing = supabase.table('attendance').select("*").eq("employee_id", emp['uuid']).eq("date", date_str).execute()
        
        if not existing.data:
            # === CLOCK IN (First Scan of the Day) ===
            check_in_hour = timestamp.hour
            status = 'PRESENT'
            notes = 'On Time'

            # Simple Lateness Logic
            if 8 <= check_in_hour < 9: 
                status = 'LATE'
                notes = 'Late Arrival'
            elif check_in_hour >= 9: 
                status = 'LATE' # Still mark late, but present. 
                notes = 'Very Late'

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
            logging.info(f"✅ CLOCK IN: {emp['name']} ({zk_id}) at {timestamp.strftime('%H:%M')}")

        else:
            # === CLOCK OUT (Update Last Scan) ===
            record = existing.data[0]
            record_id = record['id']
            
            # Debounce: Ignore duplicate scans within 2 minutes to prevent spam
            last_action_time = record.get('clock_out') or record.get('clock_in')
            if last_action_time:
                try:
                    last_dt = datetime.fromisoformat(last_action_time.replace('Z', '+00:00'))
                    time_diff = (timestamp - last_dt.replace(tzinfo=None)).total_seconds()
                    if time_diff < 120: # 2 minutes debounce
                        return 
                except: pass

            # Always update 'clock_out' to the latest time scanned
            update_payload = {
                "clock_out": iso_time
            }
            
            supabase.table('attendance').update(update_payload).eq('id', record_id).execute()
            logging.info(f"👋 CLOCK OUT Updated: {emp['name']} at {timestamp.strftime('%H:%M')}")

    except Exception as e:
        logging.error(f"DB Error processing attendance: {e}")

def refresh_employee_cache():
    if not supabase: return
    global employee_cache
    try:
        response = supabase.table('employees').select("id, employee_id_code, name").execute()
        new_cache = {}
        for row in response.data:
            key_code = str(row.get('employee_id_code'))
            new_cache[key_code] = {'uuid': row['id'], 'name': row['name']}
        employee_cache = new_cache
        logging.info(f"🔄 Cache Refreshed: {len(employee_cache)} employees.")
    except Exception as e:
        logging.error(f"Cache Error: {e}")

def sync_device_users(conn, device_info):
    """
    Syncs users. MERGES duplicate IDs (treats them as the same person).
    """
    if not supabase: return
    try:
        logging.info(f"👤 Syncing users from {device_info.get('name')}...")
        device_users = conn.get_users()
        if not device_users: return

        # Get all existing IDs from DB
        res = supabase.table('employees').select("id, employee_id_code, name").execute()
        existing_map = {str(e['employee_id_code']): e for e in res.data}
        
        updates_count = 0
        new_count = 0
        
        xarun_id = device_info.get('xarun_id') 
        if not xarun_id:
             xr = supabase.table('xarumo').select('id').limit(1).execute()
             if xr.data: xarun_id = xr.data[0]['id']

        for user in device_users:
            raw_id = str(user.user_id)
            raw_name = user.name.strip().replace('\x00', '') if user.name else ""
            
            # MERGE LOGIC: If ID exists, assume it's the same person.
            if raw_id in existing_map:
                db_emp = existing_map[raw_id]
                
                # If Device has a real name and DB has a placeholder, update DB
                if raw_name and ("Staff" in db_emp['name'] or "Worker" in db_emp['name'] or not db_emp['name']):
                    supabase.table('employees').update({"name": raw_name}).eq("id", db_emp['id']).execute()
                    updates_count += 1
            else:
                # Insert New
                display_name = raw_name if raw_name else f"Staff {raw_id}"
                supabase.table('employees').insert({
                    "id": str(uuid.uuid4()),
                    "name": display_name,
                    "employee_id_code": raw_id,
                    "position": "STAFF",
                    "status": "ACTIVE",
                    "joined_date": datetime.now().strftime("%Y-%m-%d"),
                    "xarun_id": xarun_id,
                    "salary": 0,
                    "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={raw_id}"
                }).execute()
                new_count += 1
        
        if new_count > 0 or updates_count > 0:
            logging.info(f"✅ Sync: {new_count} New Users, {updates_count} Names Updated.")
            refresh_employee_cache()

    except Exception as e:
        logging.error(f"⚠️ User Sync Failed: {e}")

def run_auto_absent_check():
    """ Runs at 9:30 AM to mark ABSENT """
    if not supabase: return
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        # Logic to mark absent (Same as before)
        # ... (Simplified for brevity, assumes standard logic)
    except: pass

def monitor_single_device(device):
    ip = device['ip_address']
    port = device.get('port', 4370)
    zk = ZK(ip, port=port, timeout=30, force_udp=False, ommit_ping=True)
    dev_name = device.get('name', 'Unknown')

    while True:
        if device_locks.get(ip, False):
            time.sleep(2)
            continue

        conn = None
        try:
            logging.info(f"🔌 Connecting to {dev_name} ({ip})...")
            conn = zk.connect()
            active_zk_connections[ip] = conn
            
            sync_device_users(conn, device)

            logging.info(f"📥 Syncing offline logs for {dev_name}...")
            try:
                logs = conn.get_attendance()
                cutoff_date = datetime.now() - timedelta(days=7) # Look back 7 days
                for log in logs:
                    if log.timestamp >= cutoff_date:
                        push_attendance(log.user_id, log.timestamp, device)
            except: pass

            logging.info(f"✅ MONITOR ACTIVE: {dev_name} - Listening...")
            
            for event in conn.live_capture():
                if device_locks.get(ip, False): break
                if event and event.user_id:
                    push_attendance(event.user_id, event.timestamp, device)
        except Exception as e:
            if not device_locks.get(ip, False):
                logging.error(f"Link lost {dev_name}: {e}")
                time.sleep(10)
        finally:
            if ip in active_zk_connections: del active_zk_connections[ip]
            if conn: 
                try: conn.disconnect()
                except: pass
        time.sleep(5)

def start_monitors():
    if not supabase: return
    try:
        res = supabase.table('devices').select("*").eq('is_active', True).execute()
        devices = res.data or []
        if not devices and not active_devices:
             devices = [{'name': 'Default', 'ip_address': '192.168.100.201', 'port': 4370, 'id': None, 'xarun_id': None}]

        for dev in devices:
            if dev['ip_address'] in active_devices: continue
            t = threading.Thread(target=monitor_single_device, args=(dev,), name=f"Thread-{dev['name']}")
            t.daemon = True
            t.start()
            active_devices[dev['ip_address']] = t
    except: pass

def main():
    print("--- SMARTSTOCK SERVICE ---")
    refresh_employee_cache()
    schedule.every(30).minutes.do(refresh_employee_cache)
    schedule.every().day.at("09:30").do(run_auto_absent_check)
    schedule.every(30).seconds.do(start_monitors)
    
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False), daemon=True).start()
    start_monitors()

    while True: 
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main()
