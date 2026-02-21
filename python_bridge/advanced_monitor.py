
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

# --- PATH SETUP (CRITICAL FIX FOR EXE) ---
if getattr(sys, 'frozen', False):
    base_dir = Path(sys.executable).parent
else:
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

# --- FLASK API ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

supabase = None

def init_supabase():
    global supabase
    logging.info(f"📂 Loading config from: {env_path}")
    
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        if url and key:
            try:
                supabase = create_client(url, key)
                logging.info("✅ Supabase Connected Successfully")
                return True
            except Exception as e:
                logging.error(f"❌ Supabase Connection Error: {e}")
        else:
            logging.error("❌ SUPABASE_URL or KEY missing in .env")
    else:
        logging.error(f"❌ .env file NOT found at {env_path}")
    return False

# Global Cache & Locks
employee_cache = {}
active_devices = {}
active_zk_connections = {} 
device_locks = {}

@app.route('/')
def status_check():
    status = "online" if supabase else "database_error"
    return jsonify({
        "status": status, 
        "message": "SmartStock Service Running", 
        "env_path": str(env_path),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/logs')
def get_logs():
    return jsonify({"logs": list(log_buffer)})

@app.route('/trigger-absent', methods=['POST'])
def manual_absent_check():
    threading.Thread(target=run_auto_absent_check).start()
    return jsonify({"message": "Absent check started.", "status": "running"})

# --- NEW: SYNC ENDPOINTS (Matches app.py for UI Compatibility) ---
@app.route('/sync-users', methods=['POST'])
def api_sync_users():
    data = request.json or {}
    ip = data.get('ip')
    port = int(data.get('port', 4370))
    xarun_id = data.get('default_xarun_id')
    
    if not ip: return jsonify({"error": "IP required"}), 400
    
    # Run in background to not block
    threading.Thread(target=run_manual_user_sync, args=(ip, port, xarun_id)).start()
    return jsonify({"success": True, "message": "User sync started in background."})

@app.route('/sync-logs', methods=['POST'])
def api_sync_logs():
    data = request.json or {}
    ip = data.get('ip')
    port = int(data.get('port', 4370))
    
    if not ip: return jsonify({"error": "IP required"}), 400

    # Run in background
    threading.Thread(target=run_manual_log_sync, args=(ip, port)).start()
    return jsonify({"success": True, "message": "Log sync started in background."})

# --- MANUAL SYNC FUNCTIONS ---
def run_manual_user_sync(ip, port, xarun_id):
    logging.info(f"🔄 Manual User Sync Request for {ip}...")
    device_locks[ip] = True # Pause monitoring
    conn = None
    try:
        zk = ZK(ip, port=port, timeout=20, force_udp=False, ommit_ping=True)
        conn = zk.connect()
        conn.disable_device()
        sync_device_users(conn, {'xarun_id': xarun_id, 'name': 'Manual Sync', 'ip_address': ip})
        conn.enable_device()
        logging.info("✅ Manual User Sync Completed.")
    except Exception as e:
        logging.error(f"Manual Sync Error: {e}")
    finally:
        if conn: conn.disconnect()
        device_locks[ip] = False # Resume monitoring

def run_manual_log_sync(ip, port):
    logging.info(f"🔄 Manual Log Sync Request for {ip}...")
    device_locks[ip] = True
    conn = None
    try:
        zk = ZK(ip, port=port, timeout=20, force_udp=False, ommit_ping=True)
        conn = zk.connect()
        conn.disable_device()
        
        logs = conn.get_attendance()
        logging.info(f"📥 Downloaded {len(logs)} logs from device.")
        
        count = 0
        for log in logs:
            if push_attendance(log.user_id, log.timestamp, {'name': 'Manual Sync', 'ip_address': ip}):
                count += 1
        
        logging.info(f"✅ Manual Log Sync: Processed {len(logs)}, Inserted/Updated {count}.")
        conn.enable_device()
    except Exception as e:
        logging.error(f"Manual Log Sync Error: {e}")
    finally:
        if conn: conn.disconnect()
        device_locks[ip] = False

# --- ATTENDANCE LOGIC (SMART IN/OUT) ---
def push_attendance(user_id, timestamp, device_info):
    if not supabase: return False
    
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
            logging.info(f"🆕 Auto-registered new user: {zk_id}")
        except Exception as e:
            # Handle Race Condition / Duplicate Key
            if "23505" in str(e) or "duplicate key" in str(e):
                logging.warning(f"⚠️ User {zk_id} exists in DB but not in cache. Refreshing cache.")
                refresh_employee_cache()
            else:
                logging.error(f"❌ Failed to auto-register {zk_id}: {e}")
                return False

    emp = employee_cache.get(zk_id)
    if not emp: 
        logging.error(f"❌ Could not resolve employee {zk_id}")
        return False

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

            if 8 <= check_in_hour < 9: 
                status = 'LATE'
                notes = 'Late Arrival'
            elif check_in_hour >= 9: 
                status = 'LATE' 
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
            return True

        else:
            # === CLOCK OUT (Update Last Scan) ===
            record = existing.data[0]
            record_id = record['id']
            
            # Prevent rapid duplicate scans (debounce 2 mins)
            last_action_time = record.get('clock_out') or record.get('clock_in')
            if last_action_time:
                try:
                    last_dt = datetime.fromisoformat(last_action_time.replace('Z', '+00:00'))
                    # make timestamp aware if needed, or naive
                    ts_naive = timestamp.replace(tzinfo=None)
                    last_naive = last_dt.replace(tzinfo=None)
                    time_diff = (ts_naive - last_naive).total_seconds()
                    
                    if time_diff < 120: 
                        return False
                except: pass

            update_payload = {
                "clock_out": iso_time
            }
            
            supabase.table('attendance').update(update_payload).eq('id', record_id).execute()
            logging.info(f"👋 CLOCK OUT Updated: {emp['name']} at {timestamp.strftime('%H:%M')}")
            return True

    except Exception as e:
        logging.error(f"DB Error processing attendance: {e}")
        return False

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
    if not supabase: return
    try:
        logging.info(f"👤 Syncing users from {device_info.get('name')}...")
        device_users = conn.get_users()
        if not device_users: return

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
            
            if raw_id in existing_map:
                db_emp = existing_map[raw_id]
                # Update name if device has a name and DB has placeholder
                if raw_name and ("Staff" in db_emp['name'] or "Worker" in db_emp['name'] or not db_emp['name']):
                    try:
                        supabase.table('employees').update({"name": raw_name}).eq("id", db_emp['id']).execute()
                        updates_count += 1
                    except Exception as e:
                        logging.error(f"Error updating user {raw_id}: {e}")
            else:
                display_name = raw_name if raw_name else f"Staff {raw_id}"
                
                try:
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
                except Exception as e:
                    # Handle duplicate key if race condition occurred
                    if "23505" in str(e) or "duplicate key" in str(e):
                        logging.warning(f"⚠️ Skipping duplicate user insert for {raw_id}")
                    else:
                        logging.error(f"❌ Failed to insert user {raw_id}: {e}")
        
        if new_count > 0 or updates_count > 0:
            logging.info(f"✅ Sync: {new_count} New Users, {updates_count} Names Updated.")
            refresh_employee_cache()

    except Exception as e:
        logging.error(f"⚠️ User Sync Failed: {e}")

def run_auto_absent_check():
    if not supabase: return
    logging.info("⏰ Running Auto-Absent Check...")
    try:
        now = datetime.now()
        # 1. Check if today is Friday (4) - Skip if so
        if now.weekday() == 4: # Python weekday: Mon=0, Fri=4
             logging.info("📅 Today is Friday (Off Day). Skipping Absent Check.")
             return

        today_str = now.strftime("%Y-%m-%d")
        
        # 2. Get All Active Employees
        emps_res = supabase.table('employees').select("id, name").eq('status', 'ACTIVE').execute()
        all_emps = emps_res.data or []
        if not all_emps: return

        # 3. Get Today's Attendance
        att_res = supabase.table('attendance').select("employee_id").eq('date', today_str).execute()
        present_ids = {r['employee_id'] for r in att_res.data or []}
        
        # 4. Identify Missing
        absent_list = []
        for emp in all_emps:
            if emp['id'] not in present_ids:
                absent_list.append({
                    "id": str(uuid.uuid4()),
                    "employee_id": emp['id'],
                    "date": today_str,
                    "status": "ABSENT",
                    "notes": "Auto-marked at 9:00 AM",
                    "device_id": "SYSTEM-AUTO"
                })
        
        # 5. Bulk Insert
        if absent_list:
            supabase.table('attendance').insert(absent_list).execute()
            logging.info(f"✅ Marked {len(absent_list)} employees as ABSENT.")
        else:
            logging.info("✅ Everyone is present! No absences marked.")

    except Exception as e:
        logging.error(f"❌ Auto-Absent Check Failed: {e}")

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
                cutoff_date = datetime.now() - timedelta(days=7)
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
    if not supabase: 
        if not init_supabase(): return 

    try:
        res = supabase.table('devices').select("*").eq('is_active', True).execute()
        devices = res.data or []
        
        # If no devices in DB, default to config
        if not devices and not active_devices:
             devices = [{'name': 'Default', 'ip_address': '192.168.100.201', 'port': 4370, 'id': None, 'xarun_id': None}]

        for dev in devices:
            if dev['ip_address'] in active_devices: continue
            t = threading.Thread(target=monitor_single_device, args=(dev,), name=f"Thread-{dev['name']}")
            t.daemon = True
            t.start()
            active_devices[dev['ip_address']] = t
    except Exception as e:
        logging.error(f"Start Monitor Error: {e}")

def main():
    print("--- SMARTSTOCK SERVICE ---")
    
    # 1. DELAY FOR NETWORK (Important for Startup)
    logging.info("⏳ Starting Up... Waiting 20s for Network/Wi-Fi...")
    time.sleep(20)
    
    # 2. Init DB
    if init_supabase():
        refresh_employee_cache()
        start_monitors()
    else:
        logging.error("❌ Critical: Failed to connect to Database. Monitor will retry.")

    schedule.every(30).minutes.do(refresh_employee_cache)
    schedule.every().day.at("09:00").do(run_auto_absent_check)
    schedule.every(30).seconds.do(start_monitors)
    
    # Run API on port 5050 to match React App config
    threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False), daemon=True).start()

    while True: 
        schedule.run_pending()
        # Retry connection if failed initially
        if not supabase:
            init_supabase()
            if supabase: start_monitors()
        time.sleep(5)

if __name__ == "__main__":
    main()
