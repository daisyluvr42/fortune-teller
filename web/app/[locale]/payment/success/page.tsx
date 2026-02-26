"use client";

import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Link } from "@/i18n/routing";

type PurchaseType = "vip" | "topup" | "unknown";

export default function PaymentSuccessPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();

  const checkoutInfo = useMemo(() => {
    if (typeof window === "undefined") {
      return { purchaseType: "unknown" as PurchaseType, credits: "10" };
    }

    const typeFromQuery = searchParams.get("type");
    const creditsFromQuery = searchParams.get("credits");
    const typeFromStorage = localStorage.getItem("stripe_checkout_kind");
    const creditsFromStorage = localStorage.getItem("stripe_checkout_credits");

    const finalType = typeFromQuery || typeFromStorage || "unknown";
    const finalCredits = creditsFromQuery || creditsFromStorage || "10";
    const purchaseType: PurchaseType = finalType === "vip" || finalType === "topup"
      ? finalType
      : "unknown";

    return { purchaseType, credits: finalCredits };
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stripe_checkout_kind");
      localStorage.removeItem("stripe_checkout_credits");
    }
  }, []);

  const title = useMemo(() => {
    if (checkoutInfo.purchaseType === "vip") {
      return locale === "zh"
        ? "支付成功，您已开通会员"
        : "Payment successful. Your VIP membership is now active.";
    }
    if (checkoutInfo.purchaseType === "topup") {
      return locale === "zh"
        ? `支付成功，您已充值${checkoutInfo.credits}点`
        : `Payment successful. ${checkoutInfo.credits} credits have been added.`;
    }
    return locale === "zh"
      ? "支付成功"
      : "Payment successful";
  }, [checkoutInfo, locale]);

  return (
    <main className="min-h-screen bg-[#F8F8F0]">
      <Header />
      <div className="page-shell">
        <div className="max-w-lg mx-auto">
          <section className="zen-card p-10 text-center space-y-5 animate-fade-in">
            <CheckCircle2 className="w-14 h-14 mx-auto text-[#B8860B]" />
            <h1 className="text-2xl font-light tracking-[0.18em] text-[#1A1A1A]">
              {title}
            </h1>
            <p className="text-sm text-[#1A1A1A]/55">
              {locale === "zh"
                ? "订单已完成，稍后将同步到账户。"
                : "Your order is complete and will be synced to your account shortly."}
            </p>
            <div>
              <Link href="/" className="zen-button inline-flex">
                {locale === "zh" ? "返回首页" : "Back to Home"}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
