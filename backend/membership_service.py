"""
MembershipService: VIP 会员管理服务

处理会员状态查询、升级、续费等逻辑。
支付接口预留供后续接入 Stripe/支付宝/微信。
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Literal
from fastapi import HTTPException
from supabase import create_client, Client
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
project_root = Path(__file__).parent.parent
load_dotenv(project_root / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ===== 价格配置 =====
PRICING = {
    "vip_monthly": {
        "USD": 9.99,
        "CNY": 68.00,
        "days": 30,
    },
    "credits_pack": {
        "USD": 0.99,
        "CNY": 6.80,
        "credits": 10,
    },
}

# ===== 会员配额配置 =====
QUOTA_CONFIG = {
    "free": {
        "analysis": 10,
        "oracle": 1,
        "compatibility": 3,
    },
    "vip": {
        "analysis": 100,
        "oracle": 20,
        "compatibility": 30,
    },
}


class MembershipStatus(BaseModel):
    membership_type: Literal["free", "vip"]
    expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    auto_renew: bool = False
    quotas: dict  # 当前会员等级对应的每日配额


class PaymentRequest(BaseModel):
    payment_type: Literal["membership_vip", "credits_recharge"]
    currency: Literal["USD", "CNY"] = "USD"
    quantity: int = 1  # 会员月数 or 点数包数量


class PaymentResponse(BaseModel):
    payment_id: str
    amount: float
    currency: str
    status: str  # 'pending', 'completed'
    redirect_url: Optional[str] = None  # 跳转到支付页面


class MembershipService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("Missing Supabase credentials")
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    def get_membership(self, user_id: str) -> MembershipStatus:
        """获取用户会员状态"""
        res = self.client.table("user_memberships").select("*").eq("user_id", user_id).execute()
        
        membership_type = "free"
        expires_at = None
        days_remaining = None
        auto_renew = False
        
        if res.data and len(res.data) > 0:
            record = res.data[0]
            membership_type = record.get("membership_type", "free")
            expires_at_str = record.get("expires_at")
            auto_renew = record.get("auto_renew", False)
            
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                now = datetime.now(expires_at.tzinfo)
                
                if expires_at < now:
                    # 会员已过期，降级为 free
                    membership_type = "free"
                    days_remaining = 0
                else:
                    days_remaining = (expires_at - now).days
        
        quotas = QUOTA_CONFIG.get(membership_type, QUOTA_CONFIG["free"])
        
        return MembershipStatus(
            membership_type=membership_type,
            expires_at=expires_at,
            days_remaining=days_remaining,
            auto_renew=auto_renew,
            quotas=quotas,
        )

    def get_quota_limit(self, user_id: str, feature_key: str) -> int:
        """根据会员等级获取某功能的每日配额上限"""
        membership = self.get_membership(user_id)
        return membership.quotas.get(feature_key, 0)

    def upgrade_to_vip(self, user_id: str, months: int = 1, payment_id: Optional[str] = None) -> MembershipStatus:
        """
        升级/续费为 VIP 会员
        
        Args:
            user_id: 用户ID
            months: 购买月数
            payment_id: 支付平台订单号 (可选)
        """
        # 获取当前会员状态
        res = self.client.table("user_memberships").select("*").eq("user_id", user_id).execute()
        
        now = datetime.now()
        
        if res.data and len(res.data) > 0:
            record = res.data[0]
            current_expires = record.get("expires_at")
            
            # 如果当前是 VIP 且未过期，续费从到期日开始计算
            if current_expires:
                current_expires_dt = datetime.fromisoformat(current_expires.replace("Z", "+00:00"))
                if current_expires_dt > now:
                    now = current_expires_dt.replace(tzinfo=None)
            
            new_expires = now + timedelta(days=30 * months)
            
            self.client.table("user_memberships").update({
                "membership_type": "vip",
                "expires_at": new_expires.isoformat(),
                "payment_id": payment_id,
            }).eq("user_id", user_id).execute()
        else:
            # 新用户首次开通
            new_expires = now + timedelta(days=30 * months)
            
            self.client.table("user_memberships").insert({
                "user_id": user_id,
                "membership_type": "vip",
                "starts_at": now.isoformat(),
                "expires_at": new_expires.isoformat(),
                "payment_id": payment_id,
            }).execute()
        
        return self.get_membership(user_id)

    def create_payment(self, user_id: str, request: PaymentRequest) -> PaymentResponse:
        """
        创建支付订单 (预留接口)
        
        后续接入 Stripe/支付宝/微信时，在此方法中调用相应 SDK。
        目前返回一个模拟的待支付订单。
        """
        pricing = PRICING.get(
            "vip_monthly" if request.payment_type == "membership_vip" else "credits_pack"
        )
        
        if not pricing:
            raise HTTPException(status_code=400, detail="Invalid payment type")
        
        unit_price = pricing[request.currency]
        total_amount = unit_price * request.quantity
        
        # 计算实际获得的内容
        credits_amount = None
        membership_days = None
        
        if request.payment_type == "credits_recharge":
            credits_amount = pricing["credits"] * request.quantity
        else:
            membership_days = pricing["days"] * request.quantity
        
        # 创建支付记录
        record = self.client.table("payment_records").insert({
            "user_id": user_id,
            "payment_type": request.payment_type,
            "amount": total_amount,
            "currency": request.currency,
            "credits_amount": credits_amount,
            "membership_days": membership_days,
            "payment_status": "pending",
        }).execute()
        
        payment_id = record.data[0]["id"]
        
        # TODO: 接入实际支付平台后，这里返回真实的支付页面 URL
        # 目前返回模拟数据
        return PaymentResponse(
            payment_id=payment_id,
            amount=total_amount,
            currency=request.currency,
            status="pending",
            redirect_url=None,  # 后续接入支付平台后返回真实 URL
        )

    def complete_payment(self, payment_id: str, payment_provider: str, provider_payment_id: str) -> dict:
        """
        支付完成回调 (预留接口)
        
        由支付平台 Webhook 调用，确认支付成功后：
        1. 更新支付记录状态
        2. 发放会员/点数
        """
        # 获取支付记录
        res = self.client.table("payment_records").select("*").eq("id", payment_id).execute()
        
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        record = res.data[0]
        
        if record["payment_status"] == "completed":
            return {"status": "already_completed"}
        
        user_id = record["user_id"]
        payment_type = record["payment_type"]
        
        # 更新支付状态
        self.client.table("payment_records").update({
            "payment_status": "completed",
            "payment_provider": payment_provider,
            "payment_id": provider_payment_id,
            "completed_at": datetime.now().isoformat(),
        }).eq("id", payment_id).execute()
        
        # 发放权益
        if payment_type == "membership_vip":
            months = record["membership_days"] // 30
            self.upgrade_to_vip(user_id, months, payment_id)
            return {"status": "completed", "type": "membership", "months": months}
        
        elif payment_type == "credits_recharge":
            credits = record["credits_amount"]
            # 将点数添加到用户的 extra_balance
            self._add_credits(user_id, credits)
            return {"status": "completed", "type": "credits", "credits": credits}
        
        return {"status": "completed"}

    def _add_credits(self, user_id: str, credits: int):
        """将充值点数添加到用户账户"""
        # 平均分配到三个功能 (或者可以让用户选择)
        # 暂时按比例分配：analysis 50%, oracle 25%, compatibility 25%
        from credit_service import CreditManager
        
        credit_manager = CreditManager()
        
        # 简单起见，将点数添加到 analysis 的 extra_balance
        # 后续可以让用户选择如何分配
        credit_manager.add_credits(user_id, "analysis", credits)


# 单例
_membership_service: Optional[MembershipService] = None


def get_membership_service() -> MembershipService:
    global _membership_service
    if _membership_service is None:
        _membership_service = MembershipService()
    return _membership_service
