
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
                    "finger_id": user.uid,
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

    # Get Device UUID from DB if possible
    device_uuid = None
    try:
        dev_res = supabase.table('devices').select('id').eq('ip_address', ip).execute()
        if dev_res.data:
            device_uuid = dev_res.data[0]['id']
    except Exception as e:
        print(f"Device Lookup Error: {e}")

    zk = ZK(ip, port=port, timeout=10)
    conn = None
    inserted_count = 0

    try:
        print(f"Connecting to Device at {ip}...")
        conn = zk.connect()
        conn.disable_device()
        
        logs = conn.get_attendance()
        print(f"Found {len(logs)} logs on device.")

        # Fetch employees for mapping ZK ID to Supabase UUID (using shift view)
        employees_res = supabase.table('employee_shift_view').select("*").execute()
        zk_id_to_emp = {e['employee_id_code']: e for e in employees_res.data}

        # Fetch existing attendance for today to avoid duplicates and handle clock_out
        # We might need to fetch more than just today if we want to sync historical logs
        # For simplicity, let's fetch all attendance records that might be relevant
        # or just handle them one by one. Handling one by one is safer for large datasets
        # but slower. Let's optimize by grouping logs by date.
        
        inserted_count = 0
        updated_count = 0

        # Sort logs by timestamp to ensure we process them in order
        sorted_logs = sorted(logs, key=lambda x: x.timestamp)

        for log in sorted_logs:
            user_id_str = str(log.user_id)
            
            if user_id_str not in zk_id_to_emp:
                continue

            emp = zk_id_to_emp[user_id_str]
            emp_uuid = emp['id']
            log_date = log.timestamp.strftime("%Y-%m-%d")
            log_time_iso = log.timestamp.isoformat()
            
            # Check if record exists for this employee on this date
            check = supabase.table('attendance') \
                .select("*") \
                .eq("employee_id", emp_uuid) \
                .eq("date", log_date) \
                .execute()

            if not check.data:
                # === CLOCK IN ===
                check_in_time = log.timestamp.strftime("%H:%M:%S")
                status = 'PRESENT'
                notes = 'On Time'
                
                # Dynamic Thresholds
                late_time = emp.get('late_threshold', '08:00:00')
                absent_time = emp.get('absent_threshold', '09:00:00')

                if check_in_time >= absent_time:
                    status = 'LATE'
                    notes = 'Very Late (After Absent Threshold)'
                elif check_in_time >= late_time:
                    status = 'LATE'
                    notes = 'Late Arrival'

                new_attendance = {
                    "id": str(uuid.uuid4()),
                    "employee_id": emp['employee_id'],
                    "date": log_date,
                    "status": status,
                    "clock_in": log_time_iso,
                    "device_id": f"ZK Device ({ip})",
                    "device_uuid": device_uuid,
                    "notes": notes
                }
                try:
                    supabase.table('attendance').insert(new_attendance).execute()
                    inserted_count += 1
                    print(f"Clock In: {emp['name']} at {log.timestamp}")
                except Exception as e:
                    print(f"Error inserting log for {emp['name']}: {e}")
            else:
                # === CLOCK OUT (Update) ===
                record = check.data[0]
                record_id = record['id']
                
                # Update clock_out if this log is later than current clock_in
                # and later than current clock_out (if any)
                current_clock_in = record.get('clock_in')
                current_clock_out = record.get('clock_out')
                
                should_update = False
                if current_clock_in:
                    # Convert to comparable format if needed, but isoformat is usually fine for string comparison if same timezone
                    if log_time_iso > current_clock_in:
                        if not current_clock_out or log_time_iso > current_clock_out:
                            should_update = True
                
                if should_update:
                    try:
                        update_data = {
                            "clock_out": log_time_iso,
                            "device_id": f"ZK Device ({ip})",
                            "device_uuid": device_uuid
                        }
                        supabase.table('attendance').update(update_data).eq('id', record_id).execute()
                        updated_count += 1
                        print(f"Clock Out Updated: {emp['name']} at {log.timestamp}")
                    except Exception as e:
                        print(f"Error updating clock_out for {emp['name']}: {e}")

        conn.enable_device()
        return jsonify({
            "success": True, 
            "message": f"Processed {len(logs)} logs. Created {inserted_count} new, Updated {updated_count} clock-outs."
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
