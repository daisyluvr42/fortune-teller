"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BirthData, ChartResponse, CycleResponse } from './api';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from './supabase';

// ============================================
// 多档案管理 Context
// ============================================

const STORAGE_KEY = 'fortune_teller_profile';
const PROFILES_KEY = 'fortune_teller_profiles';
const ACTIVE_PROFILE_KEY = 'fortune_teller_active_profile';

// 单个档案数据
export interface UserProfile {
    id?: string;  // Supabase UUID
    profileName: string;
    birthData: BirthData | null;
    chartData: ChartResponse | null;
    cycleData: CycleResponse | null;
    createdAt?: string;
    updatedAt?: string;
}

// Context 类型
interface UserProfileContextType {
    // 当前档案
    currentProfile: UserProfile | null;
    birthData: BirthData | null;
    chartData: ChartResponse | null;
    cycleData: CycleResponse | null;
    isSaved: boolean;
    hasProfile: boolean;

    // 多档案管理
    profiles: UserProfile[];
    activeProfileId: string | null;

    // 操作方法
    setBirthData: (data: BirthData) => void;
    setChartData: (data: ChartResponse) => void;
    setCycleData: (data: CycleResponse) => void;
    saveProfile: (profileName?: string, overrides?: {
        birthData?: BirthData;
        chartData?: ChartResponse | null;
        cycleData?: CycleResponse | null;
    }) => Promise<boolean>;
    renameProfile: (profileId: string, profileName: string) => Promise<boolean>;
    loadProfile: (profileId: string) => void;
    deleteProfile: (profileId: string) => Promise<boolean>;
    clearProfile: () => void;
    createNewProfile: () => void;

    // 状态
    isLoadingProfiles: boolean;
    refreshProfiles: () => Promise<void>;
}

const defaultContext: UserProfileContextType = {
    currentProfile: null,
    birthData: null,
    chartData: null,
    cycleData: null,
    isSaved: false,
    hasProfile: false,
    profiles: [],
    activeProfileId: null,
    setBirthData: () => { },
    setChartData: () => { },
    setCycleData: () => { },
    saveProfile: async () => false,
    renameProfile: async () => false,
    loadProfile: () => { },
    deleteProfile: async () => false,
    clearProfile: () => { },
    createNewProfile: () => { },
    isLoadingProfiles: false,
    refreshProfiles: async () => { },
};

const UserProfileContext = createContext<UserProfileContextType>(defaultContext);

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [birthData, setBirthDataState] = useState<BirthData | null>(null);
    const [chartData, setChartDataState] = useState<ChartResponse | null>(null);
    const [cycleData, setCycleDataState] = useState<CycleResponse | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

    // 获取当前档案
    const currentProfile = profiles.find(p => p.id === activeProfileId) || null;

    const getActiveProfileStorageKey = (userId?: string | null) =>
        userId ? `${ACTIVE_PROFILE_KEY}:${userId}` : ACTIVE_PROFILE_KEY;

    const readStoredActiveProfileId = (userId?: string | null) => {
        try {
            return localStorage.getItem(getActiveProfileStorageKey(userId));
        } catch (e) {
            return null;
        }
    };

    const writeStoredActiveProfileId = (userId: string | null, profileId: string | null) => {
        try {
            const key = getActiveProfileStorageKey(userId);
            if (!profileId) {
                localStorage.removeItem(key);
                return;
            }
            localStorage.setItem(key, profileId);
        } catch (e) {
            // ignore storage errors
        }
    };

    // 从 Supabase 加载用户档案
    const loadProfilesFromSupabase = async () => {
        if (!user) return;

        const supabase = getSupabaseClient();
        if (!supabase) return;

        setIsLoadingProfiles(true);
        try {
            const { data, error } = await supabase
                .from('bazi_profiles')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loadedProfiles: UserProfile[] = (data || []).map((row: any) => ({
                id: row.id,
                profileName: row.profile_name,
                birthData: {
                    birth_year: row.birth_year,
                    month: row.birth_month,
                    day: row.birth_day,
                    hour: row.birth_hour ? parseInt(row.birth_hour) : 12,
                    minute: row.session_data?.birthData?.minute ?? 0,
                    gender: row.gender === 'female' ? '女' : '男',
                    is_lunar: row.is_lunar ? true : (row.session_data?.birthData?.is_lunar ?? false),
                    time_mode: row.session_data?.birthData?.time_mode ?? "time",
                    shichen: row.session_data?.birthData?.shichen ?? undefined,
                } as BirthData,
                chartData: row.session_data?.chartData || null,
                cycleData: row.session_data?.cycleData || null,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            if (loadedProfiles.length > 0) {
                setProfiles(loadedProfiles);
                const storedId = readStoredActiveProfileId(user.id);
                const preferredId = storedId || activeProfileId;
                const exists = preferredId && loadedProfiles.some(p => p.id === preferredId);
                const nextProfile = exists
                    ? loadedProfiles.find(p => p.id === preferredId) || loadedProfiles[0]
                    : loadedProfiles[0];
                setActiveProfileId(nextProfile.id || null);
                setBirthDataState(nextProfile.birthData || null);
                setChartDataState(nextProfile.chartData || null);
                setCycleDataState(nextProfile.cycleData || null);
                setIsSaved(!!nextProfile.birthData);
                writeStoredActiveProfileId(user.id, nextProfile.id || null);
            } else {
                // Cloud profile empty: Try to inherit from local storage (Guest -> User migration)
                console.log("Cloud profile empty, checking local storage for migration...");
                loadFromLocalStorage();
            }

        } catch (e) {
            console.error('Failed to load profiles from Supabase:', e);
        } finally {
            setIsLoadingProfiles(false);
        }
    };

    // 从 localStorage 恢复（未登录用户）
    const loadFromLocalStorage = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const profile = JSON.parse(stored);
                if (profile.birthData) setBirthDataState(profile.birthData);
                if (profile.chartData) setChartDataState(profile.chartData);
                if (profile.cycleData) setCycleDataState(profile.cycleData);
                setIsSaved(profile.isSaved || false);

                // 作为本地档案添加
                setProfiles([{
                    id: 'local',
                    profileName: '本地档案',
                    birthData: profile.birthData,
                    chartData: profile.chartData,
                    cycleData: profile.cycleData,
                }]);
                setActiveProfileId('local');
                writeStoredActiveProfileId(null, 'local');
            }
        } catch (e) {
            console.warn('Failed to restore profile from localStorage:', e);
        }
    };

    // 初始化
    useEffect(() => {
        if (isAuthLoading) return;
        if (isAuthenticated && user) {
            loadProfilesFromSupabase();
        } else {
            loadFromLocalStorage();
        }
        setIsInitialized(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, isAuthLoading]);

    // 保存档案
    const saveProfile = async (
        profileName: string = '我的档案',
        overrides?: {
            birthData?: BirthData;
            chartData?: ChartResponse | null;
            cycleData?: CycleResponse | null;
        }
    ): Promise<boolean> => {
        const effectiveBirthData = overrides?.birthData ?? birthData;
        const effectiveChartData = overrides?.chartData ?? chartData;
        const effectiveCycleData = overrides?.cycleData ?? cycleData;
        if (!effectiveBirthData) return false;

        // 已登录 -> 保存到 Supabase
        if (isAuthenticated && user) {
            const supabase = getSupabaseClient();
            if (!supabase) return false;

            try {
                const profileData = {
                    user_id: user.id,
                    profile_name: profileName,
                    gender: effectiveBirthData.gender === '女' ? 'female' : 'male',
                    birth_year: effectiveBirthData.birth_year,
                    birth_month: effectiveBirthData.month,
                    birth_day: effectiveBirthData.day,
                    birth_hour: effectiveBirthData.hour?.toString(),
                    city: null,
                    is_lunar: effectiveBirthData.is_lunar ? 1 : 0,
                    session_data: {
                        chartData: effectiveChartData,
                        cycleData: effectiveCycleData,
                        birthData: {
                            minute: effectiveBirthData.minute,
                            time_mode: effectiveBirthData.time_mode ?? "time",
                            shichen: effectiveBirthData.shichen ?? null,
                            is_lunar: effectiveBirthData.is_lunar ?? false,
                        }
                    },
                };

                const { data, error } = await supabase
                    .from('bazi_profiles')
                    .upsert(profileData, { onConflict: 'user_id,profile_name' })
                    .select()
                    .single();

                if (error) throw error;

                // 刷新档案列表
                await loadProfilesFromSupabase();
                setActiveProfileId(data.id);
                setIsSaved(true);
                return true;
            } catch (e) {
                console.error('Failed to save profile:', e);
                return false;
            }
        }

        // 未登录 -> 保存到 localStorage
        try {
            const profile = { birthData: effectiveBirthData, chartData: effectiveChartData, cycleData: effectiveCycleData, isSaved: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            setIsSaved(true);
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    };

    const renameProfile = async (profileId: string, profileName: string): Promise<boolean> => {
        const nextName = profileName.trim();
        if (!nextName) return false;

        if (!isAuthenticated || !user) {
            try {
                const updated = profiles.map((p) =>
                    p.id === profileId ? { ...p, profileName: nextName } : p
                );
                setProfiles(updated);
                const active = updated.find((p) => p.id === profileId);
                if (active && active.id === 'local') {
                    const profile = {
                        birthData,
                        chartData,
                        cycleData,
                        isSaved,
                        profileName: nextName,
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
                }
                return true;
            } catch (e) {
                console.error('Failed to rename local profile:', e);
                return false;
            }
        }

        const supabase = getSupabaseClient();
        if (!supabase) return false;

        try {
            const { error } = await supabase
                .from('bazi_profiles')
                .update({ profile_name: nextName })
                .eq('id', profileId);

            if (error) throw error;
            await loadProfilesFromSupabase();
            return true;
        } catch (e) {
            console.error('Failed to rename profile:', e);
            return false;
        }
    };

    // 加载指定档案
    const loadProfile = (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            setActiveProfileId(profileId);
            if (profile.birthData) setBirthDataState(profile.birthData);
            if (profile.chartData) setChartDataState(profile.chartData);
            if (profile.cycleData) setCycleDataState(profile.cycleData);
            setIsSaved(true);
            writeStoredActiveProfileId(isAuthenticated ? user?.id || null : null, profileId);
        }
    };

    // 删除档案
    const deleteProfile = async (profileId: string): Promise<boolean> => {
        if (!isAuthenticated || !user) {
            // 本地删除
            localStorage.removeItem(STORAGE_KEY);
            setProfiles([]);
            setActiveProfileId(null);
            clearProfile();
            return true;
        }

        const supabase = getSupabaseClient();
        if (!supabase) return false;

        try {
            const { error } = await supabase
                .from('bazi_profiles')
                .delete()
                .eq('id', profileId);

            if (error) throw error;

            // 刷新列表
            await loadProfilesFromSupabase();

            // 如果删除的是当前档案，清空状态
            if (profileId === activeProfileId) {
                clearProfile();
            }
            return true;
        } catch (e) {
            console.error('Failed to delete profile:', e);
            return false;
        }
    };

    // 清除当前状态
    const clearProfile = () => {
        setBirthDataState(null);
        setChartDataState(null);
        setCycleDataState(null);
        setActiveProfileId(null);
        setIsSaved(false);
        writeStoredActiveProfileId(isAuthenticated ? user?.id || null : null, null);
    };

    // 创建新档案
    const createNewProfile = () => {
        clearProfile();
    };

    const setBirthData = (data: BirthData) => {
        setBirthDataState(data);
        setIsSaved(false);
    };
    const setChartData = (data: ChartResponse) => {
        setChartDataState(data);
        setIsSaved(false);
    };
    const setCycleData = (data: CycleResponse) => {
        setCycleDataState(data);
        setIsSaved(false);
    };

    const hasProfile = birthData !== null && chartData !== null;

    // 防止 SSR 闪烁
    if (!isInitialized) {
        return null;
    }

    return (
        <UserProfileContext.Provider value={{
            currentProfile,
            birthData,
            chartData,
            cycleData,
            isSaved,
            hasProfile,
            profiles,
            activeProfileId,
            setBirthData,
            setChartData,
            setCycleData,
            saveProfile,
            renameProfile,
            loadProfile,
            deleteProfile,
            clearProfile,
            createNewProfile,
            isLoadingProfiles,
            refreshProfiles: loadProfilesFromSupabase,
        }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
}
