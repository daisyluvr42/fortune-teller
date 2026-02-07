"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Heart, Info } from "lucide-react";
import { BirthData } from "@/lib/api";
import { useTranslations } from 'next-intl';
import { LunarMonth } from "lunar-javascript";

// Loading Component
function LoadingSpinner() {
    return (
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-[#B8860B]/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

export default function CompatibilityPage() {
    const t = useTranslations('Compatibility');
    const commonT = useTranslations('Common');
    const [userA, setUserA] = useState<BirthData>({ birth_year: 1990, month: 1, day: 1, hour: 0, minute: 0, gender: '男', longitude: 120.0, is_lunar: false, time_mode: 'time' });
    const [userB, setUserB] = useState<BirthData>({ birth_year: 1992, month: 1, day: 1, hour: 0, minute: 0, gender: '女', longitude: 120.0, is_lunar: false, time_mode: 'time' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const checkLunar = (data: BirthData) => {
        if (!data.is_lunar) return null;
        const lunarMonth = LunarMonth.fromYm(data.birth_year, data.month);
        if (!lunarMonth) return commonT('error'); // Simplified error check
        const dayCount = lunarMonth.getDayCount();
        if (data.day > dayCount) return "Invalid Date";
        return null;
    };

    const handleCompare = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/compatibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_a: userA,
                    user_b: userB
                }),
            });
            if (!res.ok) throw new Error(commonT('error'));
            const data = await res.json();
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : commonT('error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8F8F0]">
            <Header />
            <div className="page-shell">
                <div className="max-w-5xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="text-center space-y-4 animate-fade-in">
                        <Heart className="w-8 h-8 mx-auto text-[#B8860B]" fill="currentColor" fillOpacity={0.2} />
                        <h1 className="text-3xl font-light tracking-[0.5em] text-[#1A1A1A]">
                            {t('title')}
                        </h1>
                        <p className="text-[#1A1A1A]/40 tracking-widest text-sm">
                            {t('subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-12 h-12 rounded-full bg-[#F8F8F0] border border-[#1A1A1A]/10 flex items-center justify-center">
                                <span className="text-[#B8860B] font-serif italic text-xl">&</span>
                            </div>
                        </div>

                        {/* User A Form */}
                        <div className="zen-card p-6 md:p-8 space-y-6">
                            <div className="text-center pb-4 border-b border-[#1A1A1A]/5">
                                <h3 className="text-lg font-medium tracking-widest">{t('yourProfile')}</h3>
                            </div>
                            <BirthFormBrief data={userA} setData={setUserA} lunarError={checkLunar(userA)} />
                        </div>

                        {/* User B Form */}
                        <div className="zen-card p-6 md:p-8 space-y-6">
                            <div className="text-center pb-4 border-b border-[#1A1A1A]/5">
                                <h3 className="text-lg font-medium tracking-widest">{t('partnerProfile')}</h3>
                            </div>
                            <BirthFormBrief data={userB} setData={setUserB} lunarError={checkLunar(userB)} />
                        </div>
                    </div>

                    <div className="text-center pt-8">
                        <button
                            onClick={handleCompare}
                            disabled={loading || !!checkLunar(userA) || !!checkLunar(userB)}
                            className="zen-button px-12"
                        >
                            {loading ? t('analyze') : t('analyze')}
                        </button>
                    </div>

                    {/* Result */}
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <LoadingSpinner />
                        </div>
                    ) : result ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="zen-card p-12 text-center space-y-8">
                                <div className="relative inline-block">
                                    <div className="w-32 h-32 rounded-full border-2 border-[#B8860B]/20 flex items-center justify-center">
                                        <span className="text-4xl font-light text-[#1A1A1A] tracking-tighter">
                                            {result.base_score}
                                        </span>
                                        <span className="text-xs ml-1 text-[#1A1A1A]/40"></span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-light tracking-[0.3em]">{t('score')}</h3>
                                    <p className="text-[#1A1A1A]/60 text-sm tracking-widest italic">

                                    </p>
                                </div>

                                <div className="zen-divider" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                            <Info className="w-3 h-3" /> {t('userA')}
                                        </h4>
                                        <p className="text-sm font-light leading-relaxed">{result.user_a_summary}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                            <Info className="w-3 h-3" /> {t('userB')}
                                        </h4>
                                        <p className="text-sm font-light leading-relaxed">{result.user_b_summary}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {result.details && result.details.map((detail: string, idx: number) => (
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

function BirthFormBrief({
    data,
    setData,
    lunarError,
}: {
    data: BirthData;
    setData: (d: BirthData) => void;
    lunarError?: string | null;
}) {
    const commonT = useTranslations('Common');
    const t = useTranslations('BirthDataForm');
    const update = (key: keyof BirthData, val: any) => setData({ ...data, [key]: val });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('dateLabel')}</label>
                    <select value={data.birth_year} onChange={e => update('birth_year', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 80 }, (_, i) => 2024 - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{commonT('month')}</label>
                    <select value={data.month} onChange={e => update('month', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{commonT('month')}</option>)}
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
                    {t('lunarLabel')}
                </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{commonT('day')}</label>
                    <select value={data.day} onChange={e => update('day', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: data.is_lunar ? 30 : 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{commonT('day')}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">{t('timeLabel')}</label>
                    <select value={data.hour} onChange={e => update('hour', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h}{commonT('hour')}</option>)}
                    </select>
                </div>
            </div>
            {data.is_lunar && (
                <p className={`text-[10px] text-center ${lunarError ? "text-red-800/70" : "text-[#999999]"}`}>
                    {lunarError || t('lunarHint')}
                </p>
            )}
            <div className="space-y-1 text-center">
                <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block mb-2">{t('genderLabel')}</label>
                <div className="flex justify-center gap-4">
                    {['男', '女'].map(g => (
                        <button
                            key={g}
                            onClick={() => update('gender', g)}
                            className={`px-4 py-1.5 rounded-full text-xs transition-colors ${data.gender === g ? 'bg-[#1A1A1A] text-white' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60'}`}
                        >
                            {g === '男' ? commonT('male') : commonT('female')}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
