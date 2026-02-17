
from flask import Flask, request, jsonify
from flask_cors import CORS
from zk import ZK
from supabase import create_client, Client
import os
import uuid
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
# Default ZKTeco IP
DEFAULT_ZK_IP = '192.168.100.201' 
DEFAULT_ZK_PORT = 4370

# Supabase Credentials
SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM'

# ==========================================
# SETUP
# ==========================================
app = Flask(__name__)
CORS(app) 

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("------------------------------------------------")
print("   SMARTSTOCK PRO - ZKTECO BRIDGE (API)")
print("   Running on http://localhost:5000")
print("------------------------------------------------")

def ensure_valid_xarun(target_id):
    """Checks if target_id exists, if not returns the first available or creates a default."""
    try:
        # Check if the requested ID exists
        if target_id:
            res = supabase.table('xarumo').select('id').eq('id', target_id).execute()
            if res.data:
                return target_id
        
        # If not, get any existing
        res = supabase.table('xarumo').select('id').limit(1).execute()
        if res.data:
            return res.data[0]['id']
            
        # Create default
        print("Creating default Xarun 'x1'...")
        supabase.table('xarumo').insert({"id": "x1", "name": "Main HQ", "location": "Default"}).execute()
        return "x1"
    except Exception as e:
        print(f"Xarun Validation Error: {e}")
        return None

@app.route('/')
def home():
    return jsonify({"status": "running", "service": "SmartStock ZK Bridge"})

@app.route('/sync-users', methods=['POST'])
def sync_users():
    """Reads users from ZK Device and puts them into Supabase 'employees' table"""
    data = request.json or {}
    ip = data.get('ip', DEFAULT_ZK_IP)
    port = int(data.get('port', DEFAULT_ZK_PORT))
    requested_xarun = data.get('default_xarun_id', 'x1')

    # Validate Xarun ID to prevent Foreign Key Error
    valid_xarun_id = ensure_valid_xarun(requested_xarun)

    zk = ZK(ip, port=port, timeout=10)
    conn = None
    new_count = 0
    updated_count = 0

    try:
        print(f"Connecting to Device at {ip}...")
        conn = zk.connect()
        conn.disable_device() 
        
        # 1. Get Users from Device
        device_users = conn.get_users()
        print(f"Found {len(device_users)} users on device.")

        # 2. Get Existing Employees from Supabase (Fetch all for mapping)
        # Note: Large tables might need pagination, but for < 1000 this works
        existing_emps_res = supabase.table('employees').select("id, employee_id_code, name").execute()
        existing_map = {e['employee_id_code']: e for e in existing_emps_res.data}

        # 3. Sync
        for user in device_users:
            user_id_str = str(user.user_id)
            device_name = user.name.strip() if user.name else f"Worker {user_id_str}"

            if user_id_str not in existing_map:
                # INSERT NEW
                new_emp = {
                    "id": str(uuid.uuid4()),
                    "name": device_name,
                    "employee_id_code": user_id_str,
                    "position": "STAFF",
                    "status": "ACTIVE",
                    "joined_date": datetime.now().strftime("%Y-%m-%d"),
                    "xarun_id": valid_xarun_id,
                    "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id_str}",
                    "salary": 0
                }
                try:
                    supabase.table('employees').insert(new_emp).execute()
                    new_count += 1
                    print(f"Inserted: {device_name}")
                except Exception as e:
                    if "23505" in str(e) or "duplicate key" in str(e):
                        print(f"Skipping duplicate ID {user_id_str} (Race Condition)")
                    else:
                        print(f"Insert Error for {user_id_str}: {e}")
            else:
                # UPDATE EXISTING if name changed
                current_db_emp = existing_map[user_id_str]
                if user.name and current_db_emp['name'] != device_name:
                    supabase.table('employees').update({"name": device_name}).eq('id', current_db_emp['id']).execute()
                    updated_count += 1
                    print(f"Updated Name: {current_db_emp['name']} -> {device_name}")

        conn.enable_device()
        return jsonify({
            "success": True, 
            "message": f"Sync Complete! Added {new_count} new, Updated {updated_count} names."
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.disconnect()

@app.route('/sync-logs', methods=['POST'])
def sync_logs():
    """Reads attendance logs from ZK Device and puts them into Supabase 'attendance' table"""
    data = request.json or {}
    ip = data.get('ip', DEFAULT_ZK_IP)
    port = int(data.get('port', DEFAULT_ZK_PORT))

    zk = ZK(ip, port=port, timeout=10)
    conn = None
    inserted_count = 0

    try:
        print(f"Connecting to Device at {ip}...")
        conn = zk.connect()
        conn.disable_device()
        
        logs = conn.get_attendance()
        print(f"Found {len(logs)} logs on device.")

        employees = supabase.table('employees').select("id, employee_id_code").execute()
        zk_id_to_uuid = {e['employee_id_code']: e['id'] for e in employees.data}

        for log in logs:
            user_id_str = str(log.user_id)
            
            if user_id_str not in zk_id_to_uuid:
                continue

            emp_uuid = zk_id_to_uuid[user_id_str]
            log_date = log.timestamp.strftime("%Y-%m-%d")
            
            check = supabase.table('attendance') \
                .select("id") \
                .eq("employee_id", emp_uuid) \
                .eq("date", log_date) \
                .execute()

            if not check.data:
                new_attendance = {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp_uuid,
                    "date": log_date,
                    "status": "PRESENT",
                    "clock_in": log.timestamp.isoformat(),
                    "notes": "Auto-Synced from Device"
                }
                supabase.table('attendance').insert(new_attendance).execute()
                inserted_count += 1

        conn.enable_device()
        return jsonify({
            "success": True, 
            "message": f"Processed {len(logs)} logs. Created {inserted_count} new attendance records."
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.disconnect()

@app.route('/zk/status', methods=['GET'])
def zk_status():
    ip = request.args.get('ip', DEFAULT_ZK_IP)
    port = int(request.args.get('port', DEFAULT_ZK_PORT))
    zk = ZK(ip, port=port, timeout=5)
    try:
        conn = zk.connect()
        conn.disconnect()
        return jsonify({"connected": True, "ip": ip})
    except Exception:
        return jsonify({"connected": False, "ip": ip})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
