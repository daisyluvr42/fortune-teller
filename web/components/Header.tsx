"use client";

import { useState, useEffect } from "react";
import { User, LogOut, ChevronDown, Trash2, Pencil, Coins, Download } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useUserProfile } from "@/lib/context";
import { createCheckoutSession } from "@/lib/api";
import { useUserStatus } from "@/lib/UserStatusContext";
import { Crown } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations, useLocale } from 'next-intl';
import ExportManager from "@/components/export/ExportManager";

export default function Header() {
    const t = useTranslations('Navbar');
    const locale = useLocale();
    const { user, isAuthenticated, signOut, isLoading } = useAuth();
    const { membership, totalCredits, isLoading: isUserStatusLoading, refreshStatus } = useUserStatus();
    const { profiles, activeProfileId, loadProfile, deleteProfile, renameProfile, isLoadingProfiles } = useUserProfile();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const pathname = usePathname();
    const [checkoutLoadingType, setCheckoutLoadingType] = useState<"vip" | "topup" | null>(null);

    const navLinkClass = (path: string) => {
        const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path);
        return `text-[11px] sm:text-sm font-light tracking-[0.14em] sm:tracking-widest whitespace-nowrap transition-colors ${isActive
            ? "text-[#1A1A1A] border-b border-[#1A1A1A]/60 pb-0.5"
            : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            }`;
    };


    // Refresh when menu opens
    useEffect(() => {
        if (showUserMenu) {
            void refreshStatus();
        }
    }, [refreshStatus, showUserMenu]);

    const handleSignOut = async () => {
        await signOut();
        setShowUserMenu(false);
    };

    const handleDeleteProfile = async () => {
        if (!activeProfileId) return;
        const current = profiles.find((p) => p.id === activeProfileId);
        const name = current?.profileName || t('settings');
        if (!confirm(t('confirmDelete', { name }))) return;
        await deleteProfile(activeProfileId);
    };

    const handleRenameProfile = async () => {
        if (!activeProfileId) return;
        const current = profiles.find((p) => p.id === activeProfileId);
        const name = current?.profileName || "";
        const next = prompt(t('renamePrompt'), name);
        if (next === null) return;
        await renameProfile(activeProfileId, next);
    };

    const startStripeCheckout = async (kind: "vip" | "topup") => {
        if (!user) return;

        setCheckoutLoadingType(kind);
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem("stripe_checkout_kind", kind);
                if (kind === "topup") {
                    localStorage.setItem("stripe_checkout_credits", "10");
                } else {
                    localStorage.removeItem("stripe_checkout_credits");
                }
            }

            const analysisType = kind === "vip" ? "yearly" : "basic";
            const result = await createCheckoutSession({
                user_id: user.id,
                analysis_type: analysisType,
            });
            window.location.href = result.checkout_url;
        } catch (error) {
            const fallback = locale === "zh"
                ? "发起支付失败，请稍后重试"
                : "Failed to start checkout. Please try again.";
            alert(error instanceof Error ? error.message : fallback);
        } finally {
            setCheckoutLoadingType(null);
        }
    };

    return (
        <header className="w-full py-5 px-4 sm:py-6 sm:px-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-6">

                {/* 第一排：Logo & 语言切换 */}
                <div className="flex items-center justify-between w-full md:w-auto md:flex-none">
                    <Link href="/" className="flex items-center gap-3 shrink-0">
                        <Image
                            src="/brand/logo.svg"
                            alt="Destiny logo"
                            width={32}
                            height={32}
                            className="w-8 h-8"
                        />
                        <div>
                            <h1 className="text-base sm:text-lg font-medium tracking-wide text-[#1A1A1A]">
                                {t('brand')}
                            </h1>
                        </div>
                    </Link>

                    <div className="md:hidden">
                        <LanguageSwitcher />
                    </div>
                </div>

                {/* 第二排：用户区域 + 档案选择 + (桌面端语言切换) */}
                <div className="flex flex-wrap items-center gap-3 md:ml-auto md:justify-end w-full md:w-auto">
                    {/* 桌面端语言切换 */}
                    <div className="hidden md:block">
                        <LanguageSwitcher />
                    </div>

                    {/* 用户区域 (排在档案前面) */}
                    {isLoading ? (
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/5 animate-pulse" />
                    ) : isAuthenticated && user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors"
                            >
                                <User className="w-4 h-4 text-[#1A1A1A]/60" />
                                <span className="text-xs text-[#1A1A1A]/70 max-w-[80px] truncate">
                                    {user.email?.split('@')[0]}
                                </span>
                                <ChevronDown className="w-3 h-3 text-[#1A1A1A]/40" />
                            </button>

                            {/* 下拉菜单 */}
                            {showUserMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    {/* 修改下拉框定位和自适应 */}
                                    <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-[#1A1A1A]/10 py-2 z-20">
                                        {/* 账户信息 */}
                                        <div className="px-4 py-2 border-b border-[#1A1A1A]/5">
                                            <p className="text-xs text-[#1A1A1A]/40">{t('loggedInAs')}</p>
                                            <p className="text-sm text-[#1A1A1A] truncate">{user.email}</p>
                                        </div>

                                        {/* VIP 会员状态 */}
                                        {membership && (
                                            <div className="px-4 py-3 border-b border-[#1A1A1A]/5">
                                                {membership.membership_type === "vip" ? (
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5 text-xs">
                                                            <Crown className="w-4 h-4 text-[#B8860B]" />
                                                            <span className="text-[#B8860B] font-semibold">{t('vipMember')}</span>
                                                        </span>
                                                        <span className="text-xs text-[#1A1A1A]/50">
                                                            {t('daysRemaining', { days: membership.days_remaining ?? 0 })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => void startStripeCheckout("vip")}
                                                        disabled={checkoutLoadingType !== null}
                                                        className="w-full py-1.5 text-xs text-center text-[#B8860B] border border-[#B8860B]/30 rounded-lg hover:bg-[#B8860B]/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Crown className="w-3.5 h-3.5" />
                                                        {checkoutLoadingType === "vip"
                                                            ? (locale === "zh" ? "跳转支付中..." : "Redirecting...")
                                                            : t('upgradeVip')}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* 总点数显示 */}
                                        <div className="px-4 py-3 border-b border-[#1A1A1A]/5">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/60">
                                                    <Coins className="w-3.5 h-3.5 text-[#B8860B]" /> {t('totalCredits')}
                                                </span>
                                                {isUserStatusLoading && totalCredits === null ? (
                                                    <span className="text-xs text-[#1A1A1A]/30 animate-pulse">...</span>
                                                ) : (
                                                    <span className="text-sm text-[#B8860B] font-semibold">{totalCredits ?? 0}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[#1A1A1A]/30 mt-1">{t('creditsHint')}</p>
                                        </div>

                                        {/* 充值按钮 */}
                                        <div className="px-4 py-2 border-b border-[#1A1A1A]/5">
                                            <button
                                                onClick={() => void startStripeCheckout("topup")}
                                                disabled={checkoutLoadingType !== null}
                                                className="w-full py-2 text-xs text-center bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white rounded-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1"
                                            >
                                                <Coins className="w-3.5 h-3.5" />
                                                {checkoutLoadingType === "topup"
                                                    ? (locale === "zh" ? "跳转支付中..." : "Redirecting...")
                                                    : t('topUp')}
                                            </button>
                                        </div>

                                        {/* 退出登录 */}
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full px-4 py-2 text-left text-sm text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/5 flex items-center gap-2 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            {t('logout')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white text-xs hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                            <User className="w-3.5 h-3.5" />
                            {t('login')}
                        </Link>
                    )}

                    {/* 档案区 (只有登录后显示) */}
                    {isAuthenticated && user && (
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={activeProfileId || ""}
                                onChange={(e) => loadProfile(e.target.value)}
                                className="text-xs px-3 py-1.5 rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors min-w-[86px] sm:min-w-[110px]"
                                disabled={isLoadingProfiles || profiles.length === 0}
                            >
                                {profiles.length === 0 && (
                                    <option value="">{t('noProfile')}</option>
                                )}
                                {profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.profileName}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleRenameProfile}
                                className="p-2 rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors"
                                title={t('renameProfile')}
                                disabled={!activeProfileId || profiles.length === 0}
                            >
                                <Pencil className="w-4 h-4 text-[#1A1A1A]/60" />
                            </button>
                            <button
                                onClick={handleDeleteProfile}
                                className="p-2 rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors"
                                title={t('deleteProfile')}
                                disabled={!activeProfileId || profiles.length === 0}
                            >
                                <Trash2 className="w-4 h-4 text-[#1A1A1A]/60" />
                            </button>
                            <button
                                onClick={() => setShowExport(true)}
                                className="p-2 rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors"
                                title={t('export')}
                                disabled={!activeProfileId || profiles.length === 0}
                            >
                                <Download className="w-4 h-4 text-[#1A1A1A]/60" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 导航链接（移至左侧） */}
                <nav className="order-3 w-full flex items-center gap-3 overflow-x-auto whitespace-nowrap pt-1 md:order-2 md:w-auto md:flex-1 md:overflow-visible md:pt-0">
                    <Link href="/" className={navLinkClass("/")}>
                        {t('home')}
                    </Link>
                    <Link href="/analysis" className={navLinkClass("/analysis")}>
                        {t('analysis')}
                    </Link>
                    <Link href="/compatibility" className={navLinkClass("/compatibility")}>
                        {t('compatibility')}
                    </Link>
                    <Link href="/oracle" className={navLinkClass("/oracle")}>
                        {t('oracle')}
                    </Link>
                    <Link href="/liuren" className={navLinkClass("/liuren")}>
                        {t('liuren')}
                    </Link>
                </nav>
            </div>
            {showExport && (
                <ExportManager
                    isOpen={showExport}
                    onClose={() => setShowExport(false)}
                />
            )}
        </header>
    );
}
