"use client";

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getCompatibility, BirthData, CompatibilityResponse, normalizeBirthDataForApi, getCreditStatus, consumeCredit } from '@/lib/api';
import { Users, Heart, Briefcase, UserPlus, Info } from 'lucide-react';
import { useUserProfile } from '@/lib/context';
import { LunarMonth } from 'lunar-javascript';
import { useAuth } from '@/lib/AuthContext';
import { useUserStatus } from '@/lib/UserStatusContext';

export default function CompatibilityPage() {
    const locale = useLocale() as 'en' | 'zh';
    const t = useTranslations('Compatibility');
    const { birthData: savedBirthData, activeProfileId, profiles } = useUserProfile();
    const { isAuthenticated, isLoading: authLoading, session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CompatibilityResponse | null>(null);
    const [relationType, setRelationType] = useState('恋人/伴侣');
    const [error, setError] = useState<string | null>(null);

    // Dynamic relation types based on locale
    const RELATION_TYPES = [
        { id: '恋人/伴侣', label: t('romantic'), icon: Heart },
        { id: '事业合伙人', label: t('business'), icon: Briefcase },
        { id: '知己好友', label: t('friendship'), icon: UserPlus },
    ];
    const { credits, updateCredit } = useUserStatus();
    // Use credit info from context
    const creditInfo = credits.compatibility ? {
        remaining: credits.compatibility.remaining,
        cycle_limit: credits.compatibility.cycle_limit,
        cycle_used: credits.compatibility.cycle_used
    } : null;

    // 默认初始数据
    const initialBirthData: BirthData = {
        birth_year: 1990,
        month: 1,
        day: 15,
        hour: 8,
        minute: 0,
        gender: '男'
    };

    const [personA, setPersonA] = useState<BirthData>(savedBirthData || initialBirthData);
    const [personB, setPersonB] = useState<BirthData>({ ...initialBirthData, gender: '女' });
    const lunarErrorA = getLunarError(personA);
    const lunarErrorB = getLunarError(personB);
    const hasLunarError = !!(lunarErrorA || lunarErrorB);

    useEffect(() => {
        const activeProfile = profiles.find((p) => p.id === activeProfileId);
        if (activeProfile?.birthData) {
            setPersonA({ ...activeProfile.birthData });
            return;
        }
        if (savedBirthData) {
            setPersonA({ ...savedBirthData });
        } else {
            setPersonA({ ...initialBirthData });
        }
    }, [activeProfileId, profiles, savedBirthData]);

    const handleCompatibility = async () => {
        if (!authLoading && !isAuthenticated) {
            setError("请先登录后使用合盘功能");
            return;
        }
        if (!session?.access_token) {
            setError("登录状态异常，请刷新后重试");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const credit = await consumeCredit("compatibility", session?.access_token);
            if (!credit) {
                setError("合盘次数已用完，请充值或开通 VIP");
                setLoading(false);
                return;
            }
            updateCredit("compatibility", credit);

            const res = await getCompatibility({
                user_a_data: normalizeBirthDataForApi(personA),
                user_b_data: normalizeBirthDataForApi(personB),
                relation_type: relationType,
                language: locale,
            }, session.access_token);

            setResult(res);
        } catch (err: any) {
            setError(err.message || "合盘分析失败");
        } finally {
            setLoading(false);
        }
    };



    return (
        <main className="min-h-screen">
            <Header />
            <div className="page-shell">
                <div className="w-full space-y-12">
                    <section className="text-center space-y-4 animate-fade-in">
                        <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
                            {t('title')}
                        </h2>
                        <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm">
                            {t('subtitle')}
                        </p>
                    </section>

                    {/* Input Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 bg-[#F8F8F0] border border-[#1A1A1A]/10 rounded-full text-[#B8860B]">
                            <Users className="w-5 h-5" />
                        </div>

                        {/* Person A */}
                        <div className="zen-card p-6 space-y-6">
                            <h3 className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase text-center">{t('yourProfile')} (User A)</h3>
                            <BirthFormBrief data={personA} setData={setPersonA} lunarError={lunarErrorA} t={t} />
                        </div>

                        {/* Person B */}
                        <div className="zen-card p-6 space-y-6">
                            <h3 className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase text-center">{t('partnerProfile')} (User B)</h3>
                            <BirthFormBrief data={personB} setData={setPersonB} lunarError={lunarErrorB} t={t} />
                        </div>
                    </div>

                    {/* Relation Type Selector */}
                    <div className="flex justify-center gap-4">
                        {RELATION_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setRelationType(type.id)}
                                className={`
                flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300
                ${relationType === type.id
                                        ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                                        : 'bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:border-[#1A1A1A]/30'}
              `}
                            >
                                <type.icon className="w-4 h-4" />
                                <span className="text-sm tracking-widest">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleCompatibility}
                            disabled={loading || hasLunarError}
                            className="zen-button px-12"
                        >
                            {loading ? t('analyzing') : t('analyze')}
                        </button>
                    </div>

                    {!authLoading && !isAuthenticated && (
                        <div className="text-center text-xs text-[#1A1A1A]/50 tracking-widest">
                            {t('loginRequired')}
                        </div>
                    )}

                    {/* Buttons removed as requested. Recharging is triggered by insufficient credits error. */}
                    {isAuthenticated && creditInfo && (
                        <div className="text-center text-xs text-[#1A1A1A]/50 tracking-widest">
                            {t('giftQuota')}: <span className="text-[#B8860B] font-medium">{(creditInfo.cycle_limit ?? 3) - (creditInfo.cycle_used ?? 0)}/{creditInfo.cycle_limit ?? 3}</span>
                        </div>
                    )}

                    {/* Result Section */}
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <LoadingSpinner text={t('analyzing')} />
                        </div>
                    ) : result ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="zen-card p-12 text-center space-y-8">
                                <div className="relative inline-block">
                                    <div className="w-32 h-32 rounded-full border-2 border-[#B8860B]/20 flex items-center justify-center">
                                        <span className="text-4xl font-light text-[#1A1A1A] tracking-tighter">
                                            {result.base_score}
                                        </span>
                                        <span className="text-xs ml-1 text-[#1A1A1A]/40">分</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-light tracking-[0.3em]">契合总评</h3>
                                    <p className="text-[#1A1A1A]/60 text-sm tracking-widest italic">
                                        两人缘分天定，相处需修。
                                    </p>
                                </div>

                                <div className="zen-divider" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                            <Info className="w-3 h-3" /> 甲方分析
                                        </h4>
                                        <p className="text-sm font-light leading-relaxed">{result.user_a_summary}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                            <Info className="w-3 h-3" /> 乙方分析
                                        </h4>
                                        <p className="text-sm font-light leading-relaxed">{result.user_b_summary}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {result.details.map((detail, idx) => (
                                    <div key={idx} className="zen-card p-6 flex items-start gap-4">
                                        <div className="mt-1">
                                            <div className="w-2 h-2 rounded-full bg-[#B8860B]" />
                                        </div>
                                        <p className="text-sm font-light text-[#1A1A1A]/90 leading-relaxed tracking-wide">
                                            {detail.replace(/\*\*(.*?)\*\*/g, '$1')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800/70 text-sm tracking-widest text-center">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

function getLunarError(data: BirthData): string | null {
    if (!data.is_lunar) return null;
    const lunarMonth = LunarMonth.fromYm(data.birth_year, data.month);
    if (!lunarMonth) return "农历月份无效，请检查年份与月份";
    const dayCount = lunarMonth.getDayCount();
    if (data.day < 1 || data.day > dayCount) return `农历日期无效：该月只有 ${dayCount} 天`;
    return null;
}

function BirthFormBrief({
    data,
    setData,
    lunarError,
    t,
}: {
    data: BirthData;
    setData: (d: BirthData) => void;
    lunarError?: string | null;
    t: (key: string) => string;
}) {
    const [isInternational, setIsInternational] = useState(false);
    const update = (key: keyof BirthData, val: any) => setData({ ...data, [key]: val });

    // City groups (same as BirthDataForm)
    const CITY_GROUPS: Record<string, Record<string, number>> = {
        "北京时间 (UTC+8)": {
            北京: 116.4, 上海: 121.5, 广州: 113.3, 深圳: 114.1, 杭州: 120.2,
            南京: 118.8, 武汉: 114.3, 天津: 117.2, 苏州: 120.6, 长沙: 112.9,
        },
        "西部地区 (偏晚)": {
            成都: 104.1, 重庆: 106.5, 西安: 109.0, 昆明: 102.7, 兰州: 103.7,
            乌鲁木齐: 87.6, 拉萨: 91.1
        },
        "东部/东北 (偏早)": {
            哈尔滨: 126.6, 沈阳: 123.4, 长春: 125.3, 大连: 121.6, 青岛: 120.4,
            福州: 119.3, 厦门: 118.1, 台北: 121.5
        },
    };

    const INTERNATIONAL_CITY_GROUPS: Record<string, Record<string, number>> = {
        "UTC-8 ~ UTC-5 (Americas)": {
            "Los Angeles": -118.2, "San Francisco": -122.4, "Vancouver": -123.1,
            "Denver": -104.9, "Chicago": -87.6, "Houston": -95.4,
            "New York": -74.0, "Toronto": -79.4, "Miami": -80.2,
        },
        "UTC-4 ~ UTC-3 (South America)": {
            "São Paulo": -46.6, "Buenos Aires": -58.4, "Lima": -77.0,
        },
        "UTC-6 (Central America/Mexico)": {
            "Mexico City": -99.1, "Guatemala City": -90.5, "Panama City": -79.5,
        },
        "UTC+0 ~ UTC+1 (Europe West)": {
            "London": -0.1, "Dublin": -6.3, "Lisbon": -9.1,
            "Paris": 2.3, "Berlin": 13.4, "Amsterdam": 4.9,
        },
        "UTC+2 ~ UTC+4 (Europe East/Middle East)": {
            "Istanbul": 29.0, "Cairo": 31.2, "Moscow": 37.6,
            "Dubai": 55.3, "Tel Aviv": 34.8, "Athens": 23.7,
        },
        "UTC+5 ~ UTC+6 (South Asia)": {
            "Mumbai": 72.9, "New Delhi": 77.2, "Bangalore": 77.6,
            "Dhaka": 90.4, "Kolkata": 88.4,
        },
        "UTC+7 ~ UTC+8 (Southeast Asia)": {
            "Bangkok": 100.5, "Ho Chi Minh": 106.7, "Jakarta": 106.8,
            "Singapore": 103.8, "Kuala Lumpur": 101.7, "Manila": 121.0,
        },
        "UTC+9 ~ UTC+12 (East Asia/Pacific)": {
            "Tokyo": 139.7, "Seoul": 127.0, "Osaka": 135.5,
            "Sydney": 151.2, "Melbourne": 144.9, "Auckland": 174.8,
        },
    };

    const cityGroups = isInternational ? INTERNATIONAL_CITY_GROUPS : CITY_GROUPS;
    const defaultCity = isInternational ? "New York" : "北京";

    // Get current city name from longitude or use default
    const getCurrentCity = () => {
        const allCities = Object.values(cityGroups).reduce((acc, group) => ({ ...acc, ...group }), {});
        for (const [name, lng] of Object.entries(allCities)) {
            if (data.longitude === lng) return name;
        }
        return defaultCity;
    };

    const [city, setCity] = useState(getCurrentCity());

    const handleCityChange = (newCity: string) => {
        setCity(newCity);
        const allCities = Object.values(cityGroups).reduce((acc, group) => ({ ...acc, ...group }), {});
        const lng = allCities[newCity] ?? 120.0;
        update('longitude', lng);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthYear')}</label>
                    <select value={data.birth_year} onChange={e => update('birth_year', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 80 }, (_, i) => 2024 - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthMonth')}</label>
                    <select value={data.month} onChange={e => update('month', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex items-center justify-center">
                <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!data.is_lunar}
                        onChange={(e) => update('is_lunar', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                    />
                    {t('lunar')}
                </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthDay')}</label>
                    <select value={data.day} onChange={e => update('day', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: data.is_lunar ? 30 : 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthHour')}</label>
                    <select value={data.hour} onChange={e => update('hour', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthMinute')}</label>
                    <select value={data.minute ?? 0} onChange={e => update('minute', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                    </select>
                </div>
            </div>
            {data.is_lunar && (
                <p className={`text-[10px] text-center ${lunarError ? "text-red-800/70" : "text-[#999999]"}`}>
                    {lunarError || t('lunarHint')}
                </p>
            )}
            {/* City Selector */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('birthCity')}</label>
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isInternational}
                            onChange={(e) => {
                                setIsInternational(e.target.checked);
                                const newDefault = e.target.checked ? "New York" : "北京";
                                setCity(newDefault);
                                const newGroups = e.target.checked ? INTERNATIONAL_CITY_GROUPS : CITY_GROUPS;
                                const allCities = Object.values(newGroups).reduce((acc, group) => ({ ...acc, ...group }), {});
                                update('longitude', allCities[newDefault] ?? 120.0);
                            }}
                            className="w-3 h-3 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                        />
                        {t('international')}
                    </label>
                </div>
                <select
                    value={city}
                    onChange={e => handleCityChange(e.target.value)}
                    className="zen-select py-1.5 text-xs"
                >
                    {Object.entries(cityGroups).map(([groupName, cities]) => (
                        <optgroup key={groupName} label={groupName}>
                            {Object.keys(cities).map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            <div className="space-y-1 text-center">
                <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block mb-2">{t('gender')}</label>
                <div className="flex justify-center gap-4">
                    {[{ val: '男', label: t('male') }, { val: '女', label: t('female') }].map(g => (
                        <button
                            key={g.val}
                            type="button"
                            onClick={() => update('gender', g.val)}
                            className={`px-4 py-1.5 rounded-full text-xs transition-colors ${data.gender === g.val ? 'bg-[#1A1A1A] text-white' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60'}`}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
