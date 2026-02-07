"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
    CreditType,
    CreditStatusResponse,
    MembershipStatus,
    getCreditStatus,
    getMembershipStatus
} from './api';

// ============================================
// 用户状态 Context (会员 + 额度)
// ============================================

interface UserStatusContextType {
    // 数据状态
    membership: MembershipStatus | null;
    credits: Record<CreditType, CreditStatusResponse | null>;

    // 加载状态
    isLoading: boolean;
    error: string | null;

    // 操作方法
    refreshStatus: () => Promise<void>;
    updateCredit: (type: CreditType, newStatus: CreditStatusResponse) => void;
}

const defaultContext: UserStatusContextType = {
    membership: null,
    credits: {
        oracle: null,
        compatibility: null,
        analysis: null,
    },
    isLoading: false,
    error: null,
    refreshStatus: async () => { },
    updateCredit: () => { },
};

const UserStatusContext = createContext<UserStatusContextType>(defaultContext);

export function UserStatusProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, session } = useAuth();

    const [membership, setMembership] = useState<MembershipStatus | null>(null);
    const [credits, setCredits] = useState<Record<CreditType, CreditStatusResponse | null>>({
        oracle: null,
        compatibility: null,
        analysis: null,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);

    // 批量拉取所有状态
    const refreshStatus = useCallback(async () => {
        if (!isAuthenticated || !session?.access_token) {
            setMembership(null);
            setCredits({ oracle: null, compatibility: null, analysis: null });
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const token = session.access_token;

            // 并行请求：会员状态 + 3个功能的额度
            const [
                membershipRes,
                oracleRes,
                compRes,
                analysisRes
            ] = await Promise.all([
                getMembershipStatus(token).catch(e => { console.error("Membership fetch failed", e); return null; }),
                getCreditStatus("oracle", token).catch(e => { console.error("Oracle quota fetch failed", e); return null; }),
                getCreditStatus("compatibility", token).catch(e => { console.error("Compatibility quota fetch failed", e); return null; }),
                getCreditStatus("analysis", token).catch(e => { console.error("Analysis quota fetch failed", e); return null; }),
            ]);

            setMembership(membershipRes);
            setCredits({
                oracle: oracleRes,
                compatibility: compRes,
                analysis: analysisRes,
            });
            setLastFetchTime(Date.now());

        } catch (err: any) {
            console.error("Failed to refresh user status:", err);
            setError(err.message || "获取用户状态失败");
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, session?.access_token]);

    // 登录后自动拉取 (防抖: 1分钟内不重复自动拉取)
    useEffect(() => {
        if (isAuthenticated && session?.access_token) {
            const now = Date.now();
            if (now - lastFetchTime > 60000) {
                refreshStatus();
            }
        }
    }, [isAuthenticated, session?.access_token, refreshStatus, lastFetchTime]);

    // 手动更新某个额度 (用于消费后静默更新)
    const updateCredit = useCallback((type: CreditType, newStatus: CreditStatusResponse) => {
        setCredits(prev => ({
            ...prev,
            [type]: newStatus
        }));
    }, []);

    return (
        <UserStatusContext.Provider value={{
            membership,
            credits,
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
