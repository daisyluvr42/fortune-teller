import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

# Load .env
project_root = Path(__file__).parent.parent
load_dotenv(project_root / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def migrate_compatibility_quota():
    print("Starting migration for compatibility quota...")
    
    # Update quota configuration for existing users
    # We want to change 'compatibility' feature to be daily cycle with limit 2
    # This affects rows where feature_key = 'compatibility'
    
    try:
        # 1. Update existing records
        # Set cycle_type = 'daily' and cycle_limit = 2
        # Also reset cycle_used to 0 to give them a fresh start with the new daily quota
        response = client.table("user_quotas").update({
            "cycle_type": "daily",
            "cycle_limit": 2,
            "cycle_used": 0,  # Reset usage so they get full 2 credits immediately
            "last_reset_date": "now()"
        }).eq("feature_key", "compatibility").execute()
        
        print(f"Migration completed successfully.")
        # Note: supabase-py update response format might vary, but if no exception, it worked.
        
        # 2. Verify
        verify = client.table("user_quotas").select("count").eq("feature_key", "compatibility").eq("cycle_type", "daily").execute()
        count = verify.count if verify.count is not None else len(verify.data)
        print(f"Verified: {count} user records now have daily cycle for compatibility.")

    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate_compatibility_quota()
