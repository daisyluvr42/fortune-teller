"""
CreditManager: Unified Credit/Quota Management Service

Handles all quota checks and consumption for:
- oracle (daily limit = 1)
- liuren (daily limit = 1)
- compatibility (lifetime limit = 3)
- analysis (daily limit = 10)
"""
import os
from datetime import date
from typing import Optional, Literal
from fastapi import HTTPException
from supabase import create_client, Client
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (parent of backend/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")


# Default quota configurations (Free Tier)
DEFAULT_QUOTAS = {
    "oracle": {"cycle_type": "daily", "cycle_limit": 1},
    "liuren": {"cycle_type": "daily", "cycle_limit": 1},
    "compatibility": {"cycle_type": "daily", "cycle_limit": 2},
    "analysis": {"cycle_type": "daily", "cycle_limit": 10},
}

# VIP quota configurations
VIP_QUOTAS = {
    "oracle": {"cycle_type": "daily", "cycle_limit": 20},
    "liuren": {"cycle_type": "daily", "cycle_limit": 20},
    "compatibility": {"cycle_type": "daily", "cycle_limit": 30},  # VIP: daily reset
    "analysis": {"cycle_type": "daily", "cycle_limit": 100},
}

FeatureKey = Literal["oracle", "liuren", "compatibility", "analysis"]


class QuotaStatus(BaseModel):
    """Response model for quota status."""
    feature_key: str
    remaining: int
    cycle_limit: int
    cycle_used: int
    extra_balance: int
    cycle_type: str


class CreditManager:
    """Unified credit/quota manager using user_quotas table."""

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        if not self._client:
            if not self.supabase_url or not self.supabase_key:
                raise HTTPException(status_code=500, detail="Supabase not configured")
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client

    def _is_vip(self, user_id: str) -> bool:
        """Check if user is an active VIP member."""
        try:
            from datetime import datetime
            resp = self.client.table("user_memberships").select("membership_type, expires_at").eq("user_id", user_id).execute()
            
            if not resp.data or len(resp.data) == 0:
                return False
            
            record = resp.data[0]
            if record.get("membership_type") != "vip":
                return False
            
            expires_at = record.get("expires_at")
            if expires_at:
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expires_dt < datetime.now(expires_dt.tzinfo):
                    return False  # Expired
            
            return True
        except Exception as e:
            print(f"[CreditManager] Error checking VIP status: {e}")
            return False

    def _get_quota_config(self, user_id: str, feature_key: FeatureKey) -> dict:
        """Get quota config based on user's membership level."""
        if self._is_vip(user_id):
            return VIP_QUOTAS.get(feature_key, DEFAULT_QUOTAS.get(feature_key))
        return DEFAULT_QUOTAS.get(feature_key, {"cycle_type": "daily", "cycle_limit": 0})

    def _get_or_create_quota(self, user_id: str, feature_key: FeatureKey) -> dict:
        """Get existing quota or create with default values."""
        try:
            resp = self.client.table("user_quotas").select("*").eq("user_id", user_id).eq("feature_key", feature_key).execute()
            
            if resp.data and len(resp.data) > 0:
                return resp.data[0]
            
            # Create default quota
            defaults = DEFAULT_QUOTAS.get(feature_key, {"cycle_type": "daily", "cycle_limit": 0})
            new_quota = {
                "user_id": user_id,
                "feature_key": feature_key,
                "cycle_type": defaults["cycle_type"],
                "cycle_limit": defaults["cycle_limit"],
                "cycle_used": 0,
                "extra_balance": 0,
                "last_reset_date": date.today().isoformat(),
            }
            insert_resp = self.client.table("user_quotas").insert(new_quota).execute()
            if insert_resp.data:
                return insert_resp.data[0]
            print(f"[CreditManager] Insert failed: {insert_resp}")
            raise HTTPException(status_code=500, detail="Failed to create quota record")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[CreditManager] DB Error for user={user_id}, feature={feature_key}: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


    def _maybe_reset_cycle(self, quota: dict) -> dict:
        """Reset cycle_used if the reset date has passed (for daily/monthly cycles)."""
        cycle_type = quota.get("cycle_type", "daily")
        if cycle_type == "none":
            return quota  # Lifetime quota, no reset
        
        last_reset = quota.get("last_reset_date")
        today = date.today().isoformat()
        
        if last_reset != today:
            # Reset cycle
            quota["cycle_used"] = 0
            quota["last_reset_date"] = today
            self.client.table("user_quotas").update({
                "cycle_used": 0,
                "last_reset_date": today,
            }).eq("id", quota["id"]).execute()
        
        return quota

    def get_status(self, user_id: str, feature_key: FeatureKey) -> QuotaStatus:
        """Get current quota status for a feature."""
        quota = self._get_or_create_quota(user_id, feature_key)
        quota = self._maybe_reset_cycle(quota)
        
        # Get dynamic cycle_limit based on membership level
        config = self._get_quota_config(user_id, feature_key)
        cycle_limit = config.get("cycle_limit", 0)
        cycle_type = config.get("cycle_type", "daily")
        
        cycle_used = quota.get("cycle_used", 0)
        extra_balance = quota.get("extra_balance", 0)
        
        remaining = max(0, cycle_limit - cycle_used) + max(0, extra_balance)
        
        return QuotaStatus(
            feature_key=feature_key,
            remaining=remaining,
            cycle_limit=cycle_limit,
            cycle_used=cycle_used,
            extra_balance=extra_balance,
            cycle_type=cycle_type,
        )

    def consume(self, user_id: str, feature_key: FeatureKey, amount: int = 1) -> QuotaStatus:
        """
        Consume quota for a feature.
        Priority: cycle quota (free) -> extra_balance (paid)
        Raises 403 if insufficient.
        """
        quota = self._get_or_create_quota(user_id, feature_key)
        quota = self._maybe_reset_cycle(quota)
        
        # Get dynamic cycle_limit based on membership level
        config = self._get_quota_config(user_id, feature_key)
        cycle_limit = config.get("cycle_limit", 0)
        
        cycle_used = quota.get("cycle_used", 0)
        extra_balance = quota.get("extra_balance", 0)
        
        cycle_remaining = max(0, cycle_limit - cycle_used)
        total_remaining = cycle_remaining + extra_balance
        
        if total_remaining < amount:
            raise HTTPException(
                status_code=403,
                detail=f"{feature_key} 额度不足，请充值或开通 VIP 获取更多权益"
            )
        
        # Deduct from cycle quota first
        to_deduct = amount
        new_cycle_used = cycle_used
        new_extra = extra_balance
        
        if cycle_remaining >= to_deduct:
            new_cycle_used = cycle_used + to_deduct
            to_deduct = 0
        else:
            new_cycle_used = cycle_limit  # Max out the cycle
            to_deduct -= cycle_remaining
            new_extra = extra_balance - to_deduct
        
        # Update database
        self.client.table("user_quotas").update({
            "cycle_used": new_cycle_used,
            "extra_balance": new_extra,
        }).eq("id", quota["id"]).execute()
        
        # Return updated status
        new_remaining = max(0, cycle_limit - new_cycle_used) + max(0, new_extra)
        return QuotaStatus(
            feature_key=feature_key,
            remaining=new_remaining,
            cycle_limit=cycle_limit,
            cycle_used=new_cycle_used,
            extra_balance=new_extra,
            cycle_type=quota.get("cycle_type", "daily"),
        )

    def add_credits(self, user_id: str, feature_key: FeatureKey, amount: int) -> QuotaStatus:
        """Add extra credits (for purchase/reward)."""
        quota = self._get_or_create_quota(user_id, feature_key)
        new_extra = quota.get("extra_balance", 0) + amount
        
        self.client.table("user_quotas").update({
            "extra_balance": new_extra,
        }).eq("id", quota["id"]).execute()
        
        return self.get_status(user_id, feature_key)

    def get_total_credits(self, user_id: str) -> int:
        """
        Get total recharged credits for a user.
        Returns the sum of extra_balance across all features.
        """
        try:
            resp = self.client.table("user_quotas").select("extra_balance").eq("user_id", user_id).execute()
            if resp.data:
                return sum(row.get("extra_balance", 0) for row in resp.data)
            return 0
        except Exception as e:
            print(f"[CreditManager] Error getting total credits for user={user_id}: {e}")
            return 0


# Singleton instance
_credit_manager: Optional[CreditManager] = None


def get_credit_manager() -> CreditManager:
    """Get singleton CreditManager instance."""
    global _credit_manager
    if _credit_manager is None:
        _credit_manager = CreditManager()
    return _credit_manager
