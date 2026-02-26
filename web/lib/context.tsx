"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BirthData, ChartResponse, CycleResponse } from './api';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from './supabase';

// ============================================
// 多档案管理 Context
// ============================================

const STORAGE_KEY = 'fortune_teller_profile';
const ACTIVE_PROFILE_KEY = 'fortune_teller_active_profile';

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asString = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

// 单个档案数据
export interface AnalysisRecord {
    key: string;
    topic: string;
    content: string;
    createdAt?: string;
    customQuestion?: string | null;
}

export interface CompatibilityRecord {
    key: string;
    createdAt?: string;
    relationType: string;
    language?: "zh" | "en";
    userAData: BirthData;
    userBData: BirthData;
    baseScore: number;
    details: string[];
    userASummary: string;
    userBSummary: string;
    analysisMarkdown?: string | null;
    analysisFromLlm?: boolean;
    analysisError?: string | null;
}

export interface OracleRecord {
    createdAt?: string;
    question: string;
    language?: "zh" | "en";
    result: {
        original_hex: string;
        original_short: string;
        original_meaning: string;
        original_binary: string;
        future_hex?: string | null;
        future_short?: string | null;
        changing_lines: number[];
        details: string[];
    };
    userData?: BirthData | null;
}

const asAnalyses = (value: unknown): Record<string, AnalysisRecord | string> => {
    const source = asRecord(value);
    return Object.fromEntries(
        Object.entries(source).map(([key, raw]) => {
            if (typeof raw === "string") return [key, raw];
            const record = asRecord(raw);
            if (Object.keys(record).length === 0) return [key, ""];
            return [key, {
                key: asString(record.key, key),
                topic: asString(record.topic, key),
                content: asString(record.content, ""),
                createdAt: typeof record.created_at === "string"
                    ? record.created_at
                    : (typeof record.createdAt === "string" ? record.createdAt : undefined),
                customQuestion: typeof record.custom_question === "string"
                    ? record.custom_question
                    : (typeof record.customQuestion === "string" ? record.customQuestion : null),
            } as AnalysisRecord];
        })
    );
};

const asCompatibilityRecord = (raw: unknown, fallbackKey = ""): CompatibilityRecord => {
    const record = asRecord(raw);
    const details = Array.isArray(record.details) ? record.details.map((item) => String(item)) : [];
    return {
        key: asString(record.key, fallbackKey),
        createdAt: typeof record.created_at === "string"
            ? record.created_at
            : (typeof record.createdAt === "string" ? record.createdAt : undefined),
        relationType: asString(record.relation_type, asString(record.relationType, "")),
        language: record.language === "zh" || record.language === "en" ? record.language : undefined,
        userAData: asRecord(record.user_a_data ?? record.userAData) as unknown as BirthData,
        userBData: asRecord(record.user_b_data ?? record.userBData) as unknown as BirthData,
        baseScore: asNumber(record.base_score ?? record.baseScore, 0),
        details,
        userASummary: asString(record.user_a_summary, asString(record.userASummary, "")),
        userBSummary: asString(record.user_b_summary, asString(record.userBSummary, "")),
        analysisMarkdown: typeof record.analysis_markdown === "string"
            ? record.analysis_markdown
            : (typeof record.analysisMarkdown === "string" ? record.analysisMarkdown : null),
        analysisFromLlm: Boolean(record.analysis_from_llm ?? record.analysisFromLlm),
        analysisError: typeof record.analysis_error === "string"
            ? record.analysis_error
            : (typeof record.analysisError === "string" ? record.analysisError : null),
    };
};

const asCompatibilityCache = (value: unknown): Record<string, CompatibilityRecord> => {
    const source = asRecord(value);
    return Object.fromEntries(
        Object.entries(source).map(([key, raw]) => [key, asCompatibilityRecord(raw, key)])
    );
};

export interface UserProfile {
    id?: string;  // Supabase UUID
    profileName: string;
    birthData: BirthData | null;
    chartData: ChartResponse | null;
    cycleData: CycleResponse | null;
    analyses?: Record<string, AnalysisRecord | string>;
    analysisRecords?: AnalysisRecord[];
    compatibilityCache?: Record<string, CompatibilityRecord>;
    compatibilityRecords?: CompatibilityRecord[];
    oracleRecords?: OracleRecord[];
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
        } catch {
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
        } catch {
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

            const loadedProfiles: UserProfile[] = ((Array.isArray(data) ? data : []) as unknown[]).map((rowRaw) => {
                const row = asRecord(rowRaw);
                const sessionData = asRecord(row.session_data);
                const sessionBirthData = asRecord(sessionData.birthData);
                const rawAnalyses = asRecord(sessionData.analyses);
                const parsedAnalyses = asAnalyses(sessionData.analyses);
                const rawAnalysisRecords = Array.isArray(sessionData.analysis_records) ? sessionData.analysis_records : [];
                const analysisRecords: AnalysisRecord[] = rawAnalysisRecords.length > 0
                    ? rawAnalysisRecords.map((recordRaw) => {
                        const record = asRecord(recordRaw);
                        return {
                            key: asString(record.key, asString(record.topic, "analysis")),
                            topic: asString(record.topic, asString(record.key, "分析")),
                            content: asString(record.content, ""),
                            createdAt: typeof record.created_at === "string" ? record.created_at : undefined,
                            customQuestion: typeof record.custom_question === "string" ? record.custom_question : null,
                        };
                    })
                    : Object.entries(rawAnalyses).map(([key, value]) => {
                        const valueRecord = asRecord(value);
                        const hasObjectValue = Object.keys(valueRecord).length > 0;
                        return {
                            key,
                            topic: hasObjectValue ? asString(valueRecord.topic, key) : key,
                            content: hasObjectValue ? asString(valueRecord.content, "") : String(value ?? ""),
                            createdAt: hasObjectValue && typeof valueRecord.created_at === "string" ? valueRecord.created_at : undefined,
                            customQuestion: hasObjectValue && typeof valueRecord.custom_question === "string" ? valueRecord.custom_question : null,
                        };
                    });

                const compatibilityCache = asCompatibilityCache(sessionData.compatibility_cache);
                const compatibilityRecords: CompatibilityRecord[] = Object.values(compatibilityCache);

                const oracleRecords: OracleRecord[] = Array.isArray(sessionData.oracle_records)
                    ? sessionData.oracle_records.map((recordRaw) => {
                        const record = asRecord(recordRaw);
                        return {
                            createdAt: typeof record.created_at === "string" ? record.created_at : undefined,
                            question: asString(record.question, ""),
                            language: record.language === "zh" || record.language === "en" ? record.language : undefined,
                            result: asRecord(record.result) as unknown as OracleRecord["result"],
                            userData: asRecord(record.user_data) as unknown as BirthData,
                        };
                    })
                    : [];

                return {
                    id: typeof row.id === "string" ? row.id : undefined,
                    profileName: asString(row.profile_name, "档案"),
                    birthData: {
                        birth_year: asNumber(row.birth_year, 1990),
                        month: asNumber(row.birth_month, 1),
                        day: asNumber(row.birth_day, 1),
                        hour: row.birth_hour ? Number.parseInt(asString(row.birth_hour, "12"), 10) : 12,
                        minute: asNumber(sessionBirthData.minute, 0),
                        gender: row.gender === "female" ? "女" : "男",
                        is_lunar: Boolean(row.is_lunar) ? true : Boolean(sessionBirthData.is_lunar),
                        time_mode: sessionBirthData.time_mode === "shichen" ? "shichen" : "time",
                        shichen: typeof sessionBirthData.shichen === "string" ? (sessionBirthData.shichen as BirthData["shichen"]) : undefined,
                    } as BirthData,
                    chartData: (sessionData.chartData as ChartResponse | null) ?? null,
                    cycleData: (sessionData.cycleData as CycleResponse | null) ?? null,
                    analyses: parsedAnalyses,
                    analysisRecords,
                    compatibilityCache,
                    compatibilityRecords,
                    oracleRecords,
                    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
                    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
                };
            });

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
                    profileName: profile.profileName || '本地档案',
                    birthData: profile.birthData,
                    chartData: profile.chartData,
                    cycleData: profile.cycleData,
                    analyses: profile.analyses || {},
                    analysisRecords: profile.analysisRecords || [],
                    compatibilityCache: profile.compatibilityCache || {},
                    compatibilityRecords: profile.compatibilityRecords || [],
                    oracleRecords: profile.oracleRecords || [],
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
        const existingAnalyses = currentProfile?.analyses || {};
        const existingAnalysisRecords = currentProfile?.analysisRecords || [];
        const existingCompatibilityCache = currentProfile?.compatibilityCache || {};
        const existingCompatibilityRecords = currentProfile?.compatibilityRecords || [];
        const existingOracleRecords = currentProfile?.oracleRecords || [];

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
                        analyses: existingAnalyses,
                        analysis_records: existingAnalysisRecords,
                        compatibility_cache: existingCompatibilityCache,
                        oracle_records: existingOracleRecords,
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
            const profile = {
                birthData: effectiveBirthData,
                chartData: effectiveChartData,
                cycleData: effectiveCycleData,
                analyses: existingAnalyses,
                analysisRecords: existingAnalysisRecords,
                compatibilityCache: existingCompatibilityCache,
                compatibilityRecords: existingCompatibilityRecords,
                oracleRecords: existingOracleRecords,
                isSaved: true
            };
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
                        analyses: active.analyses || {},
                        analysisRecords: active.analysisRecords || [],
                        compatibilityCache: active.compatibilityCache || {},
                        compatibilityRecords: active.compatibilityRecords || [],
                        oracleRecords: active.oracleRecords || [],
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
