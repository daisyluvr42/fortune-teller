
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Add backend to sys.path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root / "backend"))

# Load environment variables
load_dotenv(project_root / ".env")

def upgrade_user(email: str, months: int = 12):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
        return

    supabase = create_client(url, key)
    
    print(f"Searching for user: {email}...")
    
    # Try to find user by email using list_users (pagination might be needed if many users)
    # Supabase Gotrue admin api list_users
    try:
        # Note: list_users returns a UserListing object or similar depending on version
        # We might need to iterate if we don't have a direct email filter in the python sdk version being used.
        # However, there isn't a direct "get_user_by_email" in admin typically, only list or get by id.
        # But let's try getting all and filtering.
        
        # New supabase-py might support admin.list_users()
        users_response = supabase.auth.admin.list_users()
        users = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])
        
        target_user = None
        for user in users:
            if user.email == email:
                target_user = user
                break
        
        if not target_user:
            print(f"Error: User with email {email} not found.")
            return

        user_id = target_user.id
        print(f"Found user_id: {user_id}")
        
        # Now use MembershipService
        from membership_service import MembershipService
        
        # We need to ensure MembershipService uses the same env or we manually init it
        # The class loads its own env, but we already loaded it.
        service = MembershipService()
        
        print(f"Upgrading user to VIP for {months} months...")
        result = service.upgrade_to_vip(user_id, months=months)
        
        print("Success! New Member Status:")
        print(f"Type: {result.membership_type}")
        print(f"Expires: {result.expires_at}")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upgrade user to VIP")
    parser.add_argument("email", help="User email")
    parser.add_argument("--months", type=int, default=12, help="Number of months")
    
    args = parser.parse_args()
    upgrade_user(args.email, args.months)
