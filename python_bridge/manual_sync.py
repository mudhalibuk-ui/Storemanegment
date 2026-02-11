
from zk import ZK
from supabase import create_client
import uuid
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
ZK_IP = '192.168.100.201'  # IP-ga ZKTeco
ZK_PORT = 4370

SUPABASE_URL = 'https://htmrapyxzfhvooxqacjd.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bXJhcHl4emZodm9veHFhY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTM0MDgsImV4cCI6MjA4NTA4OTQwOH0.7KgdCG_bR6Q5j5GhWYCezFmElHwjmPY9JKlV3n0oOdM'

def get_valid_xarun_id(supabase):
    """
    Ensures a valid Xarun ID exists in the database to prevent Foreign Key errors.
    """
    try:
        # 1. Check if any Xarun exists
        res = supabase.table('xarumo').select('id').limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]['id']
        
        # 2. If empty, create a default one
        print("⚠️ No Xarun found in DB. Creating default 'Main HQ'...")
        default_id = "x1"
        supabase.table('xarumo').insert({
            "id": default_id, 
            "name": "Main Headquarters", 
            "location": "Main Office"
        }).execute()
        print(f"✅ Created default Xarun: {default_id}")
        return default_id
    except Exception as e:
        print(f"❌ Error validating Xarun: {e}")
        return None

def sync_users_from_device():
    print(f"🔌 Connecting to ZK Device at {ZK_IP}...")
    zk = ZK(ZK_IP, port=ZK_PORT, timeout=10)
    conn = None
    
    try:
        conn = zk.connect()
        conn.disable_device() # Disable device while reading to prevent interference
        
        # 1. Soo aqri dhammaan shaqaalaha ku jira aaladda
        device_users = conn.get_users()
        print(f"✅ Connected! Found {len(device_users)} users on device.")
        
        # 2. Connect to Database
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 3. Get Valid Xarun ID (Fixes Foreign Key Error)
        valid_xarun_id = get_valid_xarun_id(supabase)
        
        count_new = 0
        count_updated = 0
        
        for user in device_users:
            user_id = str(user.user_id) # ID-ga (e.g. "23")
            name = user.name.strip() if user.name else f"Worker {user_id}"
            
            # Hubi haddii shaqaalahan uu horey u jiray
            res = supabase.table('employees').select("*").eq('employee_id_code', user_id).execute()
            
            if not res.data:
                # HADDII UUSAN JIRIN: Abuur mid cusub
                new_emp = {
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "employee_id_code": user_id,
                    "position": "STAFF",
                    "status": "ACTIVE",
                    "joined_date": datetime.now().strftime("%Y-%m-%d"),
                    "xarun_id": valid_xarun_id, # Uses valid ID now
                    "salary": 0,
                    "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}"
                }
                supabase.table('employees').insert(new_emp).execute()
                print(f"🆕 Inserted: {name} (ID: {user_id})")
                count_new += 1
            else:
                # HADDII UU JIRO: Cusbooneysii magaca haddii uu is bedelay
                existing_emp = res.data[0]
                if existing_emp['name'] != name and user.name: # Only update if ZK has a real name
                    supabase.table('employees').update({"name": name}).eq('id', existing_emp['id']).execute()
                    print(f"🔄 Updated Name: {existing_emp['name']} -> {name}")
                    count_updated += 1
        
        print("-" * 30)
        print(f"🎉 SYNC COMPLETED!")
        print(f"   - New Users Added: {count_new}")
        print(f"   - Names Updated:   {count_updated}")
        print("-" * 30)

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()
            print("🔌 Disconnected.")

if __name__ == "__main__":
    sync_users_from_device()
