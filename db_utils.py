"""
Database utilities for Bazi Profile Management.
Uses SQLite to persist user profiles with user-defined IDs.
"""
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional

# Database file path (same directory as this module)
DB_PATH = os.path.join(os.path.dirname(__file__), "profiles.db")

# China Standard Time offset (UTC+8)
CST_OFFSET_HOURS = 8


def get_cst_today() -> str:
    """Get current date in China Standard Time (UTC+8) as YYYY-MM-DD string."""
    utc_now = datetime.utcnow()
    cst_now = utc_now + timedelta(hours=CST_OFFSET_HOURS)
    return cst_now.strftime("%Y-%m-%d")


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Initialize the database and create the profiles table if it doesn't exist.
    Uses user-defined profile_id (TEXT) as primary key.
    Should be called once at app startup.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create new table with TEXT primary key (profile_id)
    # session_data stores JSON-serialized session state for instant restoration
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles_v2 (
            profile_id TEXT PRIMARY KEY,
            gender TEXT NOT NULL,
            birth_year INTEGER NOT NULL,
            birth_month INTEGER NOT NULL,
            birth_day INTEGER NOT NULL,
            birth_hour TEXT NOT NULL,
            city TEXT,
            is_lunar INTEGER DEFAULT 0,
            session_data TEXT,
            last_divination_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migration: Add session_data column if it doesn't exist (for existing tables)
    try:
        cursor.execute("ALTER TABLE profiles_v2 ADD COLUMN session_data TEXT")
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    # Migration: Add last_divination_date column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE profiles_v2 ADD COLUMN last_divination_date TEXT")
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    conn.commit()
    conn.close()


def profile_exists(profile_id: str) -> bool:
    """
    Check if a profile ID already exists in the database.
    
    Args:
        profile_id: The user-defined profile ID to check
    
    Returns:
        True if exists, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT 1 FROM profiles_v2 WHERE profile_id = ?", (profile_id,))
    exists = cursor.fetchone() is not None
    
    conn.close()
    return exists


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
    Save a new profile to the database with user-defined ID.
    
    Args:
        profile_id: User-defined unique identifier (alphanumeric)
        gender: "男" or "女"
        birth_year: Birth year (e.g., 1990)
        birth_month: Birth month (1-12)
        birth_day: Birth day (1-31)
        birth_hour: Birth hour as string (e.g., "12:00" or "午时")
        city: Birth city name (optional)
        is_lunar: True if birth date is lunar calendar
    
    Returns:
        True if saved successfully, False if ID already exists
    """
    if profile_exists(profile_id):
        return False
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO profiles_v2 (profile_id, gender, birth_year, birth_month, birth_day, birth_hour, city, is_lunar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (profile_id, gender, birth_year, birth_month, birth_day, birth_hour, city, 1 if is_lunar else 0))
    
    conn.commit()
    conn.close()
    
    return True


def get_all_profiles() -> list[dict]:
    """
    Retrieve all profiles from the database.
    
    Returns:
        List of profile dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM profiles_v2 ORDER BY created_at DESC")
    rows = cursor.fetchall()
    
    profiles = []
    for row in rows:
        profiles.append({
            "profile_id": row["profile_id"],
            "gender": row["gender"],
            "birth_year": row["birth_year"],
            "birth_month": row["birth_month"],
            "birth_day": row["birth_day"],
            "birth_hour": row["birth_hour"],
            "city": row["city"],
            "is_lunar": bool(row["is_lunar"]),
        })
    
    conn.close()
    return profiles


def get_profile_by_id(profile_id: str) -> Optional[dict]:
    """
    Retrieve a single profile by its user-defined ID.
    
    Args:
        profile_id: The user-defined profile ID to retrieve
    
    Returns:
        Profile dictionary or None if not found
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM profiles_v2 WHERE profile_id = ?", (profile_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return {
            "profile_id": row["profile_id"],
            "gender": row["gender"],
            "birth_year": row["birth_year"],
            "birth_month": row["birth_month"],
            "birth_day": row["birth_day"],
            "birth_hour": row["birth_hour"],
            "city": row["city"],
            "is_lunar": bool(row["is_lunar"]),
            "session_data": row["session_data"],
        }
    return None


def update_session_data(profile_id: str, session_data: str) -> bool:
    """
    Update the session_data field for an existing profile.
    This is used for auto-saving session state after LLM responses.
    
    Args:
        profile_id: The profile ID to update
        session_data: JSON string of serialized session state
    
    Returns:
        True if updated successfully, False if profile not found
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE profiles_v2 SET session_data = ? WHERE profile_id = ?",
        (session_data, profile_id)
    )
    updated = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return updated


def delete_profile(profile_id: str) -> bool:
    """
    Delete a profile by its user-defined ID.
    
    Args:
        profile_id: The ID of the profile to delete
    
    Returns:
        True if a profile was deleted, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM profiles_v2 WHERE profile_id = ?", (profile_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted


def check_daily_quota(profile_id: str) -> bool:
    """
    Check if a profile has available daily divination quota.
    Based on China Standard Time (UTC+8).
    
    Args:
        profile_id: The profile ID to check
    
    Returns:
        True if quota available, False if already used today
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT last_divination_date FROM profiles_v2 WHERE profile_id = ?",
        (profile_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return False  # Profile not found
    
    last_date = row["last_divination_date"]
    today = get_cst_today()
    
    if last_date is None:
        return True  # First time use
    
    if last_date < today:
        return True  # New day, refresh credit
    
    return False  # Already used today


def consume_daily_quota(profile_id: str) -> bool:
    """
    Consume the daily divination quota by updating last_divination_date.
    
    Args:
        profile_id: The profile ID to update
    
    Returns:
        True if updated successfully, False if profile not found
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    today = get_cst_today()
    cursor.execute(
        "UPDATE profiles_v2 SET last_divination_date = ? WHERE profile_id = ?",
        (today, profile_id)
    )
    updated = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return updated
