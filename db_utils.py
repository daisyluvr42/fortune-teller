"""
Database utilities for Bazi Profile Management.
Uses Supabase to persist user profiles and session data with strict verification.
"""
import os
import streamlit as st
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase Client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    # Fail fast if credentials are missing, but allow import for safe checks
    print("WARNING: Supabase credentials not found in environment variables.")
    supabase: Optional[Client] = None
else:
    try:
        supabase: Client = create_client(url, key)
    except Exception as e:
        print(f"ERROR: Failed to initialize Supabase client: {e}")
        supabase = None


# China Standard Time offset (UTC+8)
CST_OFFSET_HOURS = 8

def get_cst_today() -> str:
    """Get current date in China Standard Time (UTC+8) as YYYY-MM-DD string."""
    utc_now = datetime.utcnow()
    cst_now = utc_now + timedelta(hours=CST_OFFSET_HOURS)
    return cst_now.strftime("%Y-%m-%d")


def init_db() -> None:
    """
    Initialize the database connection.
    For Supabase, table creation is handled via SQL Editor/Dashboard.
    This function verifies the connection exists.
    """
    if not supabase:
        st.error("无法连接到云端数据库：缺少 Supabase 配置。")
        return


def profile_exists(profile_id: str) -> bool:
    """
    Check if a profile ID already exists in the database.
    """
    if not supabase:
        return False
        
    try:
        response = supabase.table("profiles").select("profile_id").eq("profile_id", profile_id).execute()
        # Check if any data returned
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking profile existence: {e}")
        return False


def save_profile(
    profile_id: str,
    gender: str,
    birth_year: int,
    birth_month: int,
    birth_day: int,
    birth_hour: str,
    city: Optional[str] = None,
    is_lunar: bool = False
) -> bool:
    """
    Save a new profile to Supabase with STRICT VERIFICATION.
    
    Logic:
    1. Upsert data.
    2. Check response data (if empty, RLS blocked it).
    3. Immediate READ-BACK to confirm persistence.
    """
    if not supabase:
        st.error("数据库未连接")
        return False
        
    data = {
        "profile_id": profile_id,
        "gender": gender,
        "birth_year": birth_year,
        "birth_month": birth_month,
        "birth_day": birth_day,
        "birth_hour": birth_hour,
        "city": city,
        "is_lunar": 1 if is_lunar else 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        # 1. Upsert
        response = supabase.table("profiles").upsert(data).execute()
        
        # 2. Check for "Soft" Error (Empty Data usually means RLS blocked it)
        # Note: supabase-py v2 might return data as list of dicts
        if not response.data:
            raise Exception("写入被拒绝 (RLS Policy Violation): 未返回数据")

        # 3. Security Double-Check: Immediate Read-Back
        # Trust but verify.
        verification = supabase.table("profiles").select("*").eq("profile_id", profile_id).execute()
        
        if not verification.data:
            raise Exception("写入验证失败: 数据似乎未持久化 (Ghost Write)")
            
        return True

    except Exception as e:
        st.error(f"保存失败: {str(e)}")
        print(f"DEBUG ERROR saving profile: {e}")
        return False


def get_all_profiles() -> List[Dict[str, Any]]:
    """
    Retrieve all profiles from Supabase.
    """
    if not supabase:
        return []
        
    try:
        response = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
        profiles = []
        for row in response.data:
            profiles.append({
                "profile_id": row.get("profile_id"),
                "gender": row.get("gender"),
                "birth_year": row.get("birth_year"),
                "birth_month": row.get("birth_month"),
                "birth_day": row.get("birth_day"),
                "birth_hour": row.get("birth_hour"),
                "city": row.get("city"),
                "is_lunar": bool(row.get("is_lunar")),
            })
        return profiles
    except Exception as e:
        st.error(f"加载档案列表失败: {e}")
        return []


def get_profile_by_id(profile_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single profile by ID.
    """
    if not supabase:
        return None
        
    try:
        response = supabase.table("profiles").select("*").eq("profile_id", profile_id).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {
                "profile_id": row.get("profile_id"),
                "gender": row.get("gender"),
                "birth_year": row.get("birth_year"),
                "birth_month": row.get("birth_month"),
                "birth_day": row.get("birth_day"),
                "birth_hour": row.get("birth_hour"),
                "city": row.get("city"),
                "is_lunar": bool(row.get("is_lunar")),
                "session_data": row.get("session_data"),
            }
        return None
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return None


def update_session_data(profile_id: str, session_data: str) -> bool:
    """
    Update the session_data field for an existing profile.
    """
    if not supabase:
        return False
        
    try:
        response = supabase.table("profiles").update({"session_data": session_data}).eq("profile_id", profile_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error updating session data: {e}")
        return False


def delete_profile(profile_id: str) -> bool:
    """
    Delete a profile by ID.
    """
    if not supabase:
        return False
        
    try:
        response = supabase.table("profiles").delete().eq("profile_id", profile_id).execute()
        # In supabase-py, delete might return the deleted rows if authorized
        return len(response.data) > 0
    except Exception as e:
        st.error(f"删除失败: {e}")
        return False


def check_daily_quota(profile_id: str) -> bool:
    """
    Check if a profile has available daily divination quota.
    """
    if not supabase:
        return False
        
    try:
        response = supabase.table("profiles").select("last_divination_date").eq("profile_id", profile_id).execute()
        if not response.data:
            return False
            
        last_date = response.data[0].get("last_divination_date")
        today = get_cst_today()
        
        if not last_date:
            return True
        
        if last_date < today:
            return True
            
        return False
    except Exception as e:
        print(f"Error checking quota: {e}")
        return False


def consume_daily_quota(profile_id: str) -> bool:
    """
    Consume the daily divination quota.
    """
    if not supabase:
        return False
        
    try:
        today = get_cst_today()
        response = supabase.table("profiles").update({"last_divination_date": today}).eq("profile_id", profile_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error consuming quota: {e}")
        return False
