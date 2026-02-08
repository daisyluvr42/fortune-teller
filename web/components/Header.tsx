"use client";

import { useState, useEffect, useCallback } from "react";
import { User, LogOut, ChevronDown, Trash2, Pencil, Coins, Download } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import { useUserProfile } from "@/lib/context";
import { getTotalCredits, getMembershipStatus, MembershipStatus } from "@/lib/api";
import { Crown } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations } from 'next-intl';
import ExportManager from "@/components/export/ExportManager";

export default function Header() {
    const t = useTranslations('Navbar');
    const { user, isAuthenticated, signOut, isLoading, session } = useAuth();
    const { profiles, activeProfileId, loadProfile, deleteProfile, renameProfile, isLoadingProfiles } = useUserProfile();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const pathname = usePathname();
    const [totalCredits, setTotalCredits] = useState<number | null>(null);
    const [creditsLoading, setCreditsLoading] = useState(false);
    const [membership, setMembership] = useState<MembershipStatus | null>(null);

    const navLinkClass = (path: string) => {
        const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path);
        return `text-[11px] sm:text-sm font-light tracking-[0.14em] sm:tracking-widest whitespace-nowrap transition-colors ${isActive
            ? "text-[#1A1A1A] border-b border-[#1A1A1A]/60 pb-0.5"
            : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            }`;
    };


    const fetchCreditsAndMembership = useCallback(async () => {
        if (!isAuthenticated || !session?.access_token) {
            setTotalCredits(null);
            setMembership(null);
            return;
        }
        setCreditsLoading(true);
        try {
            const [creditsResult, membershipResult] = await Promise.all([
                getTotalCredits(session.access_token),
                getMembershipStatus(session.access_token).catch(() => null),
            ]);
            setTotalCredits(creditsResult.total_credits);
            setMembership(membershipResult);
        } catch {
            setTotalCredits(null);
            setMembership(null);
        } finally {
            setCreditsLoading(false);
        }
    }, [isAuthenticated, session?.access_token]);

    useEffect(() => {
        void fetchCreditsAndMembership();
    }, [fetchCreditsAndMembership]);

    // Refresh when menu opens
    useEffect(() => {
        if (showUserMenu) {
            void fetchCreditsAndMembership();
        }
    }, [showUserMenu, fetchCreditsAndMembership]);

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

    return (
        <header className="w-full py-5 px-4 sm:py-6 sm:px-6">
            <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-6">
                {/* Logo - 抽象线条风格 */}
                <Link href="/" className="order-1 flex items-center gap-3 shrink-0">
                    <img
                        src="/brand/logo.svg"
                        alt="Destiny logo"
                        className="w-8 h-8"
                    />
                    <div>
                        <h1 className="text-base sm:text-lg font-medium tracking-wide text-[#1A1A1A]">
                            {t('brand')}
                        </h1>
                    </div>
                </Link>

                {/* 右侧：档案选择 + 用户区域 + 语言切换 */}
                <div className="order-2 ml-auto flex flex-wrap items-center gap-3 md:order-3 md:ml-0 md:justify-end">
                    <LanguageSwitcher />

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

                    {/* 用户区域 */}
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
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#1A1A1A]/10 py-2 z-20">
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
                                                        onClick={() => alert(t('vipComingSoon'))}
                                                        className="w-full py-1.5 text-xs text-center text-[#B8860B] border border-[#B8860B]/30 rounded-lg hover:bg-[#B8860B]/5 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Crown className="w-3.5 h-3.5" /> {t('upgradeVip')}
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
                                                {creditsLoading ? (
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
                                                onClick={() => alert(t('topUpComingSoon'))}
                                                className="w-full py-2 text-xs text-center bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                                            >
                                                <Coins className="w-3.5 h-3.5" /> {t('topUp')}
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white text-xs hover:opacity-90 transition-opacity"
                        >
                            <User className="w-3.5 h-3.5" />
                            {t('login')}
                        </Link>
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
