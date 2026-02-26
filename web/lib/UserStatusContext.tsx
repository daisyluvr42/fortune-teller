"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
    CreditType,
    CreditStatusResponse,
    MembershipStatus,
    getCreditStatus,
    getMembershipStatus,
    getTotalCredits,
} from './api';

// ============================================
// 用户状态 Context (会员 + 额度)
// ============================================

interface UserStatusContextType {
    // 数据状态
    membership: MembershipStatus | null;
    credits: Record<CreditType, CreditStatusResponse | null>;
    totalCredits: number | null;

    // 加载状态
    isLoading: boolean;
    error: string | null;

    // 操作方法
    refreshStatus: () => Promise<void>;
    updateCredit: (type: CreditType, newStatus: CreditStatusResponse) => void;
}

const EMPTY_CREDITS: Record<CreditType, CreditStatusResponse | null> = {
    oracle: null,
    liuren: null,
    compatibility: null,
    analysis: null,
};

const defaultContext: UserStatusContextType = {
    membership: null,
    credits: EMPTY_CREDITS,
    totalCredits: null,
    isLoading: false,
    error: null,
    refreshStatus: async () => { },
    updateCredit: () => { },
};

const UserStatusContext = createContext<UserStatusContextType>(defaultContext);
const STATUS_TTL_MS = 60_000;

function isAuthTokenError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return (
        err.message.includes("Invalid Authorization token")
        || err.message.includes("Missing Authorization token")
    );
}

export function UserStatusProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, session } = useAuth();
    const accessToken = session?.access_token ?? null;

    const [membership, setMembership] = useState<MembershipStatus | null>(null);
    const [credits, setCredits] = useState<Record<CreditType, CreditStatusResponse | null>>(EMPTY_CREDITS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCredits, setTotalCredits] = useState<number | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastFetchTimeRef = useRef<number>(0);
    const lastTokenRef = useRef<string | null>(null);

    const clearStatus = useCallback(() => {
        setMembership(null);
        setCredits(EMPTY_CREDITS);
        setTotalCredits(null);
        setError(null);
        setIsLoading(false);
        inFlightRef.current = null;
        lastFetchTimeRef.current = 0;
    }, []);

    // 批量拉取所有状态（带 TTL + 并发去重）
    const runRefresh = useCallback(async (force = false) => {
        if (!isAuthenticated || !accessToken) {
            clearStatus();
            return;
        }

        const now = Date.now();
        if (!force && lastFetchTimeRef.current > 0 && now - lastFetchTimeRef.current < STATUS_TTL_MS) {
            return;
        }

        if (inFlightRef.current) {
            return inFlightRef.current;
        }

        const token = accessToken;

        const refreshTask = (async () => {
            setIsLoading(true);
            setError(null);

            // 并行请求：会员状态 + 4个功能的额度
            const [
                membershipRes,
                oracleRes,
                liurenRes,
                compRes,
                analysisRes,
                totalCreditsRes,
            ] = await Promise.all([
                getMembershipStatus(token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Membership fetch failed", e);
                    return null;
                }),
                getCreditStatus("oracle", token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Oracle quota fetch failed", e);
                    return null;
                }),
                getCreditStatus("liuren", token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Liuren quota fetch failed", e);
                    return null;
                }),
                getCreditStatus("compatibility", token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Compatibility quota fetch failed", e);
                    return null;
                }),
                getCreditStatus("analysis", token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Analysis quota fetch failed", e);
                    return null;
                }),
                getTotalCredits(token).catch((e) => {
                    if (!isAuthTokenError(e)) console.warn("Total credits fetch failed", e);
                    return null;
                }),
            ]);

            setMembership(membershipRes);
            setCredits({
                oracle: oracleRes,
                liuren: liurenRes,
                compatibility: compRes,
                analysis: analysisRes,
            });
            setTotalCredits(totalCreditsRes?.total_credits ?? null);
            lastFetchTimeRef.current = Date.now();

        })()
            .catch((err: unknown) => {
                console.error("Failed to refresh user status:", err);
                setError(err instanceof Error ? err.message : "获取用户状态失败");
            })
            .finally(() => {
                setIsLoading(false);
                inFlightRef.current = null;
            });

        inFlightRef.current = refreshTask;
        return refreshTask;
    }, [accessToken, clearStatus, isAuthenticated]);

    const refreshStatus = useCallback(async () => {
        await runRefresh(false);
    }, [runRefresh]);

    // token 变化时强制下次刷新（防止切号后读到旧缓存）
    useEffect(() => {
        if (!accessToken) {
            lastTokenRef.current = null;
            return;
        }

        if (lastTokenRef.current !== accessToken) {
            lastTokenRef.current = accessToken;
            lastFetchTimeRef.current = 0;
        }
    }, [accessToken]);

    // 登录后自动拉取；登出时清空
    useEffect(() => {
        if (isAuthenticated && accessToken) {
            const timer = window.setTimeout(() => {
                void runRefresh(false);
            }, 0);
            return () => window.clearTimeout(timer);
        }
    }, [accessToken, isAuthenticated, runRefresh]);

    // 返回页面前台/聚焦时，按 TTL 静默刷新
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleFocus = () => {
            void runRefresh(false);
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void runRefresh(false);
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isAuthenticated, runRefresh]);

    // 手动更新某个额度 (用于消费后静默更新)
    const updateCredit = useCallback((type: CreditType, newStatus: CreditStatusResponse) => {
        setCredits(prev => ({
            ...prev,
            [type]: newStatus
        }));
    }, []);

    return (
        <UserStatusContext.Provider value={{
            membership: isAuthenticated ? membership : null,
            credits: isAuthenticated ? credits : EMPTY_CREDITS,
            totalCredits: isAuthenticated ? totalCredits : null,
            isLoading,
            error,
            refreshStatus,
            updateCredit,
        }}>
            {children}
        </UserStatusContext.Provider>
    );
}

export function useUserStatus() {
    const context = useContext(UserStatusContext);
    if (context === undefined) {
        throw new Error("useUserStatus must be used within a UserStatusProvider");
    }
    return context;
}
